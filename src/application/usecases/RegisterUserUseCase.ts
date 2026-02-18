import { IUseCase, Result, AppError, Email, LocalizationService, ILogger, StructuredError } from "@ogza/core";
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
    private logger: ILogger
  ) {}

  public async execute(request: RegisterUserDTO): Promise<Result<void, StructuredError>> {

    // 1. Email validasyonu
    const emailOrError = Email.create(request.email);
    if (emailOrError.isFailure) {
      return AppError.ValidationFailure.create(emailOrError.error!);
    }

    // 2. Mükerrer email kontrolü
    const userAlreadyExists = await this.userRepo.findByEmail(emailOrError.getValue());
    if (userAlreadyExists.isSuccess) {
      return AppError.ValidationFailure.create(LocalizationService.t(IamKeys.USER.ALREADY_EXISTS));
    }

    // 3. User entity oluştur
    const userOrError = User.create({
      email: request.email,
      password: request.password,
      firstName: request.firstName,
      lastName: request.lastName
    });

    if (userOrError.isFailure) {
      return AppError.ValidationFailure.create(userOrError.error!);
    }

    const user = userOrError.getValue();

    // save() → Result<void> döner, ID için create() kullanılmalı
    const createUserResult = await this.userRepo.create(user);
    if (createUserResult.isFailure) {
      return AppError.UnexpectedError.create(createUserResult.error ?? "Failed to save user");
    }
    const realUserId = createUserResult.getValue().id.toString();

    // 4. Hesap tipi mantığı
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

    // 5. Yapıyı kur (Tenant → Roles → Estate → Member)
    try {
      // A. Tenant oluştur
      const tenantResult = await this.tenantRepo.create({
        name: tenantName,
        type: request.accountType
      });
      if (tenantResult.isFailure) {
        return AppError.UnexpectedError.create(tenantResult.error);
      }
      const tenantId = tenantResult.getValue();

      // B. Varsayılan rolleri oluştur
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
        return AppError.UnexpectedError.create("Critical Error: Owner role could not be created.");
      }

      // C. Estate oluştur
      const estateResult = await this.estateRepo.create({
        name: estateName,
        type: estateType,
        tenantId: tenantId,
        parentEstateId: null
      });
      if (estateResult.isFailure) {
        return AppError.UnexpectedError.create(estateResult.error);
      }
      const estateId = estateResult.getValue();

      // D. Üyelik oluştur
      const memberResult = await this.memberRepo.addMember({
        userId: realUserId,
        tenantId: tenantId,
        estateId: estateId,
        role: ownerRoleId,
        memberStatus: TenantMemberStatus.ACTIVE
      });

      if (memberResult.isFailure) {
        return AppError.UnexpectedError.create(memberResult.error);
      }

      this.logger.info("User registered successfully", { userId: realUserId, tenantId });
      return Result.ok<void>();

    } catch (err) {
      this.logger.error("RegisterUserUseCase failed", { error: err });
      return AppError.UnexpectedError.create(err);
    }
  }
}