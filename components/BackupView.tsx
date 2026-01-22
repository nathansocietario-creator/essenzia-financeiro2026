
import React, { useState, useEffect } from 'react';
import { backupService } from '../services/backupService';
import { storageService } from '../services/storageService';
import { authService } from '../services/authService';
import { BackupEntry, RestoreLog, SnapshotDetail, AuthSession } from '../types';
import { formatBRL } from '../utils/finance';

interface BackupViewProps {
  canRestore: boolean;
  globalYear: number;
  globalMonth: number;
}

type DeleteConfirmState = {
  isOpen: boolean;
  backup: BackupEntry | null;
  error: string | null;
  isProcessing: boolean;
};

const BackupView: React.FC<BackupViewProps> = ({ canRestore, globalYear, globalMonth }) => {
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [restoreLogs, setRestoreLogs] = useState<RestoreLog[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);

  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [showConfirmCreate, setShowConfirmCreate] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState<{show: boolean, backup: BackupEntry | null}>({show: false, backup: null});
  const [showDetails, setShowDetails] = useState<{show: boolean, data: SnapshotDetail | null}>({show: false, data: null});

  // Estado para o modal de exclusão
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    isOpen: false,
    backup: null,
    error: null,
    isProcessing: false
  });

  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const [restoreReason, setRestoreReason] = useState('');

  useEffect(() => {
    authService.getSession().then(setSession);
  }, []);

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [bks, logs] = await Promise.all([
        backupService.listSnapshots(globalYear, globalMonth),
        backupService.listRestoreLogs(globalYear, globalMonth)
      ]);
      setBackups(bks);
      setRestoreLogs(logs);
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [globalYear, globalMonth]);

  const handleCreateSnapshot = async () => {
    if (actionLoading || !session) return;
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await backupService.createSnapshot(globalYear, globalMonth, snapshotLabel || `Snapshot ${globalMonth}/${globalYear}`);
      
      // Log de auditoria
      await storageService.logAction(
        session.user.id,
        session.user.name,
        'BACKUP_CRIADO',
        `Criou snapshot do período ${globalMonth}/${globalYear}: ${snapshotLabel || 'Padrão'}`
      );

      setShowConfirmCreate(false);
      setSnapshotLabel('');
      await loadData();
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openDeleteConfirm = (backup: BackupEntry) => {
    setDeleteConfirm({
      isOpen: true,
      backup,
      error: null,
      isProcessing: false
    });
  };

  const closeDeleteConfirm = () => {
    if (deleteConfirm.isProcessing) return;
    setDeleteConfirm({ isOpen: false, backup: null, error: null, isProcessing: false });
  };

  const executeDeleteSnapshot = async () => {
    if (!deleteConfirm.backup || !session) return;

    setDeleteConfirm(prev => ({ ...prev, isProcessing: true, error: null }));
    try {
      const result = await backupService.deleteSnapshot(deleteConfirm.backup.id);
      
      if (result.error) throw result.error;

      if (result.data && result.data.length > 0) {
        // Auditoria
        await storageService.logAction(
          session.user.id,
          session.user.name,
          'BACKUP_EXCLUIDO',
          `Excluiu snapshot ID: ${deleteConfirm.backup.id} (${deleteConfirm.backup.reason})`
        );

        setBackups(prev => prev.filter(b => b.id !== deleteConfirm.backup?.id));
        setDeleteConfirm({ isOpen: false, backup: null, error: null, isProcessing: false });
      } else {
        setDeleteConfirm(prev => ({ ...prev, isProcessing: false, error: "O snapshot não foi encontrado no banco." }));
      }
    } catch (err: any) {
      console.error("[DELETE SNAPSHOT] Erro:", err);
      setDeleteConfirm(prev => ({ ...prev, isProcessing: false, error: err.message || "Erro ao excluir snapshot." }));
    }
  };

  const handleExecuteRestore = async () => {
    if (!canRestore || !session) return;

    if (!showRestoreModal.backup || actionLoading) return;
    
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await backupService.restoreSnapshot(showRestoreModal.backup.id, restoreReason);
      
      // Auditoria
      await storageService.logAction(
        session.user.id,
        session.user.name,
        'BACKUP_RESTAURADO',
        `Restaurou período ${globalMonth}/${globalYear} usando snapshot ${showRestoreModal.backup.reason}. Motivo: ${restoreReason}`
      );

      setShowRestoreModal({show: false, backup: null});
      setRestoreConfirmText('');
      setRestoreReason('');
      await loadData();
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDetails = async (id: string) => {
    setLoading(true);
    try {
      const details = await backupService.getSnapshotDetails(id);
      setShowDetails({show: true, data: details});
    } catch (e: any) {
      console.error("Erro ao buscar detalhes:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-950 tracking-tighter">Backups e Recuperação</h2>
          <p className="text-sm text-slate-500 font-medium">Snapshots e restauração de períodos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <i className="fas fa-camera"></i>
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Novo Snapshot</h3>
            </div>
            
            <div className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Um snapshot captura o estado completo das transações de <strong>{globalMonth}/{globalYear}</strong>.
              </p>
              
              <input 
                type="text" 
                placeholder="Rótulo do snapshot..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm outline-none focus:border-blue-500 transition-all"
                value={snapshotLabel}
                onChange={e => setSnapshotLabel(e.target.value)}
              />

              <button 
                onClick={() => setShowConfirmCreate(true)}
                disabled={actionLoading}
                className="w-full bg-slate-950 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50"
              >
                {actionLoading ? <i className="fas fa-spinner fa-spin mr-2"></i> : 'Criar Snapshot'}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[350px]">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Pontos de Recuperação ({backups.length})</h3>
              <button onClick={loadData} disabled={loading} className="p-2 text-slate-300 hover:text-blue-500"><i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i></button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-5">Identificação</th>
                    <th className="px-8 py-5 text-center">Registros</th>
                    <th className="px-8 py-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {backups.map(bk => (
                    <tr key={bk.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="text-sm font-bold text-slate-900">{bk.reason}</div>
                        <div className="text-[10px] text-slate-400 mt-1">{bk.created_by} • {new Date(bk.created_at).toLocaleString('pt-BR')}</div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="text-xs font-black text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">{bk.row_count} txs</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleOpenDetails(bk.id)} className="p-2.5 text-slate-400 hover:text-blue-600" title="Ver Detalhes"><i className="fas fa-eye text-xs"></i></button>
                          
                          {canRestore && (
                            <>
                              <button 
                                onClick={() => setShowRestoreModal({show: true, backup: bk})}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-all shadow-lg"
                              >
                                Restaurar
                              </button>
                              <button 
                                onClick={() => openDeleteConfirm(bk)}
                                className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                title="Excluir Snapshot"
                              >
                                <i className="fas fa-trash-alt text-xs"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {backups.length === 0 && !loading && (
                    <tr><td colSpan={3} className="px-8 py-20 text-center text-slate-400 italic">Nenhum snapshot encontrado para este período.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Confirmação de Criação */}
      {showConfirmCreate && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 p-8 text-center">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 text-3xl">
              <i className="fas fa-camera"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Criar Novo Snapshot?</h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              Isso irá salvar o estado atual de todas as transações de <strong>{globalMonth}/{globalYear}</strong> para recuperação futura.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => !actionLoading && setShowConfirmCreate(false)} 
                className="py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl uppercase text-[10px]"
                disabled={actionLoading}
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreateSnapshot}
                disabled={actionLoading}
                className="py-4 bg-blue-600 text-white font-bold rounded-2xl uppercase text-[10px] shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center"
              >
                {actionLoading ? <i className="fas fa-spinner fa-spin"></i> : "Sim, Criar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Exclusão de Snapshot */}
      {deleteConfirm.isOpen && deleteConfirm.backup && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[550] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 p-10 text-center border border-slate-200">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 text-3xl">
              <i className="fas fa-trash-alt"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Excluir Snapshot?</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Deseja remover permanentemente o snapshot:<br/>
              <span className="font-bold text-slate-900">{deleteConfirm.backup.reason}</span>?
            </p>

            {deleteConfirm.error && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold animate-in shake duration-300">
                {deleteConfirm.error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={closeDeleteConfirm}
                disabled={deleteConfirm.isProcessing}
                className="py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={executeDeleteSnapshot}
                disabled={deleteConfirm.isProcessing}
                className="py-4 bg-rose-600 text-white font-bold rounded-2xl uppercase text-[10px] tracking-widest shadow-lg shadow-rose-500/20 hover:bg-rose-700 transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {deleteConfirm.isProcessing ? <i className="fas fa-circle-notch fa-spin"></i> : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Restauração Crítica */}
      {showRestoreModal.show && showRestoreModal.backup && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[500] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-10 text-center">
              <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-4xl shadow-inner animate-pulse">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-4">Restauração Crítica</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                Você está prestes a substituir permanentemente os dados de <strong>{showRestoreModal.backup.month}/{showRestoreModal.backup.year}</strong>.
              </p>
              
              <div className="space-y-4 mb-8">
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-rose-500"
                  placeholder="Justificativa da restauração..."
                  rows={2}
                  value={restoreReason}
                  onChange={e => setRestoreReason(e.target.value)}
                />
                <input 
                  type="text" 
                  className="w-full bg-white border-2 border-rose-100 rounded-xl p-4 text-center font-black text-rose-600 uppercase"
                  placeholder="DIGITE RESTAURAR"
                  value={restoreConfirmText}
                  onChange={e => setRestoreConfirmText(e.target.value.toUpperCase())}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setShowRestoreModal({show: false, backup: null})} className="py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl uppercase text-[10px]">Cancelar</button>
                <button 
                  onClick={handleExecuteRestore}
                  disabled={restoreConfirmText !== 'RESTAURAR' || !restoreReason.trim() || actionLoading}
                  className="py-4 bg-rose-600 text-white font-bold rounded-2xl uppercase text-[10px] disabled:opacity-20"
                >
                  {actionLoading ? <i className="fas fa-spinner fa-spin"></i> : "Confirmar Restauração"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Detalhes do Snapshot */}
      {showDetails.show && showDetails.data && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <div>
                 <h3 className="text-lg font-bold text-slate-900">Detalhes do Snapshot</h3>
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{showDetails.data.reason}</p>
               </div>
               <button onClick={() => setShowDetails({show: false, data: null})} className="text-slate-400 hover:text-slate-600"><i className="fas fa-times"></i></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
               <div className="grid grid-cols-3 gap-4 mb-8">
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Total Transações</p>
                   <p className="text-xl font-bold text-slate-900">{showDetails.data.row_count}</p>
                 </div>
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Período</p>
                   <p className="text-xl font-bold text-slate-900">{showDetails.data.month}/{showDetails.data.year}</p>
                 </div>
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Autor</p>
                   <p className="text-xl font-bold text-slate-900 truncate" title={showDetails.data.created_by}>{showDetails.data.created_by?.split(' ')[0] || 'Sistema'}</p>
                 </div>
               </div>
               
               <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 ml-1">Lançamentos Capturados (Top 50)</h4>
               <div className="border border-slate-100 rounded-2xl overflow-hidden">
                 <table className="w-full text-xs text-left">
                   <thead className="bg-slate-50 border-b border-slate-100 font-black text-[9px] uppercase text-slate-400">
                     <tr>
                       <th className="px-4 py-3">Data</th>
                       <th className="px-4 py-3">Descrição</th>
                       <th className="px-4 py-3 text-right">Valor</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {showDetails.data.data_snapshot?.slice(0, 50).map((tx: any, i: number) => (
                       <tr key={i}>
                         <td className="px-4 py-3 text-slate-500">{new Date(tx.date).toLocaleDateString('pt-BR')}</td>
                         <td className="px-4 py-3 font-bold text-slate-700 truncate max-w-[200px]">{tx.description}</td>
                         <td className={`px-4 py-3 text-right font-bold ${tx.type === 'ENTRADA' ? 'text-emerald-600' : 'text-slate-900'}`}>{formatBRL(tx.amount)}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
            <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
               <button onClick={() => setShowDetails({show: false, data: null})} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Fechar Prévia</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupView;
