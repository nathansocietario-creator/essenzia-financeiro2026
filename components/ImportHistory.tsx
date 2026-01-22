
import React, { useEffect, useState } from 'react';
import { storageService } from '../services/storageService.ts';
import { ImportJob, FinancialInstitution } from '../types.ts';
import ImportModal from './ImportModal.tsx';
import ManualEntryModal from './ManualEntryModal.tsx';

interface ImportHistoryProps {
  onRefresh: () => void;
  currentMonth: number;
  currentYear: number;
  isAdmin?: boolean;
}

type DeleteConfirmState = {
  isOpen: boolean;
  type: 'JOB' | 'SOURCE' | 'RESET' | null;
  id: string | null;
  label: string | null;
  error: string | null;
  isProcessing: boolean;
  confirmText?: string;
};

const ImportHistory: React.FC<ImportHistoryProps> = ({ onRefresh, currentMonth, currentYear, isAdmin }) => {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [sources, setSources] = useState<FinancialInstitution[]>([]);
  const [newSourceName, setNewSourceName] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    isOpen: false,
    type: null,
    id: null,
    label: null,
    error: null,
    isProcessing: false,
    confirmText: ''
  });

  const refreshLocalData = async () => {
    setIsLoading(true);
    try {
      const [jobsData, sourcesData] = await Promise.all([
        storageService.getImportJobs(),
        storageService.getSources()
      ]);
      setJobs(jobsData || []);
      setSources(sourcesData || []);
    } catch (error) {
      console.error("Erro ao atualizar histórico de importação:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshLocalData();
  }, []);

  const openDeleteJobConfirm = (id: string, fileName: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'JOB',
      id,
      label: fileName,
      error: null,
      isProcessing: false
    });
  };

  const openResetPeriodConfirm = () => {
    setDeleteConfirm({
      isOpen: true,
      type: 'RESET',
      id: null,
      label: `${currentMonth}/${currentYear}`,
      error: null,
      isProcessing: false,
      confirmText: ''
    });
  };

  const executeAction = async () => {
    if (!deleteConfirm.type) return;

    if (deleteConfirm.type === 'RESET' && deleteConfirm.confirmText !== 'RESET') {
      setDeleteConfirm(prev => ({ ...prev, error: 'Digite RESET para confirmar.' }));
      return;
    }

    setDeleteConfirm(prev => ({ ...prev, isProcessing: true, error: null }));
    
    try {
      if (deleteConfirm.type === 'JOB' && deleteConfirm.id) {
        // [DELETE_IMPORT_CASCADE]
        await storageService.deleteImportJob(deleteConfirm.id);
      } else if (deleteConfirm.type === 'RESET') {
        // [RESET_PERIOD]
        await storageService.resetPeriod(currentMonth, currentYear);
      } else if (deleteConfirm.type === 'SOURCE' && deleteConfirm.id) {
        await storageService.deleteSource(deleteConfirm.id);
      }

      setDeleteConfirm({ isOpen: false, type: null, id: null, label: null, error: null, isProcessing: false });
      
      // OBRIGATÓRIO: Refresh Total do App para limpar dashboard e fluxos
      await refreshLocalData();
      if (onRefresh) await onRefresh();
      
      console.log(`[ACTION_SUCCESS] ${deleteConfirm.type} concluído. Sistema resincronizado.`);
      
    } catch (err: any) {
      console.error(`[ACTION_ERROR] ${deleteConfirm.type}:`, err);
      const errorMsg = err.message || "Ocorreu um erro técnico.";
      setDeleteConfirm(prev => ({ ...prev, isProcessing: false, error: errorMsg }));
      alert(errorMsg);
    }
  };

  const getStatusBadge = (status: ImportJob['status']) => {
    switch (status) {
      case 'CONCLUÍDA':
        return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-black uppercase">Concluída</span>;
      case 'ERRO':
        return <span className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-[10px] font-black uppercase">Erro</span>;
      default:
        return <span className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[10px] font-black uppercase">Processando</span>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">Importações Bancárias</h2>
          <p className="text-sm text-slate-500 font-medium">Gestão de fontes e fluxos de dados</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button 
              onClick={openResetPeriodConfirm}
              className="px-5 py-2.5 text-rose-600 text-sm font-bold hover:bg-rose-50 rounded-xl transition-all border border-rose-100"
            >
              Resetar Período
            </button>
          )}
          <button onClick={() => setIsManualModalOpen(true)} className="px-5 py-2.5 text-slate-600 text-sm font-bold hover:bg-slate-100 rounded-xl transition-all">Lançar Manual</button>
          <button onClick={() => setIsImportModalOpen(true)} className="bg-slate-950 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-xl shadow-slate-900/10">
            <i className="fas fa-file-import text-xs"></i> Importar CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
              <i className="fas fa-university text-blue-500"></i> Fontes Cadastradas
            </h3>
            
            <div className="space-y-3">
              {sources.map(source => (
                <div key={source.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white transition-all">
                  <span className="text-xs font-bold text-slate-700">{source.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                <tr>
                  <th className="px-8 py-5">Data Importação</th>
                  <th className="px-8 py-5">Arquivo / Fonte</th>
                  <th className="px-8 py-5 text-center">Registros</th>
                  <th className="px-8 py-5 text-center">Status</th>
                  <th className="px-8 py-5 text-center">Excluir</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-50">
                {jobs.map(job => (
                  <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5 text-slate-500">{new Date(job.timestamp).toLocaleString('pt-BR')}</td>
                    <td className="px-8 py-5">
                      <div className="font-bold text-slate-900">{job.fileName}</div>
                      <div className="text-[10px] text-blue-600 font-black uppercase">{job.source}</div>
                    </td>
                    <td className="px-8 py-5 text-center font-bold text-emerald-600">{job.insertedCount}</td>
                    <td className="px-8 py-5 text-center">{getStatusBadge(job.status)}</td>
                    <td className="px-8 py-5 text-center">
                      <button 
                        onClick={() => openDeleteJobConfirm(job.id, job.fileName)}                    
                        className="w-10 h-10 rounded-xl text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center mx-auto"
                      >
                        <i className="fas fa-trash-alt text-sm"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && !isLoading && (
                  <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400 italic">Nenhuma importação ativa no sistema.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 p-10 text-center border border-slate-200">
            <div className={`w-20 h-20 ${deleteConfirm.type === 'RESET' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'} rounded-3xl flex items-center justify-center mx-auto mb-6 text-3xl`}>
              <i className={`fas ${deleteConfirm.type === 'RESET' ? 'fa-redo-alt' : 'fa-exclamation-triangle'}`}></i>
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {deleteConfirm.type === 'RESET' ? 'Resetar Período?' : 'Confirmar Exclusão'}
            </h3>
            
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              {deleteConfirm.type === 'RESET' ? (
                <>Deseja limpar todos os dados de <strong>{deleteConfirm.label}</strong>? Transações e Snapshots serão removidos.</>
              ) : (
                <>Deseja excluir a importação <strong>{deleteConfirm.label}</strong>? Todas as transações vinculadas serão removidas do banco.</>
              )}
            </p>

            {deleteConfirm.type === 'RESET' && (
              <input 
                type="text"
                placeholder="Digite RESET para confirmar"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 text-center font-bold text-sm outline-none focus:border-rose-500"
                value={deleteConfirm.confirmText}
                onChange={e => setDeleteConfirm({...deleteConfirm, confirmText: e.target.value})}
              />
            )}

            {deleteConfirm.error && (
              <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-lg border border-rose-100">{deleteConfirm.error}</div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setDeleteConfirm({ isOpen: false, type: null, id: null, label: null, error: null, isProcessing: false })}
                className="py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl text-[10px] tracking-widest uppercase disabled:opacity-50"
                disabled={deleteConfirm.isProcessing}
              >
                Cancelar
              </button>
              <button 
                onClick={executeAction}
                disabled={deleteConfirm.isProcessing}
                className={`py-4 ${deleteConfirm.type === 'RESET' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'} text-white font-bold rounded-2xl text-[10px] tracking-widest uppercase shadow-lg disabled:opacity-50 flex items-center justify-center`}
              >
                {deleteConfirm.isProcessing ? <i className="fas fa-circle-notch fa-spin"></i> : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isImportModalOpen && <ImportModal onClose={() => setIsImportModalOpen(false)} onSuccess={refreshLocalData} />}
      {isManualModalOpen && <ManualEntryModal onClose={() => setIsManualModalOpen(false)} onSuccess={refreshLocalData} />}
    </div>
  );
};

export default ImportHistory;
