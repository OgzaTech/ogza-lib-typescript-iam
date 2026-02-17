import { AggregateRoot, UniqueEntityID, Result, Guard, Email, TenantId } from "@ogza/core";
import { UserPassword } from "./UserPassword";
import { UserLoggedInEvent } from "./events/UserLoggedInEvent";
import { UserLoginFailedEvent } from "./events/UserLoginFailedEvent";

interface UserProps {
  email: Email;
  password: UserPassword;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  isActive: boolean;
  lastLogin?: Date;
  role: string;
}

export class User extends AggregateRoot<UserProps> {
  
  private constructor(props: UserProps, id?: UniqueEntityID) {
    super(props, id);
  }

  public static create(
    props: {
      email: string;
      password?: string; // DB'den gelirken hashli gelebilir, yeni yaratırken raw
      firstName: string;
      lastName: string;
      isActive?: boolean;
      role?: string;
    },
    id?: UniqueEntityID
  ): Result<User> {
    

    // 1. Email Validasyonu (Core'daki yapıyı kullanıyor)
    const emailOrError = Email.create(props.email);
    if (emailOrError.isFailure) return Result.fail(emailOrError.error!);

    // 2. Password (Opsiyonel olabilir, örn: Google Login)
    const passwordOrError = UserPassword.createRaw(props.password || "default123"); 
    // Not: Gerçek senaryoda burası daha kompleks olur (Factory ayrımı)
    if (passwordOrError.isFailure) return Result.fail(passwordOrError.error!);

    // 3. İsim Validasyonu
    const guardResult = Guard.againstNullOrUndefinedBulk([
      { argument: props.firstName, argumentName: 'firstName' },
      { argument: props.lastName, argumentName: 'lastName' }
    ]);
    if (guardResult.isFailure) return Result.fail(guardResult.error!);

    const user = new User({
      email: emailOrError.getValue(),
      password: passwordOrError.getValue(),
      firstName: props.firstName,
      lastName: props.lastName,
      isEmailVerified: false,
      role: props.role || 'Member', 
      isActive: props.isActive ?? true
    }, id);

    // Domain Event ekleyebiliriz: UserCreated
    // user.addDomainEvent(new UserCreatedEvent(user));

    return Result.ok(user);
  }

  // İş Kuralları (Business Rules)
  public changePassword(newPassword: UserPassword): void {
    this.props.password = newPassword;
    // Event: PasswordChanged. this.addDomainEvent(new UserPasswordChangedEvent(this));
  }
  
  get id(): UniqueEntityID {
    return this._id;
  }
  get email(): Email { return this.props.email; }
  get firstName(): string { return this.props.firstName; }
  get lastName(): string { return this.props.lastName; }
  get role(): string { return this.props.role; }
  get isActive(): boolean { return this.props.isActive; }
  get fullName(): string {
    return `${this.props.firstName} ${this.props.lastName}`;
  }

  public login(ip: string, agent: string, invalidateOthers: boolean): void {

    this.addDomainEvent(new UserLoggedInEvent(
      this, 
      ip, 
      agent, 
      invalidateOthers
    ));
  }

  public failedLogin(ip: string, agent: string, reason: string): void {
    // İleride burada "failedAttempts" sayacını artırıp kullanıcıyı kilitleyebilirsin.
    // this.props.failedAttempts++;
    
    this.addDomainEvent(new UserLoginFailedEvent(
      this,
      ip,
      agent,
      reason
    ));
  }
}