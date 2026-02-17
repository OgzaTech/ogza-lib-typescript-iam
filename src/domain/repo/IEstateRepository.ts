import { IRepository, Result } from "@ogza/core";

export interface IEstateRepository {
  create(props: { 
    name: string; 
    type: string; 
    tenantId: string; 
    parentEstateId: string | null 
  }): Promise<Result<string>>; // EstateID döner
}