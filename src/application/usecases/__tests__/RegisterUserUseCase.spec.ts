import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Result, LocalizationService, IUnitOfWork } from '@ogza/core';
import { en as coreEn } from '@ogza/core';
import { iamEn } from '../../../localization/locales/en';
import { RegisterUserUseCase, RoleConfigDefinition } from '../RegisterUserUseCase';
import { IUserRepository, ITenantRepository, IEstateRepository, IMembershipRepository, IRoleRepository } from '../../../domain/repo/index';
import { User } from '../../../domain/User';
import { IamConstants } from '../../../constants/IamConstants';
import { TenantMemberStatus } from '../../../shared/enums/TenantMemberStatus';

LocalizationService.setLocaleData({ ...coreEn, ...iamEn });

const mockLogger = {
  info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn()
};

const mockUnitOfWork: IUnitOfWork = {
  begin: vi.fn().mockResolvedValue(Result.ok()),
  commit: vi.fn().mockResolvedValue(Result.ok()),
  rollback: vi.fn().mockResolvedValue(Result.ok()),
  isActive: vi.fn().mockReturnValue(false),
  execute: vi.fn().mockImplementation(
    async (work: () => Promise<Result<any>>) => work()
  )
};

const defaultRolesConfig: RoleConfigDefinition[] = [
  { name: 'Owner', description: 'Owner role', permissions: ['*'], isDefault: false },
  { name: 'Admin', description: 'Admin role', permissions: ['read', 'write'], isDefault: false },
  { name: 'Member', description: 'Member role', permissions: ['read'], isDefault: true }
];

const makeUserRepo = (overrides: Partial<IUserRepository> = {}): IUserRepository => ({
  findByEmail: vi.fn().mockResolvedValue(Result.fail('Not found')),
  save: vi.fn().mockResolvedValue(Result.ok<void>()),
  create: vi.fn().mockResolvedValue(Result.ok(
    User.create({ email: 'test@test.com', password: 'pass123', firstName: 'A', lastName: 'B' }).getValue()
  )),
  getById: vi.fn(), findAll: vi.fn(), findPaginated: vi.fn(),
  delete: vi.fn(), exists: vi.fn(), count: vi.fn(),
  ...overrides
} as IUserRepository);

const makeTenantRepo = (): ITenantRepository => ({
  create: vi.fn().mockResolvedValue(Result.ok('tenant-55')),
  save: vi.fn(), delete: vi.fn(), getById: vi.fn(),
  exists: vi.fn(), count: vi.fn(), findAll: vi.fn()
} as ITenantRepository);

const makeEstateRepo = (): IEstateRepository => ({
  create: vi.fn().mockResolvedValue(Result.ok('estate-99')),
  save: vi.fn(), delete: vi.fn(), getById: vi.fn(),
  exists: vi.fn(), count: vi.fn(), findAll: vi.fn()
} as IEstateRepository);

const makeMemberRepo = (): IMembershipRepository => ({
  addMember: vi.fn().mockResolvedValue(Result.ok()),
  save: vi.fn(), delete: vi.fn(), getById: vi.fn(),
  exists: vi.fn(), count: vi.fn(), findAll: vi.fn(),
  getMembersByTenant: vi.fn(), getMemberDetailByUserIdAndTenantId: vi.fn(),
  getUserMemberships: vi.fn(), updateMemberStatus: vi.fn(),
  updateRole: vi.fn(), getRoleWithTenant: vi.fn(), getMemberDetailById: vi.fn()
} as IMembershipRepository);

const makeRoleRepo = (): IRoleRepository => ({
  create: vi.fn()
    .mockResolvedValueOnce(Result.ok('role-owner-1'))
    .mockResolvedValueOnce(Result.ok('role-admin-2'))
    .mockResolvedValueOnce(Result.ok('role-member-3')),
  findByName: vi.fn(), findAllByTenantId: vi.fn(),
  save: vi.fn(), delete: vi.fn(), getById: vi.fn(),
  exists: vi.fn(), count: vi.fn(), findAll: vi.fn()
} as IRoleRepository);

describe('RegisterUserUseCase', () => {
  let userRepo: IUserRepository;
  let tenantRepo: ITenantRepository;
  let estateRepo: IEstateRepository;
  let memberRepo: IMembershipRepository;
  let roleRepo: IRoleRepository;
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    userRepo = makeUserRepo();
    tenantRepo = makeTenantRepo();
    estateRepo = makeEstateRepo();
    memberRepo = makeMemberRepo();
    roleRepo = makeRoleRepo();
    useCase = new RegisterUserUseCase(
      userRepo, tenantRepo, estateRepo, memberRepo, roleRepo,
      defaultRolesConfig, mockLogger, mockUnitOfWork
    );
  });

  describe('Email validasyonu', () => {
    it('geçersiz email formatında hata döner', async () => {
      const result = await useCase.execute({
        email: 'invalid-email', password: 'pass123',
        firstName: 'Ali', lastName: 'Veli', accountType: 'INDIVIDUAL'
      });
      expect(result.isFailure).toBe(true);
    });

    it('zaten kayıtlı email ile kayıt olunamaz', async () => {
      userRepo = makeUserRepo({
        findByEmail: vi.fn().mockResolvedValue(Result.ok(
          User.create({ email: 'test@test.com', password: 'pass123', firstName: 'A', lastName: 'B' }).getValue()
        ))
      });
      useCase = new RegisterUserUseCase(
        userRepo, tenantRepo, estateRepo, memberRepo, roleRepo,
        defaultRolesConfig, mockLogger, mockUnitOfWork
      );
      const result = await useCase.execute({
        email: 'test@test.com', password: 'pass123',
        firstName: 'Ali', lastName: 'Veli', accountType: 'INDIVIDUAL'
      });
      expect(result.isFailure).toBe(true);
    });
  });

  describe('Transaction yönetimi', () => {
    it('başarılı kayıtta unitOfWork.execute çağrılır', async () => {
      await useCase.execute({
        email: 'new@test.com', password: 'password123',
        firstName: 'Ali', lastName: 'Veli', accountType: 'INDIVIDUAL'
      });
      expect(mockUnitOfWork.execute).toHaveBeenCalledTimes(1);
    });

    it('validasyon hatasında transaction başlatılmaz', async () => {
      await useCase.execute({
        email: 'invalid-email', password: 'pass123',
        firstName: 'Ali', lastName: 'Veli', accountType: 'INDIVIDUAL'
      });
      expect(mockUnitOfWork.execute).not.toHaveBeenCalled();
    });
  });

  describe('INDIVIDUAL hesap', () => {
    it('başarıyla oluşturulur', async () => {
      const result = await useCase.execute({
        email: 'freelancer@test.com', password: 'password123',
        firstName: 'Ali', lastName: 'Veli',
        accountType: IamConstants.ACCOUNT_TYPE.INDIVIDUAL as 'INDIVIDUAL'
      });
      expect(result.isSuccess).toBe(true);
      expect(memberRepo.addMember).toHaveBeenCalledWith(expect.objectContaining({
        tenantId: 'tenant-55',
        estateId: 'estate-99',
        memberStatus: TenantMemberStatus.ACTIVE
      }));
    });
  });

  describe('CORPORATE hesap', () => {
    it('başarıyla oluşturulur', async () => {
      const result = await useCase.execute({
        email: 'ceo@holding.com', password: 'password123',
        firstName: 'Can', lastName: 'Bey',
        accountType: IamConstants.ACCOUNT_TYPE.CORPORATE as 'CORPORATE',
        companyName: 'Mega Holding'
      });
      expect(result.isSuccess).toBe(true);
      expect(tenantRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Mega Holding', type: 'CORPORATE' })
      );
    });
  });

  describe('Owner role kritik kontrolü', () => {
    it('Owner role oluşturulamazsa kayıt başarısız olur', async () => {
      roleRepo = { ...makeRoleRepo(), create: vi.fn().mockResolvedValue(Result.fail('DB error')) };
      useCase = new RegisterUserUseCase(
        userRepo, tenantRepo, estateRepo, memberRepo, roleRepo,
        defaultRolesConfig, mockLogger, mockUnitOfWork
      );
      const result = await useCase.execute({
        email: 'test@test.com', password: 'password123',
        firstName: 'Ali', lastName: 'Veli', accountType: 'INDIVIDUAL'
      });
      expect(result.isFailure).toBe(true);
    });
  });
});