import { IRepository, IPaginatedResponse, Result, SearchParams, StructuredError } from '@ogza/core';
import { TenantMemberStatus } from '../../shared/enums/TenantMemberStatus';
import { TenantMemberDTO } from '../../shared/dtos/index';

export interface AddMemberProps {
  userId: string;
  tenantId: string;
  estateId?: string;
  role: string;
  memberStatus: TenantMemberStatus;
}

export interface RoleWithTenant {
  id: number;
  name: string;
  tenantId: string;
}

export interface TenantMembership {
  tenantId: string;
  tenantName: string;
  roleName: string;
}

export interface IMembershipRepository extends IRepository<TenantMemberDTO, StructuredError>{
  addMember(props: AddMemberProps): Promise<Result<void, StructuredError>>;
  getMembersByTenant(params: SearchParams): Promise<Result<IPaginatedResponse<TenantMemberDTO>, StructuredError>>;
  getMemberDetailByUserIdAndTenantId(userId: string, tenantId: string): Promise<Result<TenantMemberDTO, StructuredError>>;
  getMemberDetailById(memberId: string): Promise<Result<TenantMemberDTO, StructuredError>>;
  getUserMemberships(userId: string): Promise<Result<TenantMembership[], StructuredError>>;
  updateMemberStatus(tenantId: string, memberId: string, status: TenantMemberStatus): Promise<Result<void, StructuredError>>;
  updateRole(memberId: number, roleId: number): Promise<Result<void, StructuredError>>;
  getRoleWithTenant(roleId: number): Promise<Result<RoleWithTenant, StructuredError>>;
}


