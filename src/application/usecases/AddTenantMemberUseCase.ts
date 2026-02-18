import { IUseCase, Result, Email, Guard, ILogger } from "@ogza/core";
import { IUserRepository } from "../../domain/repo/IUserRepository";
import { IMembershipRepository } from "../../domain/repo/IMembershipRepository";
import { TenantMemberStatus } from "../../shared/enums/TenantMemberStatus";

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
    private logger: ILogger
  ) {}

  async execute(req: AddTenantMemberRequest): Promise<Result<void>> {
    this.logger.info("AddTenantMemberUseCase started", { tenantId: req.tenantId, email: req.email });

    // 1. Input validasyonu
    const guardResult = Guard.combine([
      Guard.should(!!req.tenantId, "Tenant ID is required"),
      Guard.should(!!req.email, "Email is required"),
      Guard.should(!!req.role, "Role is required"),
    ]);

    if (!guardResult.isSuccess) {
      return Result.fail(guardResult.error!);
    }

    // 2. Email validasyonu
    const emailOrError = Email.create(req.email);
    if (emailOrError.isFailure) return Result.fail("Invalid email format");

    // 3. Kullanıcı sistemde var mı?
    // Bu use case sadece mevcut kullanıcıyı ekler.
    // Kullanıcı yoksa → InviteUserUseCase kullanılmalı.
    const userResult = await this.userRepo.findByEmail(emailOrError.getValue());
    if (userResult.isFailure) {
      return Result.fail(
        `User with email '${req.email}' not found. Use invite flow to add new users.`
      );
    }

    const userId = userResult.getValue().id.toString();

    // 4. Zaten bu tenant'ta üye mi?
    const existingMember = await this.memberRepo.getMemberDetailByUserIdAndTenantId(
      userId,
      req.tenantId
    );

    if (existingMember.isSuccess) {
      return Result.fail(`User is already a member of this tenant.`);
    }

    // 5. Tenant'a ekle
    const memberResult = await this.memberRepo.addMember({
      userId,
      tenantId: req.tenantId,
      role: req.role,
      estateId: req.estateId,
      memberStatus: TenantMemberStatus.ACTIVE
    });

    if (memberResult.isFailure) {
      return Result.fail("Could not add user to tenant: " + memberResult.error);
    }

    return Result.ok(void 0);
  }
}