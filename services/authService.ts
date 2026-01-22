
import { AuthSession, ModulePermission } from '../types.ts';

const staticUser: AuthSession = {
  user: {
    id: 'public-admin-id',
    name: 'Administrador Essenzia',
    email: 'financeiro@essenzia.com.br',
    role: 'ADMIN'
  },
  token: 'public-access-token',
  expiresAt: new Date(Date.now() + 999999999).toISOString()
};

const staticPermissions: ModulePermission = {
  user_id: 'public-admin-id',
  module: 'FINANCEIRO',
  can_read: true,
  can_write: true,
  can_delete: true,
  can_restore: true
};

export const authService = {
  canAccessModule: (moduleName: string): boolean => true,

  getSession: async (): Promise<AuthSession | null> => {
    return staticUser;
  },

  getModulePermissions: async (userId: string): Promise<ModulePermission | null> => {
    return staticPermissions;
  },

  login: async (email: string, password: string) => {
    return { success: true, message: 'Sucesso', session: {} };
  },

  logout: async () => {
    // Não faz nada no modo sem login
  },

  register: async (name: string, email: string, password: string) => {
    return { success: true, message: 'Sucesso', autoActivated: true };
  },

  hashPassword: async (password: string): Promise<string> => {
    return password; 
  }
};
