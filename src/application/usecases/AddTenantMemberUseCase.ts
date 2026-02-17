import { IUseCase, Result, IHashingService ,Email} from "@ogza/core";
import { IUserRepository } from "../../domain/repo/IUserRepository";
import { IMembershipRepository } from "../../domain/repo/IMembershipRepository";
import { User } from "../../domain/User"; 
import { TenantMemberStatus } from "../../domain/enums/TenantMemberStatus";

export interface AddTenantMemberRequest {
  tenantId: string;
  estateId?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export class AddTenantMemberUseCase implements IUseCase<AddTenantMemberRequest, Result<void>> {
  constructor(
    private userRepo: IUserRepository,
    private memberRepo: IMembershipRepository,
  ) {}

  async execute(req: AddTenantMemberRequest): Promise<Result<void>> {
 
    console.log("AddTenantMemberRequest Execudedd") ;
    const emailOrError = Email.create(req.email);
    if (emailOrError.isFailure) return Result.fail("Invalid email format");

    // 2. Kullanıcıyı Doğrulama
    const existingUserResult = await this.userRepo.findByEmail(emailOrError.getValue());
    let userId: string;

    if (existingUserResult.isSuccess) {
      // SENARYO A: Kullanıcı sistemde zaten var.
      // Sadece ID'sini alıyoruz. Yeni create işlemi yapmıyoruz.
      console.log("♻️ Kullanıcı mevcut, ID alınıyor...");
      userId = existingUserResult.getValue().id.toString();

    } else {
      // SENARYO B: Kullanıcı yok, SIFIRDAN OLUŞTURUYORUZ.
      console.log("✨ Yeni kullanıcı oluşturuluyor... ");

      const tempPassword = "Password123!"; // İleride rastgele üretilip mail atılacak

      const newUserOrError = User.create({
        email: req.email,
        firstName: req.firstName,
        lastName: req.lastName,
        password: tempPassword, 
        role: 'Member', 
        isActive: true
      });

      if (newUserOrError.isFailure) return Result.fail(newUserOrError.error!);

      const createResult = await this.userRepo.create(newUserOrError.getValue());
      if (createResult.isFailure) return Result.fail(createResult.error!);
      
      userId = createResult.getValue().id.toString();
    }

    // 2. FİRMAYA BAĞLA (Asıl Amaç)

    const memberResult = await this.memberRepo.addMember({
      userId: userId,
      tenantId: req.tenantId,
      role: req.role,
      estateId: req.estateId,
      memberStatus : TenantMemberStatus.ACTIVE 
    });

    if (memberResult.isFailure) {
        return Result.fail("Kullanıcı firmaya eklenemedi: " + memberResult.error);
    }

    return Result.ok(void 0);
  }
}