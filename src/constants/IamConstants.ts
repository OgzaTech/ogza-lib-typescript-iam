export const IamConstants = {
  PASSWORD: {
    MIN_LENGTH: 6
  },
  ACCOUNT_TYPE: {
    INDIVIDUAL: 'INDIVIDUAL',
    CORPORATE: 'CORPORATE'
  },
  ESTATE_TYPE: {
    PERSONAL_SPACE: 'PERSONAL_SPACE',
    HEADQUARTER: 'HEADQUARTER'
  },
  DEFAULTS: {
    PERSONAL_TENANT_SUFFIX: "'s Workspace", // Örn: Oğuzhan's Workspace
    PERSONAL_ESTATE_NAME: 'My Workspace',
    HEADQUARTER_NAME: 'Headquarters'
  },
  ACTIONS: {
    CREATE: 'create',
    READ: 'read',
    UPDATE: 'update',
    DELETE: 'delete',
    PUBLISH: 'publish' // Opsiyonel
  },
  ROLES: {
    OWNER: 'Owner',
    ADMIN: 'Admin',
    MEMBER: 'Member'
  },
  DEFAULT_ROLE_NAMES: {
    OWNER: 'Owner',
    ADMIN: 'Admin',
    MEMBER: 'Member'
  },
  TOKEN: {
    TYPE: {
      ACCESS: 'ACCESS_TOKEN',
      RESET_PASSWORD: 'RESET_PASSWORD_TOKEN'
    },
    EXPIRATION: {
      RESET_PASSWORD: '15m' // 15 dakika
    }
  },
  CONFIG_KEYS: {
    FRONTEND_URL: 'FRONTEND_URL',
    BACKEND_URL: 'BACKEND_URL',
    SUPPORT_EMAIL: 'SUPPORT_EMAIL'
  }
} as const;