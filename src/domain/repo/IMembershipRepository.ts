import { IPaginatedResponse, IRepository, Result, SearchParams } from "@ogza/core";
import { TenantMemberStatus } from "../enums/TenantMemberStatus";
import { TenantMemberDTO } from "../../application/dtos/TenantMemberDTO";

export interface AddMemberProps {
  userId: string;
  tenantId: string;
  estateId?: string;
  role: string; 
  memberStatus: string; 
}

export interface RoleWithTenant {
  id: number;
  name:string,
  tenantId: number;
}

export interface TenantMembership {
  tenantId: string;
  tenantName: string;
  roleName: string;
}

export interface IMembershipRepository{
  getMembersByTenant(params: SearchParams): Promise<Result<IPaginatedResponse<TenantMemberDTO>>>;
  getMemberDetailByUserIdAndTenantId(userId: string, tenantId: string): Promise<Result<TenantMemberDTO>>;

  getUserMemberships(userId: string): Promise<Result<TenantMembership[]>>;
  addMember(props: AddMemberProps): Promise<Result<void>>;
  updateMemberStatus(tenantId: string, memberId: string,  status: TenantMemberStatus): Promise<Result<void>>;

  updateRole(memberId: number, roleId: number): Promise<Result<void>>;
  getRoleWithTenant(roleId: number): Promise<Result<RoleWithTenant>>;
  getMemberDetailById(memberId: string): Promise<Result<TenantMemberDTO>>;

  // 
  // getMemberDetails(tenantId: string,  memberId: string , estateId?: string): Promise<{ role: string; status: TenantMemberStatus } | null>;
  // getMembersByTenant(tenantId: string): Promise<TenantMemberDTO[]>;
}
