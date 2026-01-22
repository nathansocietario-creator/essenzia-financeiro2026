
import { supabase } from './supabase';
import { BackupEntry, RestoreLog, SnapshotDetail } from '../types';

export const backupService = {
  /**
   * Lista snapshots disponíveis para um período específico
   */
  listSnapshots: async (year: number, month: number): Promise<BackupEntry[]> => {
    const { data, error } = await supabase
      .from('period_snapshots')
      .select('id, created_at, label, tx_count, year, month, created_by')
      .eq('year', year)
      .eq('month', month)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao listar snapshots:', error);
      throw new Error(error.message || 'Erro ao conectar ao banco de dados.');
    }
    
    return (data || []).map(b => ({
      id: b.id,
      created_at: b.created_at,
      reason: b.label || `Snapshot ${month}/${year}`,
      row_count: b.tx_count || 0,
      year: b.year,
      month: b.month,
      created_by: b.created_by,
      status: 'Íntegro'
    }));
  },

  /**
   * Cria um novo snapshot do período atual via RPC atômico
   */
  createSnapshot: async (year: number, month: number, label: string): Promise<string> => {
    const { data, error } = await supabase.rpc('create_period_snapshot', {
      p_year: year,
      p_month: month,
      p_label: label || `Snapshot ${month}/${year}`
    });

    if (error) {
      console.error('Falha no RPC create_period_snapshot:', error);
      throw new Error(`${error.message}${error.details ? ' - ' + error.details : ''}`);
    }
    return data; 
  },

  /**
   * Executa a restauração atômica de um snapshot via RPC
   */
  restoreSnapshot: async (snapshotId: string, reason: string): Promise<{deleted_count: number, inserted_count: number}> => {
    const { data, error } = await supabase.rpc('restore_period_snapshot', {
      p_snapshot_id: snapshotId,
      p_reason: reason
    });

    if (error) {
      console.error('Falha crítica no RPC restore_period_snapshot:', error);
      throw new Error(`${error.message}${error.details ? ' - ' + error.details : ''}`);
    }
    return data; 
  },

  /**
   * Remove um snapshot permanentemente
   */
  deleteSnapshot: async (id: string) => {
    console.log(`[backupService] Excluindo snapshot ID: ${id}`);
    const result = await supabase.from('period_snapshots').delete().eq('id', id).select();
    if (result.error) console.error('[backupService] Erro ao deletar snapshot:', result.error);
    return result;
  },

  /**
   * Lista logs de restauração para auditoria do período
   */
  listRestoreLogs: async (year: number, month: number): Promise<RestoreLog[]> => {
    const { data, error } = await supabase
      .from('restore_logs')
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .order('restored_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Busca detalhes completos de um snapshot específico
   */
  getSnapshotDetails: async (id: string): Promise<SnapshotDetail> => {
    const { data, error } = await supabase
      .from('period_snapshots')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw new Error(error.message);
    return {
      ...data,
      reason: data.label,
      row_count: data.tx_count,
      data_snapshot: data.snapshot_items || [], 
      audit_snapshot: []
    };
  }
};
