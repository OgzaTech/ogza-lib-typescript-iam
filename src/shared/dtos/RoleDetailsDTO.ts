
export interface RoleDetailsDTO {
  id: string;
  name: string;
  permissions: string[];
  description?: string;
  isDefault: boolean;
}