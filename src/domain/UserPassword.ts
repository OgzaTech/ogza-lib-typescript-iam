import { ValueObject, Result, Guard, LocalizationService } from "@ogza/core";
import { IamConstants } from "../constants/IamConstants";
import { IamKeys } from "../constants/IamKeys";

export interface UserPasswordProps {
  value: string;
  hashed: boolean;
  salt?: string; // Payload pbkdf2 için
}

export class UserPassword extends ValueObject<UserPasswordProps> {

  private constructor(props: UserPasswordProps) {
    super(props);
  }

  public static createRaw(password: string): Result<UserPassword> {
    const nullCheck = Guard.againstNullOrUndefined(password, 'password');
    if (nullCheck.isFailure) return Result.fail(nullCheck.error!);

    if (password.length < IamConstants.PASSWORD.MIN_LENGTH) {
      return Result.fail<UserPassword>(
        LocalizationService.t(IamKeys.PASSWORD.TOO_SHORT)
      );
    }

    return Result.ok(new UserPassword({ value: password, hashed: false }));
  }

  public static create(props: UserPasswordProps): Result<UserPassword> {
    const guardResult = Guard.combine([
      Guard.againstNullOrUndefined(props.value, 'password'),
      !props.hashed ? Guard.againstAtLeast(6, props.value) : Result.ok()
    ]);

    if (guardResult.isFailure) {
      return Result.fail<UserPassword>(guardResult.error!!);
    }

    return Result.ok<UserPassword>(new UserPassword({
      value: props.value,
      hashed: !!props.hashed,
      salt: props.salt
    }));
  }

  public static createHashed(hashedPassword: string, salt?: string): Result<UserPassword> {
    return Result.ok(new UserPassword({ value: hashedPassword, hashed: true, salt }));
  }

  public isHashed(): boolean {
    return this.props.hashed;
  }

  public static createWithSalt(hash: string, salt: string): Result<UserPassword> {
    return Result.ok(new UserPassword({ value: hash, hashed: true, salt }))
  }

  public getSalt(): string | undefined {
    return (this.props as any).salt
  }
}