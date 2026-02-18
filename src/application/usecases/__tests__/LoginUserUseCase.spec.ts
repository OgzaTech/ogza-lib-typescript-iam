import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Result, IHashingService, ITokenService, LocalizationService, ILogger } from '@ogza/core';
import { en as coreEn } from '@ogza/core';
import { iamEn } from '../../../localization/locales/en';
import { LoginUserUseCase } from '../LoginUserUseCase';
import { IUserRepository } from '../../../domain/repo/IUserRepository';
import { IMembershipRepository } from '../../../domain/repo/IMembershipRepository';
import { User } from '../../../domain/User';

LocalizationService.setLocaleData({ ...coreEn, ...iamEn });

// --- Mock Servisleri ---
const mockHashingService: IHashingService = {
  hash: vi.fn(),
  compare: vi.fn()
};

const mockTokenService: ITokenService = {
  sign: vi.fn().mockResolvedValue(Result.ok('mock.jwt.token')),
  verify: vi.fn(),
  decode: vi.fn()
};

const mockMemberRepo: IMembershipRepository = {
  getUserMemberships: vi.fn().mockResolvedValue(Result.ok([
    { tenantId: 'tenant-1', tenantName: 'Test Co', roleName: 'Admin' }
  ])),
  save: vi.fn(), delete: vi.fn(), getById: vi.fn(),
  exists: vi.fn(), count: vi.fn(), findAll: vi.fn(),
  addMember: vi.fn(), getMembersByTenant: vi.fn(),
  getMemberDetailByUserIdAndTenantId: vi.fn(),
  updateMemberStatus: vi.fn(), updateRole: vi.fn(),
  getRoleWithTenant: vi.fn(), getMemberDetailById: vi.fn()
};

const mockLogger: ILogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
};

// --- Geçerli User ---
const validUser = User.create({
  email: 'test@example.com',
  password: 'password123',
  firstName: 'Ali',
  lastName: 'Veli'
}).getValue();

const makeUserRepo = (overrides: Partial<IUserRepository> = {}): IUserRepository => ({
  findByEmail: vi.fn().mockResolvedValue(Result.ok(validUser)),
  save: vi.fn().mockResolvedValue(Result.ok()),
  getById: vi.fn(),
  findAll: vi.fn(),
  findPaginated: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
  exists: vi.fn(),
  count: vi.fn(),
  ...overrides
});

const validRequest = {
  email: 'test@example.com',
  password: 'password123',
  ipAddress: '127.0.0.1',
  userAgent: 'test-agent'
};

describe('LoginUserUseCase', () => {
  let useCase: LoginUserUseCase;
  let userRepo: IUserRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    userRepo = makeUserRepo();
    vi.mocked(mockHashingService.compare).mockResolvedValue(Result.ok(true));
    useCase = new LoginUserUseCase(userRepo, mockHashingService, mockTokenService, mockMemberRepo, mockLogger);
  });

  describe('Email validasyonu', () => {
    it('geçersiz email formatında hata döner', async () => {
      const result = await useCase.execute({ ...validRequest, email: 'invalid-email' });
      expect(result.isFailure).toBe(true);
    });

    it('kayıtlı olmayan email için hata döner', async () => {
      userRepo = makeUserRepo({
        findByEmail: vi.fn().mockResolvedValue(Result.fail('Not found'))
      });
      useCase = new LoginUserUseCase(userRepo, mockHashingService, mockTokenService, mockMemberRepo, mockLogger);

      const result = await useCase.execute(validRequest);
      expect(result.isFailure).toBe(true);
      expect(result.error!.message).toBe('Invalid email or password');
    });
  });

  describe('Şifre doğrulama', () => {
    it('yanlış şifrede hata döner', async () => {
      vi.mocked(mockHashingService.compare).mockResolvedValue(Result.ok(false));

      const result = await useCase.execute(validRequest);

      expect(result.isFailure).toBe(true);
      expect(result.error!.message).toBe('Invalid email or password');
      // FailedLogin event fırlatılmalı → save çağrılmalı
      expect(userRepo.save).toHaveBeenCalled();
    });

    it('doğru şifrede başarılı login', async () => {
      const result = await useCase.execute(validRequest);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().accessToken).toBe('mock.jwt.token');
    });
  });

  describe('Token ve tenant', () => {
    it('login response doğru alanları içerir', async () => {
      const result = await useCase.execute(validRequest);
      const value = result.getValue();

      expect(value.accessToken).toBeDefined();
      expect(value.user.email).toBe('test@example.com');
      expect(value.availableTenants).toHaveLength(1);
      expect(value.currentTenant.id).toBe('tenant-1');
    });

    it('tenant\'sız kullanıcı için fallback tenant döner', async () => {
      const noTenantMemberRepo = {
        ...mockMemberRepo,
        getUserMemberships: vi.fn().mockResolvedValue(Result.ok([]))
      };
      useCase = new LoginUserUseCase(userRepo, mockHashingService, mockTokenService, noTenantMemberRepo, mockLogger);

      const result = await useCase.execute(validRequest);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().currentTenant.id).toBe('0');
    });
  });
});