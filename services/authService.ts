
import { User, AuthSession } from '../types';
import { storageService } from './storageService';
import { supabase } from './supabase';

const SESSION_KEY = 'ESSENZIA_SESSION';
const PASSWORD_SALT = 'essenzia_financeiro_secure_salt_2025';

export const hashPassword = async (password: string): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(password + PASSWORD_SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export type LoginResult = {
  success: boolean;
  session?: AuthSession;
  message?: string;
};

export const authService = {
  register: async (name: string, email: string, password: string): Promise<{ success: boolean; message: string; autoActivated?: boolean }> => {
    const cleanEmail = email.trim().toLowerCase();
    
    try {
      // Verifica se já existe o e-mail
      const { data: existing, error: checkError } = await supabase
        .from('app_users')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existing) {
        return { success: false, message: 'Este e-mail já está em uso.' };
      }

      // Verifica se é o primeiro usuário do sistema para auto-ativação
      const { count, error: countError } = await supabase
        .from('app_users')
        .select('*', { count: 'exact', head: true });
      
      const isFirstUser = count === 0;

      const hash = await hashPassword(password);
      const newUser: User = {
        id: `usr_${Date.now()}`,
        name: name.trim(),
        email: cleanEmail,
        passwordHash: hash,
        role: isFirstUser ? 'ADMIN' : 'OPERADOR',
        active: isFirstUser, // Auto-ativa se for o primeiro
        createdAt: new Date().toISOString()
      };

      await storageService.saveUser(newUser);
      await storageService.logAction('SYSTEM', isFirstUser ? 'Auto-Admin' : 'Visitante', 'SOLICITACAO_REGISTRO', `Registro: ${name} (${cleanEmail}). Auto-ativado: ${isFirstUser}`);
      
      if (isFirstUser) {
        return { 
          success: true, 
          message: 'Você é o primeiro usuário! Sua conta de ADMINISTRADOR foi ativada automaticamente. Pode fazer login agora.',
          autoActivated: true 
        };
      }

      return { success: true, message: 'Cadastro realizado com sucesso! Como este é um sistema restrito, aguarde a aprovação do administrador para acessar.' };
    } catch (err: any) {
      console.error("Erro no registro:", err.message || err);
      return { success: false, message: 'Erro ao processar cadastro no servidor.' };
    }
  },

  login: async (email: string, password: string): Promise<LoginResult> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    
    // MASTER BYPASS: Nathan Access
    if (cleanEmail === 'nathan@essenziacontabilidade.com' && cleanPassword === '461010') {
      const session: AuthSession = {
        user: { id: 'usr_nathan_essenzia', name: 'Nathan Essenzia', email: cleanEmail, role: 'ADMIN' },
        token: `master_sess_${Date.now()}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return { success: true, session };
    }

    try {
      const hash = await hashPassword(cleanPassword);
      
      const { data: user, error: fetchError } = await supabase
        .from('app_users')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();
      
      if (fetchError) throw fetchError;
      
      if (!user) {
        return { success: false, message: "E-mail não encontrado nos registros." };
      }

      if (user.password_hash !== hash) {
        return { success: false, message: "Senha incorreta para este usuário." };
      }

      if (!user.active) {
        return { success: false, message: "Sua conta ainda não foi aprovada. Por favor, solicite a ativação ao administrador Nathan." };
      }

      const session: AuthSession = {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        token: `sess_${Math.random().toString(36).substr(2, 9)}`,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      await storageService.updateUser(user.id, { lastLoginAt: new Date().toISOString() });
      await storageService.logAction(user.id, user.name, 'LOGIN', 'Login realizado com sucesso.');
      
      return { success: true, session };
    } catch (err: any) {
      console.error("Erro no login:", err.message || err);
      return { success: false, message: "Ocorreu um erro técnico ao tentar realizar o login." };
    }
  },

  logout: async () => {
    const session = authService.getSession();
    if (session) {
      await storageService.logAction(session.user.id, session.user.name, 'LOGOUT', 'Usuário saiu do sistema');
    }
    localStorage.removeItem(SESSION_KEY);
  },

  getSession: (): AuthSession | null => {
    const data = localStorage.getItem(SESSION_KEY);
    if (!data) return null;
    try {
      const session: AuthSession = JSON.parse(data);
      if (new Date(session.expiresAt) < new Date()) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch (e) {
      return null;
    }
  }
};
