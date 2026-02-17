import { RegisterUserUseCase } from '../RegisterUserUseCase';
import { IUserRepository,ITenantRepository ,IEstateRepository,IMembershipRepository } from '../../../domain/repo/index';
import { User } from '../../../domain/User';
import { Result, Email, LocalizationService , CoreKeys } from '@ogza/core';
import { iamEn } from '../../../localization/locales/en';
import { IamKeys } from '../../../constants/IamKeys';
import { en as coreEn } from '@ogza/core';
import { IamConstants } from '../../../constants/IamConstants';

LocalizationService.setLocaleData(iamEn);
// --- 1. MOCK REPOSITORIES ---

class MockUserRepository implements IUserRepository {
  private users: User[] = [];

  async save(user: User): Promise<Result<string>> {
    this.users.push(user);
    // Simüle edilmiş DB ID'si dönüyoruz (Strapi ID'si gibi)
    return Result.ok("101"); 
  }

  async findByEmail(email: Email): Promise<Result<User>> {
    const user = this.users.find(u => u.email.equals(email));
    return user ? Result.ok(user) : Result.fail("Not found");
  }
  
  // Kullanılmayanlar
  async delete(): Promise<Result<void>> { return Result.ok(); }
  async getById(): Promise<Result<User>> { return Result.fail(""); }
  async exists(): Promise<Result<boolean>> { return Result.ok(false); }
}

class MockTenantRepository implements ITenantRepository {
  async create(props: { name: string, type: string }): Promise<Result<string>> {
    // Tenant ID dön
    return Result.ok("tenant-55");
  }
}

class MockEstateRepository implements IEstateRepository {
  async create(props: any): Promise<Result<string>> {
    // Estate ID dön
    return Result.ok("estate-99");
  }
}

class MockMembershipRepository implements IMembershipRepository {
  // Testte parametreleri kontrol etmek için çağrılan veriyi saklayalım
  public lastCall: any = null;

  async addMember(props: any): Promise<Result<void>> {
    this.lastCall = props;
    return Result.ok();
  }
}

// --- 2. TEST SENARYOLARI ---

describe('RegisterUserUseCase (Multi-tenant Logic)', () => {
  let userRepo: MockUserRepository;
  let tenantRepo: MockTenantRepository;
  let estateRepo: MockEstateRepository;
  let memberRepo: MockMembershipRepository;
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    // Her test öncesi temizle
    userRepo = new MockUserRepository();
    tenantRepo = new MockTenantRepository();
    estateRepo = new MockEstateRepository();
    memberRepo = new MockMembershipRepository();

    useCase = new RegisterUserUseCase(
      userRepo,
      tenantRepo,
      estateRepo,
      memberRepo
    );
  });

  // SENARYO A: Bireysel Hesap (Freelancer)
  it('should create correct structure for INDIVIDUAL account', async () => {
    const request = {
      email: 'freelancer@test.com',
      password: 'password123',
      firstName: 'Ali',
      lastName: 'Veli',
      accountType: IamConstants.ACCOUNT_TYPE.INDIVIDUAL as 'INDIVIDUAL'
    };

    const result = await useCase.execute(request);

    expect(result.isSuccess).toBe(true);

    // Membership Repo'ya giden veriyi kontrol et
    expect(memberRepo.lastCall).toEqual({
      userId: "101",          // UserRepo'dan dönen fake ID
      tenantId: "tenant-55",  // TenantRepo'dan dönen fake ID
      estateId: "estate-99",  // EstateRepo'dan dönen fake ID
      role: IamConstants.ROLES.OWNER
    });
  });

  // SENARYO B: Kurumsal Hesap (Holding)
  it('should create correct structure for CORPORATE account', async () => {
    const request = {
      email: 'ceo@holding.com',
      password: 'password123',
      firstName: 'Can',
      lastName: 'Bey',
      accountType: IamConstants.ACCOUNT_TYPE.CORPORATE as 'CORPORATE',
      companyName: 'Mega Holding'
    };

    const result = await useCase.execute(request);
    
    expect(result.isSuccess).toBe(true);
    // Burada aslında TenantRepo.create metodunun "Mega Holding" ile çağrıldığını 
    // spyOn ile kontrol etmek daha iyi olurdu ama şimdilik akış testi yeterli.
  });
});