export interface LoginUserDTO {
  email: string;
  password: string;
  ipAddress: string; // Audit Log için gerekli teknik veriler (Controller'dan gelecek)
  userAgent: string;// Audit Log için gerekli teknik veriler (Controller'dan gelecek)
  invalidateAllSessions?: boolean;    // Diğer oturumları kapatayım mı?
}

