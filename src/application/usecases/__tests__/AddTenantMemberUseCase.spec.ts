import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Result, LocalizationService } from '@ogza/core';
import { en as coreEn } from '@ogza/core';
import { iamEn } from '../../../localization/locales/en';
import { AddTenantMemberUseCase } from '../AddTenantMemberUseCase';
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { IMembershipRepository } from '../../../domain/repo/IMembershipRepository';
import { User } from '../../../domain/User';
import { TenantMemberStatus } from '../../../shared/enums/TenantMemberStatus';

LocalizationService.setLocaleData({ ...coreEn, ...iamEn });

const existingUser = User.create({
  email: 'existing@test.com',
  password: 'password123',
  firstName: 'Ali',
  lastName: 'Veli'
}).getValue();

const makeUserRepo = (overrides: Partial<IUserRepository> = {}): IUserRepository => ({
  findByEmail: vi.fn().mockResolvedValue(Result.ok(existingUser)),
  save: vi.fn(), getById: vi.fn(), findAll: vi.fn(),
  findPaginated: vi.fn(), create: vi.fn(),
  delete: vi.fn(), exists: vi.fn(), count: vi.fn(),
  ...overrides
});

const makeMemberRepo = (overrides: Partial<IMembershipRepository> = {}): IMembershipRepository => ({
  getMemberDetailByUserIdAndTenantId: vi.fn().mockResolvedValue(Result.fail('Not found')),
  addMember: vi.fn().mockResolvedValue(Result.ok()),
  save: vi.fn(), delete: vi.fn(), getById: vi.fn(),
  exists: vi.fn(), count: vi.fn(), findAll: vi.fn(),
  getMembersByTenant: vi.fn(), getUserMemberships: vi.fn(),
  updateMemberStatus: vi.fn(), updateRole: vi.fn(),
  getRoleWithTenant: vi.fn(), getMemberDetailById: vi.fn(),
  ...overrides
});

const mockLogger = {
  info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn()
};

const validRequest = {
  tenantId: 'tenant-1',
  email: 'existing@test.com',
  firstName: 'Ali',
  lastName: 'Veli',
  role: 'Member'
};

describe('AddTenantMemberUseCase', () => {
  let useCase: AddTenantMemberUseCase;
  let userRepo: IUserRepository;
  let memberRepo: IMembershipRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    userRepo = makeUserRepo();
    memberRepo = makeMemberRepo();
    useCase = new AddTenantMemberUseCase(userRepo, memberRepo, mockLogger);
  });

  describe('Input validasyonu', () => {
    it('tenantId eksikse hata döner', async () => {
      const result = await useCase.execute({ ...validRequest, tenantId: '' });
      expect(result.isFailure).toBe(true);
    });

    it('geçersiz email formatında hata döner', async () => {
      const result = await useCase.execute({ ...validRequest, email: 'invalid' });
      expect(result.isFailure).toBe(true);
    });
  });

  describe('Kullanıcı bulunamadı', () => {
    it('sistemde olmayan kullanıcı eklenemez — invite flow yönlendirmesi', async () => {
      userRepo = makeUserRepo({
        findByEmail: vi.fn().mockResolvedValue(Result.fail('Not found'))
      });
      useCase = new AddTenantMemberUseCase(userRepo, memberRepo, mockLogger);

      const result = await useCase.execute(validRequest);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('invite flow');
    });
  });

  describe('Duplicate üyelik', () => {
    it('zaten üye olan kullanıcı tekrar eklenemez', async () => {
      memberRepo = makeMemberRepo({
        getMemberDetailByUserIdAndTenantId: vi.fn().mockResolvedValue(
          Result.ok({ role: 'Member', status: TenantMemberStatus.ACTIVE })
        )
      });
      useCase = new AddTenantMemberUseCase(userRepo, memberRepo, mockLogger);

      const result = await useCase.execute(validRequest);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('already a member');
      expect(memberRepo.addMember).not.toHaveBeenCalled();
    });
  });

  describe('Başarılı ekleme', () => {
    it('mevcut kullanıcı tenant\'a eklenir', async () => {
      const result = await useCase.execute(validRequest);

      expect(result.isSuccess).toBe(true);
      expect(memberRepo.addMember).toHaveBeenCalledWith({
        userId: existingUser.id.toString(),
        tenantId: 'tenant-1',
        role: 'Member',
        estateId: undefined,
        memberStatus: TenantMemberStatus.ACTIVE
      });
    });
  });
});