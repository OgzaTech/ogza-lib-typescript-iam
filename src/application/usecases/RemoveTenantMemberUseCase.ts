import { IUseCase, Result, AppError, Guard, ILogger, StructuredError } from "@ogza/core";
import { RemoveTenantMemberDTO } from "../dtos/RemoveTenantMemberDTO";
import { IMembershipRepository } from "../../domain/repo/IMembershipRepository";
import { TenantMembership } from "../../domain/TenantMembership";
import { TenantMemberStatus } from "../../shared/enums/TenantMemberStatus";

export class RemoveTenantMemberUseCase implements IUseCase<RemoveTenantMemberDTO, Result<void, StructuredError>> {

  constructor(
    private membershipRepo: IMembershipRepository,
    private logger: ILogger
  ) {}

  public async execute(request: RemoveTenantMemberDTO): Promise<Result<void, StructuredError>> {
    this.logger.info("RemoveTenantMemberUseCase started", {
      tenantId: request.tenantId,
      memberId: request.memberId
    });

    // 1. Input validasyonu
    const guardResult = Guard.combine([
      Guard.should(!!request.tenantId, "Tenant ID is required!"),
      Guard.should(!!request.memberId, "Member ID is required!"),
    ]);

    if (!guardResult.isSuccess) {
      return AppError.ValidationFailure.create(guardResult.error!);
    }

    this.logger.info("RemoveTenantMemberUseCase Else Girdi", {
      tenantId: request.tenantId,
      memberId: request.memberId
    });

    try {
      // 2. Üyeyi getir
      const memberDetailResult = await this.membershipRepo.getMemberDetailByUserIdAndTenantId(
        request.memberId,
        request.tenantId
      );

      if (memberDetailResult.isFailure) {
        return AppError.NotFound.create("Member");
      }

      const memberDetail = memberDetailResult.getValue();
      console.log("*****************")
   

      // 3. Domain entity üzerinden kuralları uygula
      const membershipOrError = TenantMembership.create({
        tenantId: memberDetail.tenantId,
        userId: memberDetail.userId,
        role: memberDetail.role,
        status: memberDetail.status,
        joinedAt: memberDetail.joinedAt,
        updatedAt: new Date()
      });

      if (membershipOrError.isFailure) {
        console.log("membershipOrError.isFailure ")

        return AppError.ValidationFailure.create(membershipOrError.error!.toString());
      }
      console.log("membershipOrError.isFailure Değil ")


      const membership = membershipOrError.getValue();

      // Domain entity kendi kurallarını uygular:
      // - Zaten DELETED mi?
      // - Owner mı? → silinemez
      const updateResult = membership.updateStatus(TenantMemberStatus.DELETED);
      if (updateResult.isFailure) {
        return Result.fail(updateResult.error!); // InvalidOperationError
      }

      // 4. Soft delete
      const repoResult = await this.membershipRepo.updateMemberStatus(
        request.tenantId,
        request.memberId,
        TenantMemberStatus.DELETED
      );

      if (repoResult.isFailure) {
        return AppError.UnexpectedError.create(repoResult.error);
      }

      return Result.ok<void>();

    } catch (err) {
      this.logger.error("RemoveTenantMemberUseCase failed", { error: err });
      return AppError.UnexpectedError.create(err);
    }
  }
}