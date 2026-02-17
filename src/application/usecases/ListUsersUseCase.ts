import { IUseCase, Result, IPaginatedResponse, SearchParams } from '@ogza/core';
import { User } from '../../domain/User';
import { IUserRepository } from '../../domain/repo/IUserRepository';

// İsteğin Tipi (Request)
export interface ListUsersRequest extends SearchParams {
  tenantId?: string; 
}

export class ListUsersUseCase implements IUseCase<ListUsersRequest, Result<IPaginatedResponse<User>>> {
  constructor(private userRepo: IUserRepository) {}

  async execute(req: ListUsersRequest): Promise<Result<IPaginatedResponse<User>>> {
    return await this.userRepo.findAll(req);
  }
}