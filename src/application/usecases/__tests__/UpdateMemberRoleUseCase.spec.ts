import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Result, ILogger } from '@ogza/core';
import { UpdateMemberRoleUseCase } from '../UpdateMemberRoleUseCase';
import { IMembershipRepository } from '../../../domain/repo/IMembershipRepository';
import { TenantMemberStatus } from '../../../shared/enums/TenantMemberStatus';
import { TenantMemberDTO, RoleDetailsDTO } from '../../../shared/dtos/index';


// --- Mock Logger ---
const mockLogger: ILogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
};

// --- Test Verisi ---
const member: TenantMemberDTO = {
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

const adminRole = { id: 2, name: 'Admin', tenantId: 'tenant-1' };
const ownerRole = { id: 1, name: 'Owner', tenantId: 'tenant-1' };
const otherTenantRole = { id: 3, name: 'Admin', tenantId: 'tenant-99' };

const makeMockRepo = (overrides: Partial<IMembershipRepository> = {}): IMembershipRepository => ({
  getMemberDetailById: vi.fn().mockResolvedValue(Result.ok(member)),
  getRoleWithTenant: vi.fn().mockResolvedValue(Result.ok(adminRole)),
  updateRole: vi.fn().mockResolvedValue(Result.ok()),
  // IRepository
  save: vi.fn(),
  delete: vi.fn(),
  getById: vi.fn(),
  exists: vi.fn(),
  count: vi.fn(),
  findAll: vi.fn(),
  // Diğerleri
  addMember: vi.fn(),
  getMembersByTenant: vi.fn(),
  getMemberDetailByUserIdAndTenantId: vi.fn(),
  getUserMemberships: vi.fn(),
  updateMemberStatus: vi.fn(),
  ...overrides
});

describe('UpdateMemberRoleUseCase', () => {
  let useCase: UpdateMemberRoleUseCase;
  let repo: IMembershipRepository;

  beforeEach(() => {
    repo = makeMockRepo();
    useCase = new UpdateMemberRoleUseCase(repo, mockLogger);
  });

  describe('Input validasyonu', () => {
    it('tenantId eksikse hata döner', async () => {
      const result = await useCase.execute({ tenantId: '', memberId: 1, newRoleId: 2 });
      expect(result.isFailure).toBe(true);
    });

    it('memberId eksikse hata döner', async () => {
      const result = await useCase.execute({ tenantId: 'tenant-1', memberId: 0, newRoleId: 2 });
      expect(result.isFailure).toBe(true);
    });
  });

  describe('Domain kuralları', () => {
    it('Owner rolü atanamaz', async () => {
      repo = makeMockRepo({
        getRoleWithTenant: vi.fn().mockResolvedValue(Result.ok(ownerRole))
      });
      useCase = new UpdateMemberRoleUseCase(repo, mockLogger);

      const result = await useCase.execute({ tenantId: 'tenant-1', memberId: 1, newRoleId: 1 });

      expect(result.isFailure).toBe(true);
      expect(result.error!.message).toContain('Owner');
      expect(repo.updateRole).not.toHaveBeenCalled();
    });

    it('Farklı tenant\'ın rolü atanamaz', async () => {
      repo = makeMockRepo({
        getRoleWithTenant: vi.fn().mockResolvedValue(Result.ok(otherTenantRole))
      });
      useCase = new UpdateMemberRoleUseCase(repo, mockLogger);

      const result = await useCase.execute({ tenantId: 'tenant-1', memberId: 1, newRoleId: 3 });

      expect(result.isFailure).toBe(true);
      expect(result.error!.message).toContain('different tenant');
      expect(repo.updateRole).not.toHaveBeenCalled();
    });
  });

  describe('Bulunamama senaryoları', () => {
    it('Üye bulunamazsa NotFound döner', async () => {
      repo = makeMockRepo({
        getMemberDetailById: vi.fn().mockResolvedValue(Result.fail('Not found'))
      });
      useCase = new UpdateMemberRoleUseCase(repo, mockLogger);

      const result = await useCase.execute({ tenantId: 'tenant-1', memberId: 1, newRoleId: 2 });

      expect(result.isFailure).toBe(true);
      expect(result.error!.message).toContain('not found');
    });

    it('Rol bulunamazsa NotFound döner', async () => {
      repo = makeMockRepo({
        getRoleWithTenant: vi.fn().mockResolvedValue(Result.fail('Not found'))
      });
      useCase = new UpdateMemberRoleUseCase(repo, mockLogger);

      const result = await useCase.execute({ tenantId: 'tenant-1', memberId: 1, newRoleId: 99 });

      expect(result.isFailure).toBe(true);
    });
  });

  describe('Başarılı güncelleme', () => {
    it('geçerli role başarıyla atanır', async () => {
      const result = await useCase.execute({ tenantId: 'tenant-1', memberId: 1, newRoleId: 2 });

      console.log('result.isSuccess:', result.isSuccess);
      console.log('result.isFailure:', result.isFailure);
      console.log('result.error:', result.error);

      expect(result.isSuccess).toBe(true);
      expect(repo.updateRole).toHaveBeenCalledWith(1, 2);
    });
  });
});