import { IRepository, Result, Email, SearchParams ,IPaginatedResponse} from "@ogza/core";
import { User } from "../User";

// Core'daki Generic IRepository'den türüyor
export interface IUserRepository extends IRepository<User> {
  findByEmail(email: Email): Promise<Result<User>>;

  save(user: User): Promise<Result<string>>;

  getById(id: string): Promise<Result<User>>;

  findAll(params: SearchParams): Promise<Result<IPaginatedResponse<User>>>;

  create(user: User): Promise<Result<User>>;
}