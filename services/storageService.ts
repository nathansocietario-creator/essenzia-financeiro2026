
import { Transaction, ImportJob, MonthlyClosing, FinancialInstitution, User, AuditLog, UserRole } from '../types';

const KEYS = {
  TRANSACTIONS: 'FINHUB_TRANSACTIONS',
  IMPORTS: 'FINHUB_IMPORT_JOBS',
  CLOSINGS: 'FINHUB_CLOSINGS',
  SOURCES: 'FINHUB_SOURCES',
  USERS: 'FINHUB_USERS',
  AUDIT: 'FINHUB_AUDIT_LOGS'
};

const DEFAULT_SOURCES: FinancialInstitution[] = [
  { id: 'ASAAS', name: 'Asaas' },
  { id: 'MANUAL', name: 'Manual' }
];

// Seed de emergência para garantir acesso do Nathan e do Admin padrão
const ensureAdminUser = () => {
  try {
    const usersData = localStorage.getItem(KEYS.USERS);
    let users: User[] = usersData ? JSON.parse(usersData) : [];
    
    const targetEmail = 'nathan@essenziacontabilidade.com';
    // Hash da senha 461010 com salt 'essenzia_financeiro_secure_salt_2025'
    const targetHash = 'e6988863f6831093153e777f98f6d89280f9706306e987823f03b5f903524b9e';

    const nathanUser: User = {
      id: 'usr_nathan_essenzia',
      name: 'Nathan Essenzia',
      email: targetEmail,
      passwordHash: targetHash,
      role: 'ADMIN',
      active: true,
      createdAt: new Date().toISOString()
    };

    const adminDefault: User = {
      id: 'usr_admin_default',
      name: 'Super Admin',
      email: 'admin@essenzia.com.br',
      passwordHash: 'f6b21583a451296c6460e487c69992f588f98d5c4115166299d2518e3845b46e', // 'admin123'
      role: 'ADMIN',
      active: true,
      createdAt: new Date().toISOString()
    };

    let updated = false;

    // 1. Garante Admin Padrão
    if (!users.find(u => u.email.toLowerCase() === adminDefault.email.toLowerCase())) {
      users.push(adminDefault);
      updated = true;
    }

    // 2. FORÇA os dados do Nathan (Correção de Acesso)
    const nathanIdx = users.findIndex(u => u.email.toLowerCase() === targetEmail.toLowerCase());
    
    if (nathanIdx === -1) {
      users.push(nathanUser);
      updated = true;
      console.log("Diagnostic: Criado usuário Nathan para acesso imediato.");
    } else {
      const existing = users[nathanIdx];
      // Se qualquer dado crucial estiver diferente, sobrescrevemos para garantir o acesso
      if (existing.passwordHash !== targetHash || !existing.active || existing.role !== 'ADMIN') {
        users[nathanIdx] = { 
          ...existing, 
          passwordHash: targetHash, 
          active: true, 
          role: 'ADMIN' 
        };
        updated = true;
        console.warn("Diagnostic: Credenciais do Nathan corrigidas pelo Seed.");
      }
    }

    if (updated) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    }
  } catch (err) {
    console.error("Erro crítico no Seed de Usuários:", err);
  }
};

// Executa o seed imediatamente
ensureAdminUser();

export const storageService = {
  // --- USERS ---
  getUsers: (): User[] => {
    const data = localStorage.getItem(KEYS.USERS);
    try {
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  updateUser: (id: string, updates: Partial<User>) => {
    const users = storageService.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    }
  },

  saveUser: (user: User) => {
    const users = storageService.getUsers();
    users.push(user);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  },

  // --- AUDIT ---
  logAction: (userId: string, userName: string, action: string, details: string) => {
    const logs = storageService.getAuditLogs();
    const log: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId,
      userName,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    logs.unshift(log);
    localStorage.setItem(KEYS.AUDIT, JSON.stringify(logs.slice(0, 500)));
  },

  getAuditLogs: (): AuditLog[] => {
    const data = localStorage.getItem(KEYS.AUDIT);
    try {
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  // --- SOURCES (INSTITUTIONS) ---
  getSources: (): FinancialInstitution[] => {
    const data = localStorage.getItem(KEYS.SOURCES);
    try {
      return data ? JSON.parse(data) : DEFAULT_SOURCES;
    } catch (e) {
      return DEFAULT_SOURCES;
    }
  },

  addSource: (name: string) => {
    const sources = storageService.getSources();
    const id = name.toUpperCase().replace(/\s+/g, '_');
    if (sources.find(s => s.id === id)) return;
    
    const newSources = [...sources, { id, name }];
    localStorage.setItem(KEYS.SOURCES, JSON.stringify(newSources));
  },

  deleteSource: (id: string) => {
    if (id === 'ASAAS' || id === 'MANUAL') return;
    const sources = storageService.getSources();
    const filtered = sources.filter(s => s.id !== id);
    localStorage.setItem(KEYS.SOURCES, JSON.stringify(filtered));
  },

  // --- TRANSACTIONS ---
  saveTransactions: (transactions: Transaction[], importId?: string, userId?: string) => {
    const existing = storageService.getTransactions();
    const existingKeys = new Set(existing.map(t => t.transactionKey));
    
    let inserted = 0;
    let ignored = 0;

    const transactionsToInsert = transactions.map(t => ({
      ...t,
      importId: importId || t.importId,
      createdBy: userId || t.createdBy
    }));

    const newTransactions = transactionsToInsert.filter(t => {
      if (existingKeys.has(t.transactionKey)) {
        ignored++;
        return false;
      }
      inserted++;
      return true;
    });

    const updated = [...existing, ...newTransactions];
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(updated));
    
    return { inserted, ignored };
  },

  getTransactions: (): Transaction[] => {
    const data = localStorage.getItem(KEYS.TRANSACTIONS);
    try {
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  updateTransaction: (updated: Transaction, userId?: string) => {
    const transactions = storageService.getTransactions();
    const index = transactions.findIndex(t => t.transactionKey === updated.transactionKey);
    if (index !== -1) {
      transactions[index] = { ...updated, updatedBy: userId };
      localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
    }
  },

  deleteTransaction: (key: string, userId?: string) => {
    const transactions = storageService.getTransactions();
    const filtered = transactions.filter(t => t.transactionKey !== key);
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(filtered));
  },

  // --- IMPORT AUDIT ---
  saveImportJob: (job: ImportJob) => {
    const jobs = storageService.getImportJobs();
    const index = jobs.findIndex(j => j.id === job.id);
    
    if (index !== -1) {
      jobs[index] = job;
    } else {
      jobs.unshift(job);
    }
    
    localStorage.setItem(KEYS.IMPORTS, JSON.stringify(jobs.slice(0, 100)));
  },

  getImportJobs: (): ImportJob[] => {
    const data = localStorage.getItem(KEYS.IMPORTS);
    try {
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  // --- CLOSINGS ---
  closeMonth: (closing: MonthlyClosing) => {
    const closings = storageService.getClosings();
    const index = closings.findIndex(c => c.month === closing.month && c.year === closing.year);
    
    if (index !== -1) {
      closings[index] = closing;
    } else {
      closings.push(closing);
    }
    
    localStorage.setItem(KEYS.CLOSINGS, JSON.stringify(closings));
  },

  reopenMonth: (month: number, year: number) => {
    const closings = storageService.getClosings();
    const filtered = closings.filter(c => !(c.month === month && c.year === year));
    localStorage.setItem(KEYS.CLOSINGS, JSON.stringify(filtered));
  },

  getClosings: (): MonthlyClosing[] => {
    const data = localStorage.getItem(KEYS.CLOSINGS);
    try {
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  isMonthClosed: (month: number, year: number): boolean => {
    return storageService.getClosings().some(c => c.month === month && c.year === year);
  }
};
