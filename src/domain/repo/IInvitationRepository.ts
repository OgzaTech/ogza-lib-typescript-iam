import { IRepository, Result, StructuredError } from '@ogza/core';
import { InvitationDTO } from '../../shared/dtos/InvitationDTO';
import { InvitationStatus } from '../../shared/enums/InvitationStatus';

export interface CreateInvitationProps {
  tenantId: string;
  tenantName: string;
  email: string;
  role: string;
  token: string;         // JWT — gizli, DB'de saklı
  inviteCode: string;    // UUID — URL'de kullanılır
  expiresAt: Date;
}

export interface IInvitationRepository extends IRepository<InvitationDTO, StructuredError> {
  create(props: CreateInvitationProps): Promise<Result<InvitationDTO, StructuredError>>;
  findByInviteCode(inviteCode: string): Promise<Result<InvitationDTO, StructuredError>>;
  findByEmailAndTenant(email: string, tenantId: string): Promise<Result<InvitationDTO, StructuredError>>;
  updateStatus(id: string, status: InvitationStatus): Promise<Result<void, StructuredError>>;
}