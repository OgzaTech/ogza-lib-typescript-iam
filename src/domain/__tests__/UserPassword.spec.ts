import { UserPassword } from '../UserPassword';
import { LocalizationService } from '@ogza/core';
import { iamEn } from '../../localization/locales/en';
import { IamKeys } from '../../constants/IamKeys';

// Testler için dil setini yüklüyoruz (Core ve IAM birleşimini simüle ediyoruz)
LocalizationService.setLocaleData(iamEn);

describe('UserPassword ValueObject', () => {

  it('should fail if password is null', () => {
    const result = UserPassword.createRaw(null as any);
    expect(result.isFailure).toBe(true);
  });

  it('should fail if password is too short', () => {
    const shortPass = "123";
    const result = UserPassword.createRaw(shortPass);
    
    // Beklenen çevrilmiş mesaj
    const expectedMsg = LocalizationService.t(IamKeys.PASSWORD.TOO_SHORT);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(expectedMsg);
  });

  it('should create password if length is valid', () => {
    const validPass = "123456";
    const result = UserPassword.createRaw(validPass);

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().isHashed()).toBe(false);
  });

  it('should create hashed password directly', () => {
    const hashed = "hash_string_from_db";
    const result = UserPassword.createHashed(hashed);

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().isHashed()).toBe(true);
  });
});