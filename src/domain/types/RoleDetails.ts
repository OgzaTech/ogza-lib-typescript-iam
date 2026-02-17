export interface RoleDetails {
  id: string;
  name: string;
  permissions: string[];
  description?: string;
  isDefault: boolean;
}