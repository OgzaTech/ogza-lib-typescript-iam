import { IamKeys } from "../../constants/IamKeys";
import { IamConstants } from "../../constants/IamConstants";

export const iamEn = {
  [IamKeys.PASSWORD.TOO_SHORT]: `Password must be at least ${IamConstants.PASSWORD.MIN_LENGTH} characters.`,
  [IamKeys.USER.ALREADY_EXISTS]: "User already exists with this email.",
  [IamKeys.USER.NOT_FOUND]: "User not found."
};