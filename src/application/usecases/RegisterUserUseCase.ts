import { IUseCase, Result, AppError, Email, LocalizationService } from "@ogza/core";
import { User } from "../../domain/User";
import { IamKeys } from "../../constants/IamKeys";

import { RegisterUserDTO } from "../dtos/RegisterUserDTO";
import { IUserRepository, ITenantRepository, IEstateRepository, IMembershipRepository ,IRoleRepository} from "../../domain/repo/index";
import { IamConstants } from "../../constants/IamConstants";
import { TenantMemberStatus } from "../../domain/enums/TenantMemberStatus";


export interface RoleConfigDefinition {
  name: string;
  description: string;
  permissions: string[];
  isDefault: boolean;
}

export class RegisterUserUseCase implements IUseCase<RegisterUserDTO, Result<void>> {
  constructor(
    private userRepo: IUserRepository,
    private tenantRepo: ITenantRepository,
    private estateRepo: IEstateRepository,  
    private memberRepo: IMembershipRepository,
    private roleRepo: IRoleRepository,
    private defaultRolesConfig: RoleConfigDefinition[]
  ) {}

  public async execute(request: RegisterUserDTO): Promise<Result<void>> {

    // ---------------------------------------------------------
    // ADIM 1: User Oluşturma (Global Identity)
    // ---------------------------------------------------------
    const emailOrError = Email.create(request.email);
    if (emailOrError.isFailure) return Result.fail(emailOrError.error!);

    // Mükerrer Kontrolü (Global Email)
    const userAlreadyExists = await this.userRepo.findByEmail(emailOrError.getValue());
    if (userAlreadyExists.isSuccess) {
      return Result.fail(LocalizationService.t(IamKeys.USER.ALREADY_EXISTS));
    }

    const userOrError = User.create({
      email: request.email,
      password: request.password,
      firstName: request.firstName,
      lastName: request.lastName
    });

    if (userOrError.isFailure) return Result.fail(userOrError.error!);
    const user = userOrError.getValue();

    const saveUserResult = await this.userRepo.save(user);
    if (saveUserResult.isFailure) {
        return Result.fail(saveUserResult.error || "Failed to save user");
    }
    const realUserId = saveUserResult.getValue();

    // ---------------------------------------------------------
    // ADIM 2: Hesap Tipi Mantığı (Individual vs Corporate)
    // ---------------------------------------------------------
    let tenantName = "";
    let estateName = "";
    let estateType = "";

    if (request.accountType === IamConstants.ACCOUNT_TYPE.INDIVIDUAL) {
      // Bireysel: Şirket ismi şahsın adıdır, mekanı "Kişisel Alan"dır.
      tenantName = `${request.firstName} ${request.lastName}`;
      estateName = IamConstants.DEFAULTS.PERSONAL_ESTATE_NAME; 
      estateType = IamConstants.ESTATE_TYPE.PERSONAL_SPACE;
    } else {
      // Kurumsal: Şirket ismi formdan gelir, mekanı "Merkez Ofis"tir.
      tenantName = request.companyName || `${request.firstName}'s Company`;
      estateName = IamConstants.DEFAULTS.HEADQUARTER_NAME; 
      estateType = IamConstants.ESTATE_TYPE.HEADQUARTER;
    }

    // ---------------------------------------------------------
    // ADIM 3: Yapıyı Kurma (Tenant -> Estate -> Member)
    // ---------------------------------------------------------
    try {
      // A. Tenant (Ana Hesap) Oluştur
      const tenantResult = await this.tenantRepo.create({
        name: tenantName,
        type: request.accountType
      });
      if (tenantResult.isFailure) return Result.fail(tenantResult.error!);
      const tenantId = tenantResult.getValue();


    // ----------------------------------------------------------------
    // 3. VARSAYILAN ROLLERİ OLUŞTUR (Dinamik)
    // ----------------------------------------------------------------
      let ownerRoleId = '';

    // Config listesini dönüyoruz (Owner, Admin, Member)
      for (const roleDef of this.defaultRolesConfig) {
        
        const roleResult = await this.roleRepo.create({
          name: roleDef.name,
          description: roleDef.description,
          permissions: roleDef.permissions,
          tenantId: tenantId,
          isDefault: roleDef.isDefault
        });

        if (roleResult.isFailure) {
          // Logla ama süreci durdurma (veya durdur, kararına bağlı)
          console.error(`Failed to create role ${roleDef.name}:`, roleResult.error);
          continue;
        }

        // Eğer oluşturduğumuz rol OWNER ise, ID'sini sakla (Kullanıcıya atayacağız)
        if (roleDef.name === IamConstants.DEFAULT_ROLE_NAMES.OWNER) {
          ownerRoleId = roleResult.getValue();
        }
      }

      if (!ownerRoleId) {
        return Result.fail("Critical Error: Owner role could not be created.");
      }


     // 4. Estate Oluştur Estate (Kök Birim) Oluştur
      const estateResult = await this.estateRepo.create({
        name: estateName,
        type: estateType,
        tenantId: tenantId,
        parentEstateId: null 
      });
      if (estateResult.isFailure) return Result.fail(estateResult.error!);
      const estateId = estateResult.getValue();

      // C. Üyelik (Membership) Oluştur
      // Kullanıcıyı oluşturulan Estate'e "OWNER" olarak bağla
      await this.memberRepo.addMember({
        userId: realUserId,
        tenantId: tenantId,
        estateId: estateId,
        role: ownerRoleId,
        memberStatus:TenantMemberStatus.ACTIVE
      });

      return Result.ok<void>();

    } catch (err) {
      // Not: Burada gerçek bir transaction yönetimi (UnitOfWork) olsa iyi olurdu.
      // Eğer Tenant oluşur ama Estate oluşamazsa, yarım data kalabilir.
      // Şimdilik basit tutuyoruz.
      return AppError.UnexpectedError.create(err);
    }

  }
}