import { Result ,IUseCase , ForbiddenError, NotFoundError, AppError, Guard } from "@ogza/core";
import { IMembershipRepository } from "../../domain/repo/IMembershipRepository";
import { UpdateMemberRoleDTO } from "../dtos/UpdateMemberRoleDTO";

export class UpdateMemberRoleUseCase implements IUseCase<UpdateMemberRoleDTO, Promise<Result<void>>> {
  constructor(private repo: IMembershipRepository) {}

  async execute(request: UpdateMemberRoleDTO): Promise<Result<void>> {
    console.log("UpdateMemberRoleUseCase executed ")
    const guardResult = Guard.should(!!request.tenantId, "Tenant ID is required");
    if (!guardResult.isSuccess) {
      return Result.fail(guardResult.error!);
    }
    
    // 1. Üyeyi Getir
    const memberOrError = await this.repo.getMemberDetailById(request.memberId.toString());
    if (memberOrError.isFailure) {
      return Result.fail(memberOrError.error!!);
    }
    const member = memberOrError.getValue();

    // 2. Rolü Getir
    const roleOrError = await this.repo.getRoleWithTenant(request.newRoleId);
    if (roleOrError.isFailure) {
      return Result.fail(roleOrError.error!);
    }
    const role = roleOrError.getValue();
   if (role.name === 'Owner') {
            return Result.fail(new ForbiddenError("Güvenlik İhlali: 'Owner' rolü manuel olarak atanamaz. Sahiplik devri işlemini kullanın.").message);
    }


    // 3. --- DOMAIN LOGIC: CROSS-TENANT CHECK ---
    if (member.tenantId.toString() !== role.tenantId.toString()) {
      return Result.fail(new ForbiddenError("Security Violation: Cannot assign a role from a different tenant.").message);
    }

    // 4. Güncelle
    try {
      await this.repo.updateRole(request.memberId, request.newRoleId);
      return Result.ok<void>();
    } catch (err) {
      return AppError.UnexpectedError.create(err);

    }
  }
}