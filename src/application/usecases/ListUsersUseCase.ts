import { IUseCase, Result, IPaginatedResponse, SearchParams, ILogger, StructuredError, AppError } from '@ogza/core';
import { User } from '../../domain/User';
import { IUserRepository } from '../../domain/repo/IUserRepository';

export interface ListUsersRequest extends SearchParams {
  tenantId?: string;
}

export class ListUsersUseCase implements IUseCase<ListUsersRequest, Result<IPaginatedResponse<User>, StructuredError>> {
  constructor(
    private userRepo: IUserRepository,
    private logger: ILogger
  ) {}

  async execute(req: ListUsersRequest): Promise<Result<IPaginatedResponse<User>, StructuredError>> {
    try {
      return await this.userRepo.findPaginated(req);
    } catch (err) {
      this.logger.error("ListUsersUseCase failed", { error: err });
      return AppError.UnexpectedError.create(err);
    }
  }
}
