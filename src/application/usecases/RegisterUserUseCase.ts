import { IUseCase, Result, AppError, Email, LocalizationService, ILogger, StructuredError, IUnitOfWork } from "@ogza/core";
import { User } from "../../domain/User";
import { IamKeys } from "../../constants/IamKeys";
import { RegisterUserDTO } from "../dtos/RegisterUserDTO";
import { IUserRepository, ITenantRepository, IEstateRepository, IMembershipRepository, IRoleRepository } from "../../domain/repo/index";
import { IamConstants } from "../../constants/IamConstants";
import { TenantMemberStatus } from "../../shared/enums/TenantMemberStatus";

export interface RoleConfigDefinition {
  name: string;
  description: string;
  permissions: string[];
  isDefault: boolean;
}

export class RegisterUserUseCase implements IUseCase<RegisterUserDTO, Result<void, StructuredError>> {
  constructor(
    private userRepo: IUserRepository,
    private tenantRepo: ITenantRepository,
    private estateRepo: IEstateRepository,
    private memberRepo: IMembershipRepository,
    private roleRepo: IRoleRepository,
    private defaultRolesConfig: RoleConfigDefinition[],
    private logger: ILogger,
    private unitOfWork: IUnitOfWork
    // NOT: IHashingService burada YOK.
    // Şifre hash'leme repository'ye (Payload) bırakıldı.
    // Payload kendi auth sisteminde hash'liyor — double hash'i önler.
  ) {}

  public async execute(request: RegisterUserDTO): Promise<Result<void, StructuredError>> {

    // 1. Email validasyonu — transaction dışında, DB'ye dokunmaz
    const emailOrError = Email.create(request.email);
    if (emailOrError.isFailure) {
      return AppError.ValidationFailure.create(emailOrError.error!);
    }

    // 2. Mükerrer email kontrolü — transaction dışında, read-only
    const userAlreadyExists = await this.userRepo.findByEmail(emailOrError.getValue());
    if (userAlreadyExists.isSuccess) {
      return AppError.ValidationFailure.create(LocalizationService.t(IamKeys.USER.ALREADY_EXISTS));
    }

    // 3. User entity oluştur — plain text şifre ile
    // Repository (Payload) hash'leme işini üstleniyor.
    // isPasswordHashed: false → UserPassword.createRaw() → min length kontrolü yapılır
    const userOrError = User.create({
      email: request.email,
      password: request.password,  // plain text — Payload hash'ler
      isPasswordHashed: false,
      firstName: request.firstName,
      lastName: request.lastName
    });

    if (userOrError.isFailure) {
      return AppError.ValidationFailure.create(userOrError.error!);
    }

    const user = userOrError.getValue();

    // 4. Hesap tipi mantığı — saf domain, DB yok
    let tenantName: string;
    let estateName: string;
    let estateType: string;

    if (request.accountType === IamConstants.ACCOUNT_TYPE.INDIVIDUAL) {
      tenantName = `${request.firstName} ${request.lastName}`;
      estateName = IamConstants.DEFAULTS.PERSONAL_ESTATE_NAME;
      estateType = IamConstants.ESTATE_TYPE.PERSONAL_SPACE;
    } else {
      tenantName = request.companyName || `${request.firstName}'s Company`;
      estateName = IamConstants.DEFAULTS.HEADQUARTER_NAME;
      estateType = IamConstants.ESTATE_TYPE.HEADQUARTER;
    }

    // 5. Tüm yazma operasyonları tek transaction'da
    // Not: IUnitOfWork.execute Result<T, string> döner (core'da string sabit).
    // Core'da generic error desteği eklenene kadar string üzerinden çalışıyoruz.
    const txResult = await this.unitOfWork.execute(async (): Promise<Result<void>> => {

      // A. User kaydet — Payload burada plain text şifreyi hash'ler
      const createUserResult = await this.userRepo.create(user);
      if (createUserResult.isFailure) {
        return Result.fail('Failed to save user');
      }
      const realUserId = createUserResult.getValue().id.toString();

      // B. Tenant oluştur
      const tenantResult = await this.tenantRepo.create({
        name: tenantName,
        type: request.accountType
      });
      if (tenantResult.isFailure) {
        return Result.fail('Failed to create tenant');
      }
      const tenantId = tenantResult.getValue();

      // C. Varsayılan rolleri oluştur
      let ownerRoleId = '';

      for (const roleDef of this.defaultRolesConfig) {
        const roleResult = await this.roleRepo.create({
          name: roleDef.name,
          description: roleDef.description,
          permissions: roleDef.permissions,
          tenantId: tenantId,
          isDefault: roleDef.isDefault
        });

        if (roleResult.isFailure) {
          this.logger.error(`Failed to create role ${roleDef.name}`, { error: roleResult.error });
          continue;
        }

        if (roleDef.name === IamConstants.ROLES.OWNER) {
          ownerRoleId = roleResult.getValue();
        }
      }

      if (!ownerRoleId) {
        return Result.fail('Critical Error: Owner role could not be created.');
      }

      // D. Estate oluştur
      const estateResult = await this.estateRepo.create({
        name: estateName,
        type: estateType,
        tenantId: tenantId,
        parentEstateId: null
      });
      if (estateResult.isFailure) {
        return Result.fail('Failed to create estate');
      }
      const estateId = estateResult.getValue();

      // E. Üyelik oluştur
      const memberResult = await this.memberRepo.addMember({
        userId: realUserId,
        tenantId: tenantId,
        estateId: estateId,
        role: ownerRoleId,
        memberStatus: TenantMemberStatus.ACTIVE
      });

      if (memberResult.isFailure) {
        return Result.fail('Failed to add member');
      }

      this.logger.info("User registered successfully", { userId: realUserId, tenantId });
      return Result.ok<void>();
    });

    // string → StructuredError dönüşümü
    if (txResult.isFailure) {
      return AppError.UnexpectedError.create(txResult.error);
    }

    return Result.ok<void>();
  }
}