import { IUseCase, Result ,AppError, ValidationError } from "@ogza/core";
import { IRoleRepository } from "../../domain/repo/IRoleRepository";
import { RoleDetails } from "../../domain/types/RoleDetails";

interface TenantRoleRequest {
  tenantId: string; 
}

type Response = Promise<Result<RoleDetails[]>>;

export class ListTenantRolesUseCase implements IUseCase<TenantRoleRequest, Response> {
  constructor(private roleRepo: IRoleRepository) {}

  async execute(req: TenantRoleRequest): Promise<Response> {
    if (!req.tenantId) {
        return Result.fail(new ValidationError("Tenant ID is required").message);
    }

    console.log(req.tenantId)

    try {
      return await this.roleRepo.findAllByTenantId(req.tenantId);
    } catch (err) {
        return AppError.UnexpectedError.create(err);
    }
  }
}