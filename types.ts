
export type TransactionSource = string;
export type TransactionType = 'ENTRADA' | 'SAIDA';
export type TransactionStatus = 'CONFIRMADA' | 'PENDENTE';
export type AuditStatus = 'PENDENTE' | 'AUDITADO';
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

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}

export interface ModulePermission {
  user_id: string;
  module: 'FINANCEIRO' | 'COMERCIAL' | 'RH';
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_restore: boolean;
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
  transactionKey?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
}

export interface FinancialInstitution {
  id: string;
  name: string;
  color?: string;
}

export interface Transaction {
  id?: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  originalDate: string;
  originalDescription: string;
  originalAmount: number;
  originalType: TransactionType;
  auditStatus: AuditStatus;
  auditedBy?: string;
  auditedAt?: string;
  tags?: string[];
  observations?: string;
  source: TransactionSource;
  account: string;
  paymentMethod: string;
  status: TransactionStatus;
  importId?: string;
  transactionKey: string;
  confidenceScore: number;
  month: number;
  year: number;
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
    pendingAuditCount: number;
  };
}

export interface FilterState {
  month: number;
  year: number;
  source: string;
  type: 'ALL' | TransactionType;
  category: string;
  status: 'ALL' | TransactionStatus;
  auditStatus: 'ALL' | AuditStatus;
}

export interface BackupEntry {
  id: string;
  created_at: string;
  reason: string;
  row_count: number;
  year: number;
  month: number;
  created_by?: string;
  status?: 'Íntegro' | 'Antigo' | 'Inválido';
}

export interface SnapshotDetail extends BackupEntry {
  data_snapshot: any[];
  audit_snapshot: any[];
}

export interface RestoreLog {
  id: string;
  snapshot_id: string;
  month: number;
  year: number;
  restored_by: string;
  restored_at: string;
  reason: string;
  restored_rows: number;
  status: string;
}
