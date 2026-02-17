import { IUseCase, Result, AppError, Guard, ForbiddenError } from "@ogza/core";
import { RemoveTenantMemberDTO } from "../dtos/RemoveTenantMemberDTO";
import { IMembershipRepository } from "../../domain/repo/IMembershipRepository";
import { IamConstants } from "../../constants/IamConstants";
import { TenantMemberStatus } from "../../domain/enums/TenantMemberStatus";

export class RemoveTenantMemberUseCase implements IUseCase<RemoveTenantMemberDTO, Result<void>> {
  private membershipRepo: IMembershipRepository;

  constructor(membershipRepo: IMembershipRepository) {
    this.membershipRepo = membershipRepo;
  }

  public async execute(request: RemoveTenantMemberDTO): Promise<Result<void>> {

    console.log("-- RemoveTenantMemberUseCase started")
    // 1. Input Validasyonu
    const guardResult = Guard.combine([
      Guard.should(!!request.tenantId, "Tenant ID is required!"),
      Guard.should(!!request.memberId, "Member ID is required!"),
    ]);

    if (!guardResult.isSuccess) {
      return Result.fail(guardResult.error!);
    }
 
    try {
      const memberDetail = (await this.membershipRepo.getMemberDetailByUserIdAndTenantId(request.memberId , request.tenantId)).getValue();

       if (!memberDetail) {

         return Result.fail("Member not found or already inactive.");
       }
       if (memberDetail.status === TenantMemberStatus.DELETED) {

         return Result.fail("Member is already deleted. " );
       }

       console.log(memberDetail)
       const guardResult = Guard.should(
          memberDetail.role !== IamConstants.DEFAULT_ROLE_NAMES.OWNER,  
          "Firma kurucusu (Owner) firmadan çıkarılamaz!" 
        );

        if (guardResult.isFailure) {
            return Result.fail(new ForbiddenError(guardResult.error as string).message);
        }

       // 3. Soft Delete İşlemi
      const updateResult = await this.membershipRepo.updateMemberStatus(request.tenantId, request.memberId,TenantMemberStatus.DELETED);

       if (updateResult.isFailure) {
        return Result.fail(updateResult.error!);
       }
      // (Opsiyonel) Domain Event fırlatılabilir: TenantMemberRemovedEvent

      return Result.ok<void>();

    } catch (err) {
       console.log("HATA ALDI REMove use case ")
      return AppError.UnexpectedError.create(err);
    }
  }
}