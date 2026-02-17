import { Result } from "@ogza/core";
import { RoleDetails } from "../types/RoleDetails";

export interface TenantRoleProps {
  name: string;
  permissions: string[];
  tenantId: string;
  isDefault?: boolean;
  description:string;
}

export interface IRoleRepository {
  create(props: TenantRoleProps): Promise<Result<string>>; 
  findByName(tenantId: string, name: string): Promise<Result<RoleDetails>>; 
  findAllByTenantId(tenantId: string): Promise<Result<RoleDetails[]>>;
}