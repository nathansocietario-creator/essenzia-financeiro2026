
import { Transaction, ImportJob, MonthlyClosing, FinancialInstitution, User, AuditLog } from '../types.ts';
import { supabase } from './supabase.ts';

const mapTransactionToDB = (t: Transaction) => ({
  date: t.date,
  description: t.description,
  amount: t.amount,
  type: t.type,
  category: t.category,
  source: t.source,
  status: t.status,
  audit_status: t.auditStatus, 
  import_id: t.importId,
  transaction_key: t.transactionKey,
  month: t.month,
  year: t.year,
  observations: t.observations,
  created_by: t.createdBy,
  updated_by: t.updatedBy
});

const mapTransactionFromDB = (t: any): Transaction => ({
  id: t.id,
  date: t.date,
  description: t.description,
  amount: t.amount,
  type: t.type,
  category: t.category,
  originalDate: t.date,
  originalDescription: t.description,
  originalAmount: t.amount,
  originalType: t.type,
  auditStatus: t.audit_status || 'PENDENTE', 
  source: t.source,
  account: t.source,
  paymentMethod: 'Arquivo',
  status: t.status,
  observations: t.observations || '',
  importId: t.import_id,
  transactionKey: t.transaction_key,
  confidenceScore: 100,
  month: t.month,
  year: t.year,
  createdBy: t.created_by,
  updatedBy: t.updated_by
});

export const storageService = {
  getUsers: async (): Promise<User[]> => {
    const { data } = await supabase.from('app_users').select('*').order('created_at', { ascending: false });
    return (data || []).map(u => ({
      id: u.id, name: u.name, email: u.email, passwordHash: u.password_hash,
      role: u.role, active: u.active, lastLoginAt: u.last_login_at, createdAt: u.created_at
    }));
  },

  updateUser: async (id: string, updates: any) => {
    await supabase.from('app_users').update(updates).eq('id', id);
  },

  saveUser: async (user: User) => {
    await supabase.from('app_users').insert([{
      id: user.id, name: user.name, email: user.email, password_hash: user.passwordHash,
      role: user.role, active: user.active, created_at: user.createdAt
    }]);
  },

  deleteUser: async (id: string) => {
    await supabase.from('app_users').delete().eq('id', id);
  },

  saveTransactions: async (transactions: Transaction[]) => {
    const toInsert = transactions.map(mapTransactionToDB);
    const { data, error } = await supabase.from('transactions').upsert(toInsert, { 
      onConflict: 'transaction_key',
      ignoreDuplicates: true 
    }).select('transaction_key');
    if (error) throw error;
    const insertedCount = (data || []).length;
    return { inserted: insertedCount, ignored: transactions.length - insertedCount };
  },

  getTransactions: async (): Promise<Transaction[]> => {
    const { data } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    return (data || []).map(mapTransactionFromDB);
  },

  updateTransaction: async (updated: Transaction, userId?: string) => {
    await supabase.from('transactions').update({ 
      ...mapTransactionToDB(updated), 
      updated_by: userId 
    }).eq('transaction_key', updated.transactionKey);
  },

  logAction: async (userId: string, userName: string, action: string, details: string, extra?: Partial<AuditLog>) => {
    const log = { 
      user_id: userId, 
      user_name: userName, 
      action, 
      details, 
      timestamp: new Date().toISOString(),
      transaction_key: extra?.transactionKey,
      old_value: extra?.oldValue,
      new_value: extra?.newValue,
      reason: extra?.reason
    };
    await supabase.from('audit_logs').insert([log]);
  },

  getAuditLogs: async (): Promise<AuditLog[]> => {
    const { data } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(200);
    return (data || []).map(l => ({ 
      id: l.id, userId: l.user_id, userName: l.user_name, action: l.action, 
      details: l.details, timestamp: l.timestamp, 
      transactionKey: l.transaction_key, oldValue: l.old_value, newValue: l.new_value, reason: l.reason 
    }));
  },

  getSources: async (): Promise<FinancialInstitution[]> => {
    const { data } = await supabase.from('sources').select('*');
    return data || [{ id: 'ASAAS', name: 'Asaas' }, { id: 'MANUAL', name: 'Manual' }];
  },

  addSource: async (name: string) => {
    const id = name.toUpperCase().replace(/\s+/g, '_');
    const { error } = await supabase.from('sources').insert([{ id, name }]);
    if (error) throw error;
  },

  deleteSource: async (id: string) => {
    const { data, error } = await supabase.from('sources').delete().eq('id', id).select();
    if (error) throw error;
    return { data, error };
  },

  saveImportJob: async (job: ImportJob) => {
    await supabase.from('import_jobs').upsert([{
      id: job.id, timestamp: job.timestamp, source: job.source, user_name: job.userName, 
      user_id: job.userId, file_name: job.fileName, period_start: job.periodStart, 
      period_end: job.periodEnd, total_lines: job.totalLines, inserted_count: job.insertedCount, 
      ignored_count: job.ignoredCount, status: job.status
    }]);
  },

  getImportJobs: async (): Promise<ImportJob[]> => {
    const { data } = await supabase.from('import_jobs').select('*').order('timestamp', { ascending: false });
    return (data || []).map(j => ({
      id: j.id, timestamp: j.timestamp, source: j.source, userName: j.user_name, userId: j.user_id,
      fileName: j.file_name, periodStart: j.period_start, periodEnd: j.period_end, totalLines: j.total_lines,
      insertedCount: j.inserted_count, ignoredCount: j.ignored_count, alertCount: 0, errorCount: 0, status: j.status
    }));
  },

  /**
   * Remove permanentemente um job de importação e TODAS as suas transações vinculadas via RPC.
   */
  deleteImportJob: async (id: string) => {
    const { data, error } = await supabase.rpc('delete_import_cascade', {
      p_import_id: id
    });

    if (error) {
      console.error("[STORAGE] Erro ao deletar importação via cascade:", error);
      throw error;
    }
    return { deletedTransactions: data || 0 };
  },

  /**
   * Reseta um período inteiro (transações e snapshots) via RPC.
   */
  resetPeriod: async (month: number, year: number) => {
    const { data, error } = await supabase.rpc('reset_period', {
      p_month: month,
      p_year: year
    });

    if (error) {
      console.error("[STORAGE] Erro ao resetar período via RPC:", error);
      throw error;
    }
    return data;
  },

  getPeriodClosing: async (year: number, month: number) => {
    const period_key = `${year}-${String(month).padStart(2, '0')}`;
    const { data, error } = await supabase
      .from('period_closings')
      .select('*')
      .eq('period_key', period_key)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  finalizePeriod: async (month: number, year: number, userId: string): Promise<{ updated_count: number }> => {
    const { data, error } = await supabase.rpc('finalize_period', {
      p_month: month,
      p_year: year,
      p_user: userId
    });
    
    if (error) {
      console.error("[STORAGE] Erro ao finalizar período via RPC:", error);
      throw error;
    }
    return { updated_count: data || 0 };
  },

  isMonthClosed: async (month: number, year: number): Promise<boolean> => {
    const period_key = `${year}-${String(month).padStart(2, '0')}`;
    const { data } = await supabase.from('period_closings').select('is_closed').eq('period_key', period_key).maybeSingle();
    return !!data?.is_closed;
  }
};
