export class IamDomainService {
  // Saf iş mantığı (Business Logic)
  public validateRoleAssignment(member: any, role: any): void {
    if (!member) throw new Error("Member not found");
    if (!role) throw new Error("Role not found");

    // Invariant: Tenant'lar eşleşmeli
    if (member.tenant?.id !== role.tenant?.id) {
      throw new Error("Security Violation: Role belongs to a different tenant.");
    }
  }
}