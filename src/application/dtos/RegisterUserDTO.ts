export interface RegisterUserDTO {
  email: string;
  password: string; 
  firstName: string;
  lastName: string;
  accountType: 'INDIVIDUAL' | 'CORPORATE'; // Kullanıcı seçer
  companyName?: string; // Sadece Corporate ise dolu gelir
}