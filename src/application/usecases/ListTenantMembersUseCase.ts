import { IUseCase, Result, AppError, Guard, SearchParams, IPaginatedResponse, ILogger, StructuredError } from "@ogza/core";
import { IMembershipRepository } from "../../domain/repo/IMembershipRepository";
import { TenantMemberDTO } from "../../shared/dtos/index";

export interface TenantMembersRequest extends SearchParams {
  tenantId?: string;
}

export class ListTenantMembersUseCase implements IUseCase<TenantMembersRequest, Result<IPaginatedResponse<TenantMemberDTO>, StructuredError>> {

  constructor(
    private membershipRepo: IMembershipRepository,
    private logger: ILogger
  ) {}

  public async execute(req: TenantMembersRequest): Promise<Result<IPaginatedResponse<TenantMemberDTO>, StructuredError>> {
    const guardResult = Guard.should(!!req.tenantId, "Tenant ID is required");
    if (!guardResult.isSuccess) {
      return AppError.ValidationFailure.create(guardResult.error!);
    }

    try {
      return await this.membershipRepo.getMembersByTenant(req);
    } catch (err) {
      this.logger.error("ListTenantMembersUseCase failed", { error: err });
      return AppError.UnexpectedError.create(err);
    }
  }
}