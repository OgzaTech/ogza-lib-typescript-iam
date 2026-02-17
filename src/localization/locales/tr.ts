import { IamKeys } from "../../constants/IamKeys";
import { IamConstants } from "../../constants/IamConstants";

export const iamTr = {
  [IamKeys.PASSWORD.TOO_SHORT]: `Şifre en az ${IamConstants.PASSWORD.MIN_LENGTH} karakter olmalıdır.`,
  [IamKeys.USER.ALREADY_EXISTS]: "Bu e-posta adresi ile kayıtlı bir kullanıcı zaten var.",
  [IamKeys.USER.NOT_FOUND]: "Kullanıcı bulunamadı."
};