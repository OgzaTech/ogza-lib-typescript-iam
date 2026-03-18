import { IUseCase, Result, AppError, Email, ITokenService, INotificationService, ILogger, StructuredError, IAppConfig, NotificationChannel } from "@ogza/core";
import { IMembershipRepository } from "../../domain/repo/IMembershipRepository";
import { IInvitationRepository } from "../../domain/repo/IInvitationRepository";
import { IamConstants } from "../../constants/IamConstants";
import { InvitationStatus } from "../../shared/enums/InvitationStatus";
import { v4 as uuidv4 } from 'uuid';

export interface InviteTenantMemberRequest {
  tenantId: string;
  tenantName: string;
  inviterName: string;
  email: string;
  role: string;
}

export interface InviteTenantMemberResponse {
  invitationId: string;
  inviteCode: string; // UUID — frontend'e döner, URL'de kullanılır
  email: string;
  expiresAt: Date;
}

export class InviteTenantMemberUseCase
  implements IUseCase<InviteTenantMemberRequest, Result<InviteTenantMemberResponse, StructuredError>>
{
  constructor(
    private invitationRepo: IInvitationRepository,
    private memberRepo: IMembershipRepository,
    private tokenService: ITokenService,
    private notificationService: INotificationService,
    private appConfig: IAppConfig,
    private logger: ILogger
  ) {}

  async execute(req: InviteTenantMemberRequest): Promise<Result<InviteTenantMemberResponse, StructuredError>> {

    // 1. Email validasyonu
    const emailOrError = Email.create(req.email);
    if (emailOrError.isFailure) {
      return AppError.ValidationFailure.create("Invalid email format");
    }

    // 2. Bu email bu tenant'a zaten PENDING davet var mı?
    // Kullanıcının sistemde olup olmadığına BAKMIYORUZ — güvenlik gereği
    const existingInvite = await this.invitationRepo.findByEmailAndTenant(req.email, req.tenantId);
    if (existingInvite.isSuccess && existingInvite.getValue().status === InvitationStatus.PENDING) {
      return AppError.ValidationFailure.create(
        "Bu email adresine zaten bekleyen bir davet gönderilmiş."
      );
    }

    // 3. inviteCode — URL'de kullanılacak UUID
    const inviteCode = uuidv4();

    // 4. JWT token — doğrulama için, inviteCode referans alır
    const tokenResult = await this.tokenService.sign(
      {
        id: `invite:${req.email}`,
        email: req.email,
        tenantId: req.tenantId,
        role: req.role,
        inviteCode,                              // token içinde de saklı — doğrulama için
        type: IamConstants.TOKEN.TYPE.INVITATION,
      },
      IamConstants.TOKEN.EXPIRATION.INVITATION
    );

    if (tokenResult.isFailure) {
      return AppError.UnexpectedError.create("Token generation failed");
    }

    const token = tokenResult.getValue();
    const expiresAt = new Date(Date.now() + IamConstants.TOKEN.EXPIRATION_MS.INVITATION);

    // 5. DB'ye kaydet
    const invitationResult = await this.invitationRepo.create({
      tenantId: req.tenantId,
      tenantName: req.tenantName,
      email: req.email,
      role: req.role,
      token,
      inviteCode,
      expiresAt,
    });

    if (invitationResult.isFailure) {
      return AppError.UnexpectedError.create("Failed to create invitation");
    }

    const invitation = invitationResult.getValue();

    // 6. Email gönder — URL'de inviteCode kullanılır, JWT değil
    const frontendUrl = this.appConfig.get(IamConstants.CONFIG_KEYS.FRONTEND_URL);
    const inviteLink = `${frontendUrl}/invitation/accept?code=${inviteCode}`;

    await this.notificationService.send({
      channel: NotificationChannel.EMAIL,
      recipient: req.email,
      subject: `${req.tenantName} - Davet`,
      variables: {
        inviterName: req.inviterName,
        tenantName: req.tenantName,
        role: req.role,
        inviteLink,
        expiresAt: expiresAt.toLocaleDateString('tr-TR'),
      },
      templateId: 'TENANT_INVITATION',
    });

    this.logger.info("Invitation sent", {
      email: req.email,
      tenantId: req.tenantId,
      inviteCode
    });

    return Result.ok({
      invitationId: invitation.id,
      inviteCode,
      email: req.email,
      expiresAt,
    });
  }
}