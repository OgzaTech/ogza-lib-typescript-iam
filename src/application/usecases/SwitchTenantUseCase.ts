import { IUseCase, Result, AppError, ITokenService } from "@ogza/core";
import { IMembershipRepository } from "../../domain/repo/IMembershipRepository";
import { IUserRepository } from "../../domain/repo/IUserRepository"; // User bilgilerini almak için
import { TenantSummary } from "../../domain/types/TenantSummary";
import { IRoleRepository } from "../../domain/repo";

interface SwitchTenantRequest {
  userId: string;
  targetTenantId: string;
}

interface SwitchTenantResponse {
  accessToken: string;
  tenant: TenantSummary;
}

export class SwitchTenantUseCase implements IUseCase<SwitchTenantRequest, Result<SwitchTenantResponse>> {
  constructor(
    private memberRepo: IMembershipRepository,
    private tokenService: ITokenService,
    private userRepo: IUserRepository,
    private roleRepo: IRoleRepository
  ) {}

  async execute(req: SwitchTenantRequest): Promise<Result<SwitchTenantResponse>> {
    // 1. Kullanıcının tüm üyeliklerini çek
    const membershipsResult = await this.memberRepo.getUserMemberships(req.userId);
    if (membershipsResult.isFailure) return Result.fail("Üyelik bilgileri alınamadı.");

    const memberships = membershipsResult.getValue();

    // 2. Hedef firmaya üye mi kontrol et
    const targetMembership = memberships.find(m => m.tenantId === req.targetTenantId);

    if (!targetMembership) {
      return Result.fail("Bu firmaya geçiş yetkiniz yok.");
    }

    // 3. Kullanıcı detaylarını al (Token için gerekli: email, fullName vb.)
    const userResult = await this.userRepo.getById(req.userId);
    if (userResult.isFailure) return Result.fail("Kullanıcı bulunamadı.");
    const user = userResult.getValue();

    // 3. YENİ: HEDEF FİRMADAKİ YETKİLERİ BUL
    const roleResult = await this.roleRepo.findByName(targetMembership.tenantId, targetMembership.roleName);
    let newPermissions: string[] = [];
    
    if (roleResult.isSuccess) {
        const roleData = roleResult.getValue();
        // Strapi permission yapısına göre değişir ama genelde string array saklıyoruz
        newPermissions = roleData.permissions || [];
    }

    // 4. YENİ TOKEN ÜRET (Payload içinde tenantId değişecek!)
    const tokenResult = await this.tokenService.sign({
      id: user.id.toString(),
      email: user.props.email.getValue().toString(),
      tenantId: targetMembership.tenantId, 
      role: targetMembership.roleName      
    });

    if (tokenResult.isFailure) {
      return Result.fail(tokenResult.error!);
    }

    const newToken = tokenResult.getValue();

    return Result.ok({
      accessToken: newToken,
      tenant: {
        id: targetMembership.tenantId,
        name: targetMembership.tenantName,
        role: targetMembership.roleName
      }
    });
  }
}