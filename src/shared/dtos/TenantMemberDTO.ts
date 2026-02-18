import { TenantMemberStatus } from "../enums/TenantMemberStatus";

export interface TenantMemberDTO {
  tenantId: string;
  memberId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: TenantMemberStatus;
  joinedAt: Date;
}