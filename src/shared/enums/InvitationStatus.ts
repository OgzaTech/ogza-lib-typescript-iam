export enum InvitationStatus {
  PENDING  = 'PENDING',   // Gönderildi, bekleniyor
  ACCEPTED = 'ACCEPTED',  // Kabul edildi
  EXPIRED  = 'EXPIRED',   // Süresi doldu
  REVOKED  = 'REVOKED',   // İptal edildi
}