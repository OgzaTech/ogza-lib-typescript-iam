import { IRepository, Result, Email, SearchParams ,IPaginatedResponse, StructuredError} from "@ogza/core";
import { User } from "../User";

export interface IUserRepository extends IRepository<User, StructuredError>{
  findByEmail(email: Email): Promise<Result<User, StructuredError>>;
  findPaginated(params: SearchParams): Promise<Result<IPaginatedResponse<User>, StructuredError>>;
  create(user: User): Promise<Result<User, StructuredError>>;
}


/*

  findByEmail(email: Email): Promise<Result<User>>;

  save(user: User): Promise<Result<string>>;

  getById(id: string): Promise<Result<User>>;

  findAll(params: SearchParams): Promise<Result<IPaginatedResponse<User>>>;

  create(user: User): Promise<Result<User>>;
*/