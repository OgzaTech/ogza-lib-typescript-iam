import { IUseCase, Result, AppError, Guard, SearchParams, IPaginatedResponse } from "@ogza/core";
import { IMembershipRepository } from "../../domain/repo/IMembershipRepository";
import { TenantMemberDTO } from "../dtos/TenantMemberDTO";

export interface TenantMembersRequest extends SearchParams {
  tenantId?: string; 
}

export class ListTenantMembersUseCase implements IUseCase<TenantMembersRequest, Promise<Result<IPaginatedResponse<TenantMemberDTO>>>> {
  private membershipRepo: IMembershipRepository;

  constructor(membershipRepo: IMembershipRepository) {
    this.membershipRepo = membershipRepo;
  }

  public async execute(req: TenantMembersRequest): Promise<Result<IPaginatedResponse<TenantMemberDTO>>> {
   const guardResult = Guard.should(!!req.tenantId, "Tenant ID is required");
    if (!guardResult.isSuccess) {
      return Result.fail(guardResult.error!);
    }

    try {
      return await this.membershipRepo.getMembersByTenant(req);

    } catch (err) {
        return AppError.UnexpectedError.create(err);
    }
  }
}

