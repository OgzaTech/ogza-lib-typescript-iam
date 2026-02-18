import { TenantSummaryDTO } from './TenantSummaryDTO';

// --- Auth DTOs ---
export interface LoginResponseDTO {
  accessToken: string;
  refreshToken?: string;
  availableTenants: TenantSummaryDTO[];
  currentTenant: TenantSummaryDTO;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}