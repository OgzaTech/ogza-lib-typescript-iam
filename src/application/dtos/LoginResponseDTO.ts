import { TenantSummary } from '../../domain/types/TenantSummary';

export interface LoginResponseDTO {
  accessToken: string;
  refreshToken?: string;
  availableTenants: TenantSummary[];
  currentTenant: TenantSummary;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}