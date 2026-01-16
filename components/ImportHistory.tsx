
import React, { useEffect, useState } from 'react';
import { storageService } from '../services/storageService';
import { ImportJob, FinancialInstitution } from '../types';
import ImportModal from './ImportModal';
import ManualEntryModal from './ManualEntryModal';

interface ImportHistoryProps {
  onRefresh: () => void;
}

const ImportHistory: React.FC<ImportHistoryProps> = ({ onRefresh }) => {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [sources, setSources] = useState<FinancialInstitution[]>([]);
  const [newSourceName, setNewSourceName] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  const refreshData = () => {
    setJobs(storageService.getImportJobs());
    setSources(storageService.getSources());
    onRefresh();
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim()) return;
    storageService.addSource(newSourceName.trim());
    setNewSourceName('');
    refreshData();
  };

  const handleDeleteSource = (id: string) => {
    if (confirm(`Deseja remover a instituição "${sources.find(s=>s.id===id)?.name}"?\n\nAs transações já importadas sob este nome permanecerão no histórico, mas você não poderá mais selecionar esta fonte para novos lançamentos.`)) {
      storageService.deleteSource(id);
      refreshData();
    }
  };

  const getStatusBadge = (status: ImportJob['status']) => {
    switch (status) {
      case 'CONCLUÍDA':
        return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-widest">Concluída</span>;
      case 'CONCLUÍDA_COM_ALERTAS':
        return <span className="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-[10px] font-black uppercase tracking-widest">Com Alertas</span>;
      case 'PROCESSANDO':
        return <span className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">Processando</span>;
      case 'ERRO':
        return <span className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-[10px] font-black uppercase tracking-widest">Erro</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">Importações e Fontes</h2>
          <p className="text-sm text-slate-500 font-medium">Gestão de arquivos e instituições financeiras</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsManualModalOpen(true)}
            className="px-5 py-2.5 text-slate-600 text-sm font-bold hover:bg-slate-100 rounded-xl transition-all"
          >
            Lançar Manual
          </button>
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="bg-slate-950 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 flex items-center gap-2"
          >
            <i className="fas fa-file-import text-xs"></i> Importar Extrato CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Painel de Gestão de Fontes */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
              <i className="fas fa-university text-blue-500"></i> Gestão de Instituições
            </h3>
            
            <form onSubmit={handleAddSource} className="mb-8">
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Cadastrar Novo Banco</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Ex: Nubank, Itaú..."
                  className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-700 p-2">
                  <i className="fas fa-plus-circle text-lg"></i>
                </button>
              </div>
            </form>

            <div className="space-y-3">
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Instituições Ativas</label>
              {sources.map(source => (
                <div key={source.id} className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl group hover:bg-white hover:border hover:border-slate-100 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-blue-500 transition-colors"></div>
                    <span className="text-xs font-bold text-slate-700">{source.name}</span>
                  </div>
                  {source.id !== 'ASAAS' && source.id !== 'MANUAL' ? (
                    <button 
                      onClick={() => handleDeleteSource(source.id)}
                      className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                      title="Remover Instituição"
                    >
                      <i className="fas fa-trash-alt text-[10px]"></i>
                    </button>
                  ) : (
                    <i className="fas fa-lock text-[10px] text-slate-200" title="Fonte Protegida (Padrão)"></i>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-blue-600 text-white p-6 rounded-[2rem] shadow-xl shadow-blue-900/10">
            <i className="fas fa-shield-alt mb-3 opacity-50"></i>
            <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-70">Multifonte</p>
            <p className="text-xs leading-relaxed font-medium">Ao cadastrar um banco, ele se torna uma opção no **Importador**. Você pode usar o mesmo arquivo de extrato em diferentes "carteiras" bancárias.</p>
          </div>
        </div>

        {/* Tabela de Histórico */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
               <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Histórico de Auditoria</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black tracking-[0.15em]">
                  <tr>
                    <th className="px-8 py-5">Data / Hora</th>
                    <th className="px-8 py-5">Arquivo / Fonte</th>
                    <th className="px-8 py-5 text-center">Inseridas</th>
                    <th className="px-8 py-5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-50">
                  {jobs.length > 0 ? jobs.map(job => (
                    <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5 whitespace-nowrap text-slate-500 font-medium text-xs">
                        {new Date(job.timestamp).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-8 py-5">
                        <div className="font-bold text-slate-900 mb-0.5 text-xs">{job.fileName}</div>
                        <div className="text-[10px] text-blue-600 font-black uppercase tracking-wider">
                          {sources.find(s => s.id === job.source)?.name || job.source}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="font-bold text-emerald-600 text-xs">{job.insertedCount}</span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        {getStatusBadge(job.status)}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center text-slate-400 italic text-sm">
                        Nenhuma importação registrada no histórico.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {isImportModalOpen && (
        <ImportModal 
          onClose={() => setIsImportModalOpen(false)} 
          onSuccess={refreshData} 
        />
      )}
      {isManualModalOpen && (
        <ManualEntryModal 
          onClose={() => setIsManualModalOpen(false)} 
          onSuccess={refreshData} 
        />
      )}
    </div>
  );
};

export default ImportHistory;
