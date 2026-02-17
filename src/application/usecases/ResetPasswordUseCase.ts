import { IUseCase, Result, ITokenService, IHashingService, ICancellationToken, CancellationToken } from "@ogza/core";
import { IUserRepository } from "../../domain/repo/IUserRepository";
import { ResetPasswordDTO } from "../dtos/index";
import { IamConstants } from "../../constants/IamConstants";
import { UserPassword } from "../../domain/UserPassword";

export class ResetPasswordUseCase implements IUseCase<ResetPasswordDTO, Result<void>> {
  constructor(
    private userRepo: IUserRepository,
    private tokenService: ITokenService,
    private hashingService: IHashingService
  ) {}

  async execute(request: ResetPasswordDTO,cancellationToken: ICancellationToken = CancellationToken.None): Promise<Result<void>> {

    cancellationToken.throwIfCancellationRequested();
    
    // 1. Token Doğrulama (Aynı kalacak)
    const verifyResult = await this.tokenService.verify(request.token);
    if (verifyResult.isFailure) return Result.fail("Invalid or expired token");
    
    const payload = verifyResult.getValue();
    if (payload.type !== IamConstants.TOKEN.TYPE.RESET_PASSWORD) {
        return Result.fail("Invalid token type");
    }

    // 2. Kullanıcıyı Bul (Aynı kalacak)
    // payload.userId string olduğu için Number'a çevirmek gerekebilir veya repo string alıyordur
    const userResult = await this.userRepo.getById(payload.userId); 
    if (userResult.isFailure) return Result.fail("User not found");
    const user = userResult.getValue();

    // -----------------------------------------------------------
    // 3. ŞİFRE DEĞİŞİMİ (HATA BURADAYDI - DÜZELTİLDİ)
    // -----------------------------------------------------------
    
    // A. Ham şifreyi Hashle (Promise<Result<string>>)
    const hashedPasswordResult = await this.hashingService.hash(request.newPassword);
    if (hashedPasswordResult.isFailure) {
        return Result.fail(hashedPasswordResult.error!!);
    }
    const hashedPasswordString = hashedPasswordResult.getValue(); // String'i aldık

    // B. Value Object Oluştur
    const passwordOrError = UserPassword.create({
        value: hashedPasswordString,
        hashed: true // Bu bir hash'tir, tekrar validasyona sokma
    });

    if (passwordOrError.isFailure) {
        return Result.fail(passwordOrError.error!!);
    }
    const passwordVO = passwordOrError.getValue();

    // C. Entity Üzerinde Değişikliği Uygula
    user.changePassword(passwordVO);

    // -----------------------------------------------------------

    // 4. Kaydet
    await this.userRepo.save(user);

    return Result.ok();
  }
}