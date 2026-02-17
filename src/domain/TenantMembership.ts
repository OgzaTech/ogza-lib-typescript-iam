import { Entity, UniqueEntityID, Result, Guard } from "@ogza/core";
import { TenantMemberStatus } from "./enums/TenantMemberStatus";

interface TenantMembershipProps {
  tenantId: string;
  userId: string;
  role: string;       // 'owner', 'admin', 'editor' vb.
  status: TenantMemberStatus;
  estateId?: string | null;
  joinedAt: Date;
  updatedAt: Date;
}

export class TenantMembership extends Entity<TenantMembershipProps> {
  
  private constructor(props: TenantMembershipProps, id?: UniqueEntityID) {
    super(props, id);
  }

  // Getter'lar
  get tenantId(): string { return this.props.tenantId; }
  get userId(): string { return this.props.userId; }
  get role(): string { return this.props.role; }
  get status(): TenantMemberStatus { return this.props.status; }


  public isOwner(): boolean {
    return this.props.role === 'owner';
  }

  public isActive(): boolean {
    return this.props.status === TenantMemberStatus.ACTIVE;
  }

  public isDeleted(): boolean {
    return this.props.status === TenantMemberStatus.DELETED;
  }

  // Statü Güncelleme (Soft Delete veya Suspend)
  public updateStatus(newStatus: TenantMemberStatus): Result<void> {
    if (this.isOwner() && newStatus === TenantMemberStatus.DELETED) {
      return Result.fail("Cannot delete the owner of the tenant.");
    }

    this.props.status = newStatus;
    this.props.updatedAt = new Date();
    return Result.ok<void>();
  }

  // --- Factory Method ---
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