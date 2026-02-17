import { IRepository, Result } from "@ogza/core";

export interface ITenantRepository {
  create(props: { name: string; type: 'INDIVIDUAL' | 'CORPORATE' }): Promise<Result<string>>; // TenantID döner
}