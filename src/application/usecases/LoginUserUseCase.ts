import { IUseCase, Result, Email, AppError, IHashingService, ITokenService, ILogger, StructuredError } from "@ogza/core";
import { IUserRepository } from "../../domain/repo/IUserRepository";
import { LoginUserDTO, LoginResponseDTO } from "../dtos/index";
import { IMembershipRepository } from "../../domain/repo";

export class LoginUserUseCase implements IUseCase<LoginUserDTO, Result<LoginResponseDTO, StructuredError>> {

  constructor(
    private userRepo: IUserRepository,
    private hashingService: IHashingService,
    private tokenService: ITokenService,
    private memberRepo: IMembershipRepository,
    private logger: ILogger
  ) {}

  public async execute(request: LoginUserDTO): Promise<Result<LoginResponseDTO, StructuredError>> {

    // 1. Email validasyonu
    const emailOrError = Email.create(request.email);
    if (emailOrError.isFailure) {
      return AppError.ValidationFailure.create("Invalid email format");
    }

    // 2. Kullanıcıyı bul
    const userResult = await this.userRepo.findByEmail(emailOrError.getValue());
    if (userResult.isFailure) {
      return AppError.ValidationFailure.create("Invalid email or password");
    }
    const user = userResult.getValue();

    // 3. Şifreyi doğrula
    // Payload pbkdf2 kullandığı için salt ayrı geliyor.
    // UserPassword içinde salt saklanmıyor — repository'den salt'ı props üzerinden alıyoruz.
    const storedHash = user.props.password.props.value;
    const storedSalt = user.props.password.getSalt();

    let isPasswordValid = false;

    if (storedSalt && (this.hashingService as any).compareWithSalt) {
      // Payload pbkdf2 yolu — PayloadHashingService.compareWithSalt()
      const compareResult = await (this.hashingService as any).compareWithSalt(
        request.password,
        storedHash,
        storedSalt
      );
      if (compareResult.isFailure) {
        this.logger.warn("Password compare failed", { email: request.email });
        return AppError.ValidationFailure.create("Invalid email or password");
      }
      isPasswordValid = compareResult.getValue();
    } else if (user.props.password.isHashed()) {
      // Standart bcrypt yolu
      const compareResult = await this.hashingService.compare(request.password, storedHash);
      if (compareResult.isFailure) {
        this.logger.warn("Password compare failed", { email: request.email });
        return AppError.ValidationFailure.create("Invalid email or password");
      }
      isPasswordValid = compareResult.getValue();
    } else {
      // Plain text fallback (migration gerekli)
      this.logger.warn("Plain text password detected, migration required", { email: request.email });
      isPasswordValid = storedHash === request.password;
    }

    if (!isPasswordValid) {
      user.failedLogin(request.ipAddress, request.userAgent, "Invalid email or password");
      await this.userRepo.save(user);
      this.logger.warn("Login failed: invalid password", { email: request.email });
      return AppError.ValidationFailure.create("Invalid email or password");
    }

    // 4. Login event fırlat
    user.login(request.ipAddress, request.userAgent, !!request.invalidateAllSessions);

    // 5. Tenant listesini çek
    const membershipsResult = await this.memberRepo.getUserMemberships(user.id.getValue().toString());
    const memberships = membershipsResult.isSuccess ? membershipsResult.getValue() : [];
    // Owner olduğu tenant öncelikli — kendi workspace'i
    const activeMember = memberships.find(m => m.roleName === 'Owner') ?? memberships[0] ?? null;

    // 6. Token üret
    const tokenPayload = {
      id: user.id.toString(),
      email: user.props.email.props.value,
      tenantId: activeMember ? activeMember.tenantId : undefined,
      role: activeMember ? activeMember.roleName : undefined
    };

    const tokenResult = await this.tokenService.sign(tokenPayload);
    if (tokenResult.isFailure) {
      return AppError.UnexpectedError.create(tokenResult.error);
    }

    this.logger.info("Login successful", { userId: user.id.toString() });

    return Result.ok<LoginResponseDTO>({
      accessToken: tokenResult.getValue(),
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email.getValue()
      },
      availableTenants: memberships.map(m => ({
        id: m.tenantId,
        name: m.tenantName,
        role: m.roleName
      })),
      currentTenant: activeMember
        ? { id: activeMember.tenantId, name: activeMember.tenantName, role: activeMember.roleName }
        : { id: '0', name: 'No Tenant', role: 'None' }
    });
  }
}