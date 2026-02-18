import { Result, IUseCase, AppError, Guard, ILogger, StructuredError } from "@ogza/core";
import { IMembershipRepository } from "../../domain/repo/IMembershipRepository";
import { UpdateMemberRoleDTO } from "../dtos/UpdateMemberRoleDTO";
import { IamConstants } from "../../constants/IamConstants";

export class UpdateMemberRoleUseCase implements IUseCase<UpdateMemberRoleDTO, Result<void, StructuredError>> {
  constructor(
    private repo: IMembershipRepository,
    private logger: ILogger
  ) {}

  async execute(request: UpdateMemberRoleDTO): Promise<Result<void, StructuredError>> {
    this.logger.info("UpdateMemberRoleUseCase started", {
      tenantId: request.tenantId,
      memberId: request.memberId,
      newRoleId: request.newRoleId
    });

    // 1. Input validasyonu
    const guardResult = Guard.combine([
      Guard.should(!!request.tenantId, "Tenant ID is required"),
      Guard.should(!!request.memberId, "Member ID is required"),
      Guard.should(!!request.newRoleId, "New Role ID is required"),
    ]);

    if (!guardResult.isSuccess) {
      return AppError.ValidationFailure.create(guardResult.error!);
    }

    try {
      // 2. Üyeyi getir
      const memberOrError = await this.repo.getMemberDetailById(request.memberId.toString());
      if (memberOrError.isFailure) {
        return AppError.NotFound.create("Member");
      }
      const member = memberOrError.getValue();

      // 3. Rolü getir
      const roleOrError = await this.repo.getRoleWithTenant(request.newRoleId);
      if (roleOrError.isFailure) {
        return AppError.NotFound.create("Role");
      }
      const role = roleOrError.getValue();

      // 4. Owner rolü manuel atanamaz
      if (role.name === IamConstants.ROLES.OWNER) {
        return AppError.Forbidden.create(
          "Owner rolü manuel olarak atanamaz. Sahiplik devri işlemini kullanın."
        );
      }

      // 5. Cross-tenant güvenlik kontrolü
      if (member.tenantId !== role.tenantId) {
        return AppError.Forbidden.create(
          "Security Violation: Cannot assign a role from a different tenant."
        );
      }

      // 6. Güncelle
      await this.repo.updateRole(request.memberId, request.newRoleId);
      return Result.ok<void>();

    } catch (err) {
      this.logger.error("UpdateMemberRoleUseCase failed", { error: err });
      return AppError.UnexpectedError.create(err);
    }
  }
}