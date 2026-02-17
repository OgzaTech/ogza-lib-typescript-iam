import { IUseCase, Result, Email, ITokenService , IAppConfig,INotificationService} from "@ogza/core";
import { IUserRepository } from "../../domain/repo/IUserRepository";
import { ForgotPasswordDTO } from "../dtos/index";
import { IamConstants } from "../../constants/IamConstants";

export class ForgotPasswordUseCase implements IUseCase<ForgotPasswordDTO, Result<void>> {
  constructor(
    private userRepo: IUserRepository,
    private tokenService: ITokenService,
    private appConfig: IAppConfig,
    private notificationService: INotificationService
  ) {}

  async execute(request: ForgotPasswordDTO): Promise<Result<void>> {
    const emailOrError = Email.create(request.email);
    if (emailOrError.isFailure) return Result.fail("Invalid email");

    // 1. Kullanıcı var mı?
    const userResult = await this.userRepo.findByEmail(emailOrError.getValue());
    if (userResult.isFailure) {
      // Güvenlik: Kullanıcı yoksa bile "Mail gönderildi" denir.
      // Biz şimdilik loglayıp sessizce dönelim.
      console.log(`[ForgotPassword]: Email ${request.email} not found.`);
      return Result.ok(); 
    }
    const user = userResult.getValue();

    const tokenResult = await this.tokenService.sign(
      { 
        id: user.id.toString(), 
        email: user.email.getValue(),
        type: IamConstants.TOKEN.TYPE.RESET_PASSWORD 
      }, 
      IamConstants.TOKEN.EXPIRATION.RESET_PASSWORD
    );
    if (tokenResult.isFailure) return Result.fail("Token generation failed");

    // 3. Mail Gönder (Link oluştur)
    const frontendUrl = this.appConfig.get(IamConstants.CONFIG_KEYS.FRONTEND_URL);
    const resetLink = `${frontendUrl}/reset-password?token=${tokenResult.getValue()}`;
    
    // await this.notificationService.send({
    //   templateCode: 'FORGOT_PASSWORD',
    //   recipient: {
    //     email: user.email.getValue(),
    //     phone: undefined // Telefonu varsa user.phone ekleyebilirsin
    //   },
    //   context: {
    //     name: user.firstName,
    //     link: resetLink
    //   }
    // });

    return Result.ok();
  }
}