import { IUseCase, Result, Email, AppError, IHashingService, ITokenService, LocalizationService } from "@ogza/core";
import { IUserRepository } from "../../domain/repo/IUserRepository";
import { LoginUserDTO, LoginResponseDTO } from "../dtos/index";
import { IMembershipRepository } from "../../domain/repo";

export class LoginUserUseCase implements IUseCase<LoginUserDTO, Result<LoginResponseDTO>> {
  
  constructor(
    private userRepo: IUserRepository,
    private hashingService: IHashingService,
    private tokenService: ITokenService,
    private memberRepo: IMembershipRepository
  ) {}

  public async execute(request: LoginUserDTO): Promise<Result<LoginResponseDTO>> {
    // 1. Email Validasyonu
    const emailOrError = Email.create(request.email);
    if (emailOrError.isFailure) return Result.fail("Invalid email format");

    // 2. Kullanıcıyı Doğrulama
    const userResult = await this.userRepo.findByEmail(emailOrError.getValue());
    if (userResult.isFailure) {
      return Result.fail("Invalid email or password");
    }
    const user = userResult.getValue();

    // 3. Şifreyi Doğrula
    const passwordValid = await this.hashingService.compare(request.password, user.props.password.props.value);
    if (!passwordValid.getValue()) {
       // Loglama servisi burada "FailedLogin" event'i de fırlatabilir aslında.
       console.log("Loglama servisi burada FailedLogin event'i de fırlatabilir aslında.")
       user.failedLogin(request.ipAddress, request.userAgent, "Invalid email or password");
       await this.userRepo.save(user);
       return Result.fail("Invalid email or password");
    }

    // Event Fırlat 
    user.login(
      request.ipAddress, 
      request.userAgent, 
      !!request.invalidateAllSessions
    );

    // Tenant Listesini Çek
    const membershipsResult = await this.memberRepo.getUserMemberships(user.id.getValue().toString());
    const memberships = membershipsResult.isSuccess ? membershipsResult.getValue() : [];
    const activeMember = memberships.length > 0 ? memberships[0] : null;

    const tokenPayload = {
      id: user.id.toString(),      // Strapi ID
      email: user.props.email.props.value,
      tenantId: activeMember ? activeMember.tenantId : undefined,
      role: activeMember ? activeMember.roleName : undefined
    };

    console.log("🔑 [LoginUseCase] Token Payload Hazırlanıyor:", tokenPayload);
    
    // Token Üret (JWT)
    // Eğer "invalidateAllSessions" true ise, token içine bir versiyon numarası koyabiliriz (İleri seviye konu)
    const tokenResult = await this.tokenService.sign(tokenPayload);
    if (tokenResult.isFailure) return AppError.UnexpectedError.create(tokenResult.error);
    
    const accessToken = tokenResult.getValue();
    
    return Result.ok({
      accessToken: accessToken,
      expiresIn: 3600, 
      user: {
        firstName: user.firstName,
        lastName: user.props.lastName,
        email: user.email.getValue()
      },
      availableTenants: memberships.map(m => ({
        id: m.tenantId,
        name: m.tenantName,
        role: m.roleName
      })),
      currentTenant: activeMember ? {
        id: activeMember.tenantId,
        name: activeMember.tenantName,
        role: activeMember.roleName
      } : { id: '0', name: 'No Tenant', role: 'None' }
    });
  }
}