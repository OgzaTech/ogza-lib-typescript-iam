import { IUseCase, Result, AppError, Email, ILogger, StructuredError } from "@ogza/core";
import { IUserRepository } from "../../domain/repo/IUserRepository";
import { IMembershipRepository } from "../../domain/repo/IMembershipRepository";
import { IInvitationRepository } from "../../domain/repo/IInvitationRepository";
import { InvitationStatus } from "../../shared/enums/InvitationStatus";
import { TenantMemberStatus } from "../../shared/enums/TenantMemberStatus";

export interface AcceptInvitationRequest {
  inviteCode: string; // URL'den gelen UUID
}

export type AcceptInvitationResponse =
  | { outcome: 'ADDED';          accessInfo: { tenantId: string; role: string } }
  | { outcome: 'NEEDS_REGISTER'; email: string; tenantId: string; role: string; inviteCode: string };
  // ADDED          → Kullanıcı vardı, direkt eklendi
  // NEEDS_REGISTER → Kullanıcı yok, kayıt sayfasına yönlendir
  //                  Kayıt sonrası aynı inviteCode ile tekrar çağrılır

export class AcceptInvitationUseCase
  implements IUseCase<AcceptInvitationRequest, Result<AcceptInvitationResponse, StructuredError>>
{
  constructor(
    private invitationRepo: IInvitationRepository,
    private userRepo: IUserRepository,
    private memberRepo: IMembershipRepository,
    private logger: ILogger
  ) {}

  async execute(req: AcceptInvitationRequest): Promise<Result<AcceptInvitationResponse, StructuredError>> {

    // 1. inviteCode ile daveti bul
    const invitationResult = await this.invitationRepo.findByInviteCode(req.inviteCode);
    if (invitationResult.isFailure) {
      return AppError.NotFound.create("Davet bulunamadı.");
    }

    const invitation = invitationResult.getValue();

    // 2. Davet durumu kontrol
    if (invitation.status === InvitationStatus.ACCEPTED) {
      return AppError.ValidationFailure.create("Bu davet zaten kabul edilmiş.");
    }

    if (invitation.status === InvitationStatus.REVOKED) {
      return AppError.ValidationFailure.create("Bu davet iptal edilmiş.");
    }

    if (invitation.status === InvitationStatus.EXPIRED || new Date() > invitation.expiresAt) {
      await this.invitationRepo.updateStatus(invitation.id, InvitationStatus.EXPIRED);
      return AppError.ValidationFailure.create("Davet süreniz dolmuş. Yeni davet talep edin.");
    }

    // 3. Bu email ile kullanıcı var mı?
    const emailOrError = Email.create(invitation.email);
    if (emailOrError.isFailure) {
      return AppError.ValidationFailure.create("Geçersiz email.");
    }

    const userResult = await this.userRepo.findByEmail(emailOrError.getValue());

    if (userResult.isFailure) {
      // Kullanıcı yok → kayıt sayfasına yönlendir
      // inviteCode ile kayıt sayfasına gidecek, kayıt sonrası tekrar bu endpoint çağrılacak
      this.logger.info("Invitation: user needs to register first", {
        email: invitation.email,
        tenantId: invitation.tenantId
      });

      return Result.ok<AcceptInvitationResponse>({
        outcome: 'NEEDS_REGISTER',
        email: invitation.email,      // kayıt formunu pre-fill için
        tenantId: invitation.tenantId,
        role: invitation.role,
        inviteCode: req.inviteCode,   // kayıt sonrası tekrar kullanılacak
      });
    }

    // 4. Kullanıcı var → zaten bu tenant'ta üye mi?
    const user = userResult.getValue();

    const existingMember = await this.memberRepo.getMemberDetailByUserIdAndTenantId(
      user.id.toString(),
      invitation.tenantId
    );

    if (existingMember.isSuccess) {
      await this.invitationRepo.updateStatus(invitation.id, InvitationStatus.ACCEPTED);
      return AppError.ValidationFailure.create("Bu tenant'a zaten üyesiniz.");
    }

    // 5. Tenant'a ekle
    const addResult = await this.memberRepo.addMember({
      userId: user.id.toString(),
      tenantId: invitation.tenantId,
      role: invitation.role,
      memberStatus: TenantMemberStatus.ACTIVE,
    });

    if (addResult.isFailure) {
      return AppError.UnexpectedError.create("Üyelik oluşturulamadı.");
    }

    // 6. Daveti ACCEPTED yap
    await this.invitationRepo.updateStatus(invitation.id, InvitationStatus.ACCEPTED);

    this.logger.info("Invitation accepted, user added to tenant", {
      userId: user.id.toString(),
      tenantId: invitation.tenantId,
      role: invitation.role,
    });

    return Result.ok<AcceptInvitationResponse>({
      outcome: 'ADDED',
      accessInfo: {
        tenantId: invitation.tenantId,
        role: invitation.role,
      }
    });
  }
}