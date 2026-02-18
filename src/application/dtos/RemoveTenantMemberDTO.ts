export interface RemoveTenantMemberDTO {
  tenantId: string;
  estateId?: string;
  memberId: string; // Silinecek User ID
  reason?: string;  // (Opsiyonel) Neden silindiği loglanabilir audit için
  role? : string;
}