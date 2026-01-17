
import { Transaction, ImportJob, MonthlyClosing, FinancialInstitution, User, AuditLog, MonthlyBudget } from '../types';
import { supabase } from './supabase';

const DEFAULT_SOURCES: FinancialInstitution[] = [
  { id: 'ASAAS', name: 'Asaas' },
  { id: 'MANUAL', name: 'Manual' }
];

const mapUserToDB = (u: User) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  password_hash: u.passwordHash,
  role: u.role,
  active: u.active,
  last_login_at: u.lastLoginAt,
  created_at: u.createdAt
});

const mapUserFromDB = (u: any): User => ({
  id: u.id,
  name: u.name,
  email: u.email,
  passwordHash: u.password_hash,
  role: u.role,
  active: u.active,
  lastLoginAt: u.last_login_at,
  createdAt: u.created_at
});

const mapTransactionToDB = (t: Transaction) => ({
  date: t.date,
  description: t.description,
  client_or_recipient: t.clientOrRecipient,
  amount: t.amount,
  type: t.type,
  category: t.category,
  payment_method: t.paymentMethod,
  source: t.source,
  account: t.account,
  observations: t.observations,
  notes: t.notes,
  tags: t.tags,
  status: t.status,
  import_id: t.importId,
  balance: t.balance,
  transaction_key: t.transactionKey,
  confidence_score: t.confidenceScore,
  month: t.month,
  year: t.year,
  original_id: t.originalId,
  created_by: t.createdBy,
  updated_by: t.updatedBy
});

const mapTransactionFromDB = (t: any): Transaction => ({
  id: t.id,
  date: t.date,
  description: t.description,
  clientOrRecipient: t.client_or_recipient,
  amount: t.amount,
  type: t.type,
  category: t.category,
  paymentMethod: t.payment_method,
  source: t.source,
  account: t.account,
  observations: t.observations,
  notes: t.notes,
  tags: t.tags,
  status: t.status,
  importId: t.import_id,
  balance: t.balance,
  transactionKey: t.transaction_key,
  confidenceScore: t.confidence_score,
  month: t.month,
  year: t.year,
  originalId: t.original_id,
  createdBy: t.created_by,
  updatedBy: t.updated_by
});

export const storageService = {
  // --- USERS ---
  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('app_users').select('*').order('created_at', { ascending: false });
    return (data || []).map(mapUserFromDB);
  },

  updateUser: async (id: string, updates: Partial<User>) => {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.role) dbUpdates.role = updates.role;
    if (updates.active !== undefined) dbUpdates.active = updates.active;
    if (updates.lastLoginAt) dbUpdates.last_login_at = updates.lastLoginAt;
    if (updates.passwordHash) dbUpdates.password_hash = updates.passwordHash;
    await supabase.from('app_users').update(dbUpdates).eq('id', id);
  },

  saveUser: async (user: User) => {
    await supabase.from('app_users').insert([mapUserToDB(user)]);
  },

  deleteUser: async (id: string) => {
    await supabase.from('app_users').delete().eq('id', id);
  },

  // --- BUDGERS (NOVO) ---
  getBudgets: async (year: number, month: number): Promise<MonthlyBudget | null> => {
    const id = `${year}-${month}`;
    const { data, error } = await supabase.from('budgets').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      year: data.year,
      month: data.month,
      budgets: data.budgets || []
    };
  },

  saveBudget: async (budget: MonthlyBudget) => {
    const { error } = await supabase.from('budgets').upsert([budget], { onConflict: 'id' });
    if (error) console.error("Error saving budget:", error);
  },

  // --- AUDIT ---
  logAction: async (userId: string, userName: string, action: string, details: string) => {
    const log = { id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, user_id: userId, user_name: userName, action, details, timestamp: new Date().toISOString() };
    await supabase.from('audit_logs').insert([log]);
  },

  getAuditLogs: async (): Promise<AuditLog[]> => {
    const { data } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(200);
    return (data || []).map(l => ({ id: l.id, userId: l.user_id, userName: l.user_name, action: l.action, details: l.details, timestamp: l.timestamp }));
  },

  // --- TRANSACTIONS ---
  saveTransactions: async (transactions: Transaction[], importId?: string, userId?: string) => {
    const toInsert = transactions.map(t => mapTransactionToDB({ ...t, importId: importId || t.importId, createdBy: userId || t.createdBy }));
    const { error } = await supabase.from('transactions').upsert(toInsert, { onConflict: 'transaction_key' });
    if (error) throw error;
    return { inserted: transactions.length, ignored: 0 };
  },

  getTransactions: async (): Promise<Transaction[]> => {
    const { data } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    return (data || []).map(mapTransactionFromDB);
  },

  updateTransaction: async (updated: Transaction, userId?: string) => {
    await supabase.from('transactions').update({ ...mapTransactionToDB(updated), updated_by: userId }).eq('transaction_key', updated.transactionKey);
  },

  deleteTransaction: async (key: string) => {
    await supabase.from('transactions').delete().eq('transaction_key', key);
  },

  // --- SOURCES ---
  getSources: async (): Promise<FinancialInstitution[]> => {
    const { data } = await supabase.from('sources').select('*');
    if (!data || data.length === 0) return DEFAULT_SOURCES;
    return data;
  },

  addSource: async (name: string) => {
    const id = name.toUpperCase().replace(/\s+/g, '_');
    await supabase.from('sources').insert([{ id, name }]);
  },

  deleteSource: async (id: string) => {
    if (id === 'ASAAS' || id === 'MANUAL') return;
    await supabase.from('sources').delete().eq('id', id);
  },

  // --- IMPORT AUDIT ---
  saveImportJob: async (job: ImportJob) => {
    const dbJob = { id: job.id, timestamp: job.timestamp, source: job.source, user_name: job.userName, user_id: job.userId, file_name: job.fileName, period_start: job.periodStart, period_end: job.periodEnd, total_lines: job.totalLines, inserted_count: job.insertedCount, ignored_count: job.ignoredCount, alert_count: job.alertCount, error_count: job.errorCount, status: job.status };
    await supabase.from('import_jobs').upsert([dbJob], { onConflict: 'id' });
  },

  getImportJobs: async (): Promise<ImportJob[]> => {
    const { data } = await supabase.from('import_jobs').select('*').order('timestamp', { ascending: false }).limit(100);
    return (data || []).map(j => ({ id: j.id, timestamp: j.timestamp, source: j.source, userName: j.user_name, userId: j.user_id, fileName: j.file_name, periodStart: j.period_start, periodEnd: j.period_end, totalLines: j.total_lines, insertedCount: j.inserted_count, ignoredCount: j.ignored_count, alertCount: j.alert_count, errorCount: j.error_count, status: j.status }));
  },

  // --- CLOSINGS ---
  closeMonth: async (closing: MonthlyClosing) => {
    // Fix: access closing.closedAt instead of closing.closed_at
    const dbClosing = { id: closing.id, month: closing.month, year: closing.year, closed_at: closing.closedAt, closed_by: closing.closedBy, closed_by_id: closing.closedById, snapshot: closing.snapshot };
    await supabase.from('closings').upsert([dbClosing], { onConflict: 'id' });
  },

  getClosings: async (): Promise<MonthlyClosing[]> => {
    const { data } = await supabase.from('closings').select('*');
    return (data || []).map(c => ({ id: c.id, month: c.month, year: c.year, closedAt: c.closed_at, closedBy: c.closed_by, closedById: c.closed_by_id, snapshot: c.snapshot }));
  },

  isMonthClosed: async (month: number, year: number): Promise<boolean> => {
    const id = `${year}-${month}`;
    const { data } = await supabase.from('closings').select('id').eq('id', id).maybeSingle();
    return !!data;
  }
};
