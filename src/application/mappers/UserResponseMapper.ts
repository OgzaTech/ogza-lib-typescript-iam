import { User } from '../../domain/User'; // Senin User Entity'n
import { UserResponseDTO } from '../../application/dtos/UserResponseDTO';

export class UserResponseMapper {
  
  public static toDTO(user: User): UserResponseDTO {
    return {
      id: user.id.toString(), 
      email: user.email.props.value,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive ,
      role: user.role
    };
  }

  public static toDTOList(users: User[]): UserResponseDTO[] {
    return users.map(user => UserResponseMapper.toDTO(user));
  }
}