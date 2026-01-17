
export type TransactionSource = string;
export type TransactionType = 'ENTRADA' | 'SAIDA';
export type TransactionStatus = 'CONFIRMADA' | 'PENDENTE';
export type UserRole = 'ADMIN' | 'OPERADOR';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface AuthSession {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  token: string;
  expiresAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface FinancialInstitution {
  id: string;
  name: string;
  color?: string;
}

export interface CategoryBudget {
  category: string;
  amount: number;
  type: TransactionType;
}

export interface MonthlyBudget {
  id: string; // YYYY-MM
  year: number;
  month: number;
  budgets: CategoryBudget[];
}

export interface Transaction {
  id?: string;
  date: string;
  description: string;
  clientOrRecipient?: string;
  amount: number;
  type: TransactionType;
  category: string;
  paymentMethod: string;
  source: TransactionSource;
  account: string;
  observations?: string;
  notes?: string;
  tags?: string[];
  status: TransactionStatus;
  importId?: string;
  balance?: number;
  transactionKey: string;
  confidenceScore: number;
  month: number;
  year: number;
  originalId?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface ImportJob {
  id: string;
  timestamp: string;
  source: TransactionSource;
  userName: string;
  userId: string;
  fileName: string;
  periodStart: string;
  periodEnd: string;
  totalLines: number;
  insertedCount: number;
  ignoredCount: number;
  alertCount: number;
  errorCount: number;
  status: 'PROCESSANDO' | 'CONCLUÍDA' | 'CONCLUÍDA_COM_ALERTAS' | 'ERRO';
}

export interface MonthlyClosing {
  id: string;
  month: number;
  year: number;
  closedAt: string;
  closedBy: string;
  closedById: string;
  snapshot: {
    totalIn: number;
    totalOut: number;
    result: number;
    transactionCount: number;
  };
}

export interface FilterState {
  month: number;
  year: number;
  source: string;
  type: 'ALL' | TransactionType;
  category: string;
  status: 'ALL' | TransactionStatus;
}
