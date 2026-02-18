import { IRepository, Result, StructuredError } from '@ogza/core';
import { RoleDetailsDTO } from '../../shared/dtos/index';

export interface TenantRoleProps {
  name: string;
  permissions: string[];
  tenantId: string;
  isDefault?: boolean;
  description: string;
}

export interface IRoleRepository extends IRepository<RoleDetailsDTO, StructuredError> {
  create(props: TenantRoleProps): Promise<Result<string, StructuredError>>;
  findByName(tenantId: string, name: string): Promise<Result<RoleDetailsDTO, StructuredError>>;
  // findAll override — IRepository'deki string yerine StructuredError
  findAll(options?: any): Promise<Result<RoleDetailsDTO[], StructuredError>>;
  findAllByTenantId(tenantId: string): Promise<Result<RoleDetailsDTO[], StructuredError>>;
}