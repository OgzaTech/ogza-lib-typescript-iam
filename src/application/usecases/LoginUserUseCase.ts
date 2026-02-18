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
    const passwordValid = await this.hashingService.compare(
      request.password,
      user.props.password.props.value
    );

    if (!passwordValid.getValue()) {
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
    const activeMember = memberships.length > 0 ? memberships[0] : null;

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