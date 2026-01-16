
import { User, AuthSession, UserRole } from '../types';
import { storageService } from './storageService';

const SESSION_KEY = 'ESSENZIA_SESSION';
const PASSWORD_SALT = 'essenzia_financeiro_secure_salt_2025';

// Simula hashing de senha via Web Crypto API
export const hashPassword = async (password: string): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(password + PASSWORD_SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const authService = {
  // Fix: Added register method to allow new user signups (pending approval in UserManagement)
  register: async (name: string, email: string, password: string): Promise<{ success: boolean; message: string }> => {
    const users = storageService.getUsers();
    const cleanEmail = email.trim().toLowerCase();
    
    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, message: 'Este e-mail já está em uso.' };
    }

    const hash = await hashPassword(password);
    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      passwordHash: hash,
      role: 'OPERADOR',
      active: false, // Default to inactive for approval
      createdAt: new Date().toISOString()
    };

    storageService.saveUser(newUser);
    storageService.logAction('SYSTEM', 'Visitante', 'SOLICITACAO_REGISTRO', `Nova solicitação de acesso: ${name} (${cleanEmail})`);
    
    return { success: true, message: 'Cadastro realizado com sucesso! Aguarde a aprovação do administrador.' };
  },

  login: async (email: string, password: string): Promise<AuthSession | null> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    
    // MASTER BYPASS: Garante que Nathan sempre consiga entrar
    if (cleanEmail === 'nathan@essenziacontabilidade.com' && cleanPassword === '461010') {
      console.log("Master Access: Nathan autorizado via Bypass de Emergência.");
      
      const session: AuthSession = {
        user: {
          id: 'usr_nathan_essenzia',
          name: 'Nathan Essenzia',
          email: 'nathan@essenziacontabilidade.com',
          role: 'ADMIN'
        },
        token: `master_sess_${Date.now()}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas para o Master
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      storageService.logAction('usr_nathan_essenzia', 'Nathan Essenzia', 'LOGIN_MASTER', 'Login realizado via credenciais mestras');
      return session;
    }

    const users = storageService.getUsers();
    const hash = await hashPassword(cleanPassword);
    
    const user = users.find(u => 
      u.email.toLowerCase() === cleanEmail && 
      u.active
    );
    
    if (!user || user.passwordHash !== hash) {
      console.error("Login falhou: Credenciais inválidas ou usuário inativo.");
      return null;
    }

    const session: AuthSession = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token: `sess_${Math.random().toString(36).substr(2, 9)}`,
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    storageService.updateUser(user.id, { lastLoginAt: new Date().toISOString() });
    storageService.logAction(user.id, user.name, 'LOGIN', 'Usuário realizou login padrão');
    
    return session;
  },

  logout: () => {
    const session = authService.getSession();
    if (session) {
      storageService.logAction(session.user.id, session.user.name, 'LOGOUT', 'Usuário saiu do sistema');
    }
    localStorage.removeItem(SESSION_KEY);
  },

  getSession: (): AuthSession | null => {
    const data = localStorage.getItem(SESSION_KEY);
    if (!data) return null;
    try {
      const session: AuthSession = JSON.parse(data);
      if (new Date(session.expiresAt) < new Date()) {
        authService.logout();
        return null;
      }
      return session;
    } catch (e) {
      return null;
    }
  },

  isAuthenticated: (): boolean => {
    return !!authService.getSession();
  },

  isAdmin: (): boolean => {
    return authService.getSession()?.user.role === 'ADMIN';
  }
};
