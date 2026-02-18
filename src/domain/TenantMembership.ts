import { Entity, UniqueEntityID, Result, Guard, StructuredError, AppError } from "@ogza/core";
import { TenantMemberStatus } from "../shared/enums/TenantMemberStatus";
import { IamConstants } from "../constants/IamConstants";

interface TenantMembershipProps {
  tenantId: string;
  userId: string;
  role: string;
  status: TenantMemberStatus;
  estateId?: string | null;
  joinedAt: Date;
  updatedAt: Date;
}

export class TenantMembership extends Entity<TenantMembershipProps> {

  private constructor(props: TenantMembershipProps, id?: UniqueEntityID) {
    super(props, id);
  }

  get tenantId(): string { return this.props.tenantId; }
  get userId(): string { return this.props.userId; }
  get role(): string { return this.props.role; }
  get status(): TenantMemberStatus { return this.props.status; }

  public isOwner(): boolean {
    return this.props.role === IamConstants.ROLES.OWNER;
  }

  public isActive(): boolean {
    return this.props.status === TenantMemberStatus.ACTIVE;
  }

  public isDeleted(): boolean {
    return this.props.status === TenantMemberStatus.DELETED;
  }

  // Tüm domain kuralları burada — use case tekrar yazmaz
  public updateStatus(newStatus: TenantMemberStatus): Result<void, StructuredError> {
    if (this.isDeleted()) {
      return AppError.InvalidOperation.create("Member is already deleted.");
    }

    // Owner sadece silinemez, suspend edilebilir
    if (this.isOwner() && newStatus === TenantMemberStatus.DELETED) {
      return AppError.InvalidOperation.create("Firma kurucusu (Owner) firmadan çıkarılamaz!");
    }

    this.props.status = newStatus;
    this.props.updatedAt = new Date();
    return Result.ok<void>();
  }

  public static create(props: TenantMembershipProps, id?: UniqueEntityID): Result<TenantMembership> {
    const guardResult = Guard.combine([
      Guard.should(!!props.tenantId, "Tenant ID is required"),
      Guard.should(!!props.userId, "User ID is required"),
      Guard.should(!!props.role, "Role is required"),
    ]);

    if (!guardResult.isSuccess) {
      return Result.fail<TenantMembership>(guardResult.error!);
    }

    return Result.ok<TenantMembership>(new TenantMembership(props, id));
  }
}
