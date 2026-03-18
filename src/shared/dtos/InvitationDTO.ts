import { InvitationStatus } from '../enums/InvitationStatus';

export interface InvitationDTO {
  id: string;
  tenantId: string;
  tenantName: string;
  email: string;         // Davet edilen email — kullanıcı bilgisi değil!
  role: string;
  status: InvitationStatus;
  token: string;
  inviteCode: string;  
  expiresAt: Date;
  createdAt: Date;
}