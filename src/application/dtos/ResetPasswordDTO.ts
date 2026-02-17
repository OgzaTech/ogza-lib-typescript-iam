export interface ResetPasswordDTO {
  token: string; // Maildeki linkten gelen token
  newPassword: string;
}