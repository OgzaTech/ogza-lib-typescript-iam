import { TenantMemberStatus } from '../../shared';

export interface TenantMemberDTO {
  tenantId:string;
  memberId: string; // İlişki ID'si
  userId: string;
  firstName: string;    // User'dan gelen
  lastName: string;     // User'dan gelen
  email: string;        // User'dan gelen
  role: string;         // Membership'ten gelen
  status: TenantMemberStatus;
  joinedAt: Date;
}