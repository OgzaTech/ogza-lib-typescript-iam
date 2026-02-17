import { User } from '../User';
import { UserPassword } from '../UserPassword';
import { LocalizationService,CoreKeys } from '@ogza/core';
import { en as coreEn } from '@ogza/core';
import { iamEn } from '../../localization/locales/en';

LocalizationService.setLocaleData({ ...coreEn, ...iamEn });

describe('User Aggregate', () => {
  
  const validProps = {
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Oğuzhan',
    lastName: 'Kıvrak'
  };

  it('should create a user successfully', () => {
    const result = User.create(validProps);
    expect(result.isSuccess).toBe(true);
    const user = result.getValue();
    expect(user.email.getValue()).toBe(validProps.email);
  });

  it('should fail if email is invalid (Using Core Validation)', () => {
    const result = User.create({
      ...validProps,
      email: 'invalid-email'
    });
    expect(result.isFailure).toBe(true);
    // Core'dan gelen hata mesajını bekliyoruz
    const expectedMsg = LocalizationService.t(CoreKeys.VALIDATION.INVALID_EMAIL);
    expect(result.error).toBe(expectedMsg);
  });

  it('should fail if password is invalid (Using IAM Validation)', () => {
    const result = User.create({
      ...validProps,
      password: '123' // Too short
    });
    expect(result.isFailure).toBe(true);
  });

  it('should fail if firstName is null', () => {
    const result = User.create({
      ...validProps,
      firstName: null as any
    });
    expect(result.isFailure).toBe(true);
  });

  it('should change password', () => {
    const user = User.create(validProps).getValue();
    
    // Yeni şifre oluştur
    const newPassResult = UserPassword.createRaw('newPassword123');
    expect(newPassResult.isSuccess).toBe(true);
    
    // Şifreyi değiştir
    user.changePassword(newPassResult.getValue());

    // Kontrol et (Internal props erişimi ile)
    expect(user.props.password.props.value).toBe('newPassword123');
  });
});