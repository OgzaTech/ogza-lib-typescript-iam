import { IUseCase, Result ,AppError, ValidationError, StructuredError, ILogger } from "@ogza/core";
import { IRoleRepository } from "../../domain/repo/IRoleRepository";
import { RoleDetails } from "../../domain/types/RoleDetails";
import { RoleDetailsDTO } from "../../shared/dtos";


interface TenantRoleRequest {
  tenantId: string;
}

export class ListTenantRolesUseCase implements IUseCase<TenantRoleRequest, Result<RoleDetailsDTO[], StructuredError>> {

  constructor(
    private roleRepo: IRoleRepository,
    private logger: ILogger
  ) {}

  async execute(req: TenantRoleRequest): Promise<Result<RoleDetailsDTO[], StructuredError>> {
    if (!req.tenantId) {
      return AppError.ValidationFailure.create("Tenant ID is required");
    }

    try {
      return await this.roleRepo.findAllByTenantId(req.tenantId);
    } catch (err) {
      this.logger.error("ListTenantRolesUseCase failed", { error: err });
      return AppError.UnexpectedError.create(err);
    }
  }
}


