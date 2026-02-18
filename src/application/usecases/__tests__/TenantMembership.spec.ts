import { describe, it, expect } from 'vitest';
import { TenantMembership } from '../../../domain/TenantMembership';
import { TenantMemberStatus } from '../../../shared';

const makeBaseProps = () => ({
  tenantId: 'tenant-1',
  userId: 'user-1',
  role: 'Member',
  status: TenantMemberStatus.ACTIVE,
  joinedAt: new Date(),
  updatedAt: new Date()
});

describe('TenantMembership Entity', () => {

  describe('create', () => {
    it('geçerli props ile oluşturulur', () => {
      const result = TenantMembership.create(makeBaseProps());
      expect(result.isSuccess).toBe(true);
    });

    it('tenantId eksikse hata döner', () => {
      const result = TenantMembership.create({ ...makeBaseProps(), tenantId: '' });
      expect(result.isFailure).toBe(true);
    });

    it('userId eksikse hata döner', () => {
      const result = TenantMembership.create({ ...makeBaseProps(), userId: '' });
      expect(result.isFailure).toBe(true);
    });

    it('role eksikse hata döner', () => {
      const result = TenantMembership.create({ ...makeBaseProps(), role: '' });
      expect(result.isFailure).toBe(true);
    });
  });

  describe('updateStatus', () => {
    it('aktif üye suspend edilebilir', () => {
      const membership = TenantMembership.create(makeBaseProps()).getValue();
      const result = membership.updateStatus(TenantMemberStatus.SUSPENDED);
      expect(result.isSuccess).toBe(true);
      expect(membership.status).toBe(TenantMemberStatus.SUSPENDED);
    });

    it('aktif üye silinebilir', () => {
      const membership = TenantMembership.create(makeBaseProps()).getValue();
      const result = membership.updateStatus(TenantMemberStatus.DELETED);
      expect(result.isSuccess).toBe(true);
      expect(membership.status).toBe(TenantMemberStatus.DELETED);
    });

    it('Owner silinemez', () => {
      const membership = TenantMembership.create({ ...makeBaseProps(), role: 'Owner' }).getValue();
      const result = membership.updateStatus(TenantMemberStatus.DELETED);

      expect(result.isFailure).toBe(true);
      expect(result.error!.message).toContain('Owner');
      expect(membership.status).toBe(TenantMemberStatus.ACTIVE);
    });

    it('zaten silinmiş üye tekrar silinemez', () => {
      const membership = TenantMembership.create({
        ...makeBaseProps(),
        status: TenantMemberStatus.DELETED
      }).getValue();

      const result = membership.updateStatus(TenantMemberStatus.DELETED);

      expect(result.isFailure).toBe(true);
      expect(result.error!.message).toContain('already deleted');
    });

    it('Owner suspend edilebilir', () => {
      const membership = TenantMembership.create({ ...makeBaseProps(), role: 'Owner' }).getValue();
      const result = membership.updateStatus(TenantMemberStatus.SUSPENDED);
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('getter\'lar', () => {
    it('isOwner doğru çalışır', () => {
      const owner = TenantMembership.create({ ...makeBaseProps(), role: 'Owner' }).getValue();
      const member = TenantMembership.create({ ...makeBaseProps(), role: 'Member' }).getValue();

      expect(owner.isOwner()).toBe(true);
      expect(member.isOwner()).toBe(false);
    });

    it('isActive doğru çalışır', () => {
      const active = TenantMembership.create({ ...makeBaseProps(), status: TenantMemberStatus.ACTIVE }).getValue();
      const deleted = TenantMembership.create({ ...makeBaseProps(), status: TenantMemberStatus.DELETED }).getValue();

      expect(active.isActive()).toBe(true);
      expect(deleted.isActive()).toBe(false);
    });
  });
});