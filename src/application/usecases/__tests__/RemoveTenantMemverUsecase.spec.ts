import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Result, ILogger } from '@ogza/core';
import { RemoveTenantMemberUseCase } from '../RemoveTenantMemberUseCase';
import { IMembershipRepository } from '../../../domain/repo/IMembershipRepository';
import { TenantMemberStatus } from '../../../shared/enums/TenantMemberStatus';
import { TenantMemberDTO } from '../../../shared/dtos/index';

// --- Mock Logger ---
const mockLogger: ILogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
};

// --- Mock Repository ---
const makeMockRepo = (overrides: Partial<IMembershipRepository> = {}): IMembershipRepository => ({
  getMemberDetailByUserIdAndTenantId: vi.fn(),
  updateMemberStatus: vi.fn().mockResolvedValue(Result.ok()),
  // IRepository zorunlu metotlar
  save: vi.fn(),
  delete: vi.fn(),
  getById: vi.fn(),
  exists: vi.fn(),
  count: vi.fn(),
  findAll: vi.fn(),
  // Diğer membership metotlar
  addMember: vi.fn(),
  getMembersByTenant: vi.fn(),
  getUserMemberships: vi.fn(),
  updateRole: vi.fn(),
  getRoleWithTenant: vi.fn(),
  getMemberDetailById: vi.fn(),
  ...overrides
});

// --- Test Verisi ---
const activeMember: TenantMemberDTO = {
  tenantId: 'tenant-1',
  memberId: 'member-1',
  userId: 'user-1',
  firstName: 'Ali',
  lastName: 'Veli',
  email: 'ali@test.com',
  role: 'Member',
  status: TenantMemberStatus.ACTIVE,
  joinedAt: new Date()
};

const ownerMember: TenantMemberDTO = {
  ...activeMember,
  role: 'Owner'
};

const deletedMember: TenantMemberDTO = {
  ...activeMember,
  status: TenantMemberStatus.DELETED
};

describe('RemoveTenantMemberUseCase', () => {
  let useCase: RemoveTenantMemberUseCase;
  let repo: IMembershipRepository;

  beforeEach(() => {
    repo = makeMockRepo();
    useCase = new RemoveTenantMemberUseCase(repo, mockLogger);
  });

  describe('Input validasyonu', () => {
    it('tenantId eksikse hata döner', async () => {
      const result = await useCase.execute({ tenantId: '', memberId: 'member-1' });
      expect(result.isFailure).toBe(true);
    });

    it('memberId eksikse hata döner', async () => {
      const result = await useCase.execute({ tenantId: 'tenant-1', memberId: '' });
      expect(result.isFailure).toBe(true);
    });
  });

  describe('Üye bulunamadı', () => {
    it('üye yoksa NotFound hatası döner', async () => {
      repo = makeMockRepo({
        getMemberDetailByUserIdAndTenantId: vi.fn().mockResolvedValue(Result.fail('Not found'))
      });
      useCase = new RemoveTenantMemberUseCase(repo, mockLogger);

      const result = await useCase.execute({ tenantId: 'tenant-1', memberId: 'user-1' });

      expect(result.isFailure).toBe(true);
      expect(result.error!.message).toContain('not found');
    });
  });

  describe('Domain kuralları', () => {
    it('Owner silinemez', async () => {
      repo = makeMockRepo({
        getMemberDetailByUserIdAndTenantId: vi.fn().mockResolvedValue(Result.ok(ownerMember))
      });
      useCase = new RemoveTenantMemberUseCase(repo, mockLogger);

      const result = await useCase.execute({ tenantId: 'tenant-1', memberId: 'user-1' });

      expect(result.isFailure).toBe(true);
      expect(result.error!.message).toContain('Owner');
      // Repo'ya hiç yazılmamalı
      expect(repo.updateMemberStatus).not.toHaveBeenCalled();
    });

    it('Zaten silinmiş üye tekrar silinemez', async () => {
      repo = makeMockRepo({
        getMemberDetailByUserIdAndTenantId: vi.fn().mockResolvedValue(Result.ok(deletedMember))
      });
      useCase = new RemoveTenantMemberUseCase(repo, mockLogger);

      const result = await useCase.execute({ tenantId: 'tenant-1', memberId: 'user-1' });

      expect(result.isFailure).toBe(true);
      expect(result.error!.message).toContain('already deleted');
      expect(repo.updateMemberStatus).not.toHaveBeenCalled();
    });
  });

  describe('Başarılı silme', () => {
    it('aktif üye başarıyla silinir', async () => {
      repo = makeMockRepo({
        getMemberDetailByUserIdAndTenantId: vi.fn().mockResolvedValue(Result.ok(activeMember))
      });
      useCase = new RemoveTenantMemberUseCase(repo, mockLogger);

      const result = await useCase.execute({ tenantId: 'tenant-1', memberId: 'user-1' });

      expect(result.isSuccess).toBe(true);
      expect(repo.updateMemberStatus).toHaveBeenCalledWith(
        'tenant-1',
        'user-1',
        TenantMemberStatus.DELETED
      );
    });
  });
});