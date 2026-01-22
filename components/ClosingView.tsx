
import React, { useState, useEffect, useMemo } from 'react';
import { storageService } from '../services/storageService';
import { authService } from '../services/authService';
import { Transaction, TransactionType, AuthSession } from '../types';
import { impactsResult, formatBRL } from '../utils/finance';
import { supabase } from '../services/supabase';

interface ClosingViewProps {
  transactions: Transaction[];
  month: number;
  year: number;
  onRefresh?: () => void;
}

const ClosingView: React.FC<ClosingViewProps> = ({ transactions, month, year, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<TransactionType>('SAIDA');
  const [isMonthClosed, setIsMonthClosed] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [justSavedIds, setJustSavedIds] = useState<Record<string, boolean>>({});
  const [globalLoading, setGlobalLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  useEffect(() => {
    authService.getSession().then(setSession);
    fetchClosingStatus();
  }, [month, year]);

  const fetchClosingStatus = async () => {
    try {
      const closing = await storageService.getPeriodClosing(year, month);
      setIsMonthClosed(!!closing?.is_closed);
    } catch (err) {
      console.error("[ClosingView] Erro ao buscar status:", err);
    }
  };

  const handleFinalizePeriod = async () => {
    if (!session || isMonthClosed || globalLoading) return;
    
    console.log('[FINALIZE_RPC] Iniciando fechamento de período', { month, year });
    
    const confirmMsg = `Confirmar fechamento de ${month}/${year}?\n\nEsta ação irá marcar todos os lançamentos como AUDITADO e bloquear edições.`;
    if (!window.confirm(confirmMsg)) return;

    setGlobalLoading(true);
    setSuccessMessage(false);

    try {
      // 1. Chamar RPC no Supabase
      const result = await storageService.finalizePeriod(month, year, session.user.id);
      console.log('[FINALIZE_RPC] Sucesso no fechamento', result);

      // 2. Disparar Refresh Global (Recarrega transações e dashboard)
      if (onRefresh) {
        await onRefresh();
        console.log('[FINALIZE_RPC] Interface sincronizada');
      }

      // 3. Atualizar UI local
      setIsMonthClosed(true);
      setSuccessMessage(true);
      
      alert(`Período finalizado com sucesso! ${result.updated_count} transações auditadas.`);
      
      setTimeout(() => setSuccessMessage(false), 5000);
    } catch (e: any) {
      console.error("[FINALIZE_RPC] Erro durante o processo", e);
      alert(`Falha ao finalizar: ${e.message || 'Erro de comunicação com o banco'}`);
    } finally {
      setGlobalLoading(false);
    }
  };

  const stats = useMemo(() => {
    let ent = 0; 
    let saiImpact = 0;
    (transactions || []).forEach(t => {
      if (t.type === 'ENTRADA') ent += t.amount;
      else if (impactsResult(t.category)) saiImpact += t.amount;
    });
    return { ent, saiImpact, res: ent - saiImpact, total: (transactions || []).length };
  }, [transactions]);

  const handleInlineUpdate = async (t: Transaction, newCategory: string) => {
    if (!session || isMonthClosed) return;
    const key = t.transactionKey;
    setSavingIds(prev => ({ ...prev, [key]: true }));
    try {
      await storageService.updateTransaction({ ...t, category: newCategory }, session.user.id);
      setJustSavedIds(prev => ({ ...prev, [key]: true }));
      setTimeout(() => setJustSavedIds(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      }), 2000);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert("Falha ao salvar alteração.");
    } finally {
      setSavingIds(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleObservationUpdate = async (t: Transaction, newObs: string) => {
    if (!session || isMonthClosed || t.observations === newObs) return;
    const key = t.transactionKey;
    setSavingIds(prev => ({ ...prev, [key]: true }));
    try {
      await storageService.updateTransaction({ ...t, observations: newObs }, session.user.id);
      setJustSavedIds(prev => ({ ...prev, [key]: true }));
      setTimeout(() => setJustSavedIds(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      }), 2000);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingIds(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleReopen = async () => {
    if (!session || !isMonthClosed || globalLoading || session.user.role !== 'ADMIN') return;
    if (!window.confirm("Reabrir este período?")) return;
    setGlobalLoading(true);
    try {
      const period_key = `${year}-${String(month).padStart(2, '0')}`;
      await supabase.from('period_closings').delete().eq('period_key', period_key);
      setIsMonthClosed(false);
      if (onRefresh) onRefresh();
    } catch (e) {
      alert("Erro ao reabrir.");
    } finally {
      setGlobalLoading(false);
    }
  };

  const categories = activeTab === 'ENTRADA' 
    ? ['Honorários contábeis mensais', 'Honorários de abertura de empresa', 'Honorários de alteração contratual', 'Honorários de encerramento de empresa', 'Honorários de regularizações', 'Aporte de Capital', 'Outros']
    : ['Aluguel / Condomínio', 'Energia elétrica', 'Água', 'Internet / Telefonia', 'Sistemas contábeis', 'Certificado digital', 'Honorários contábeis terceirizados', 'Material de escritório', 'Marketing e publicidade', 'Tráfego pago / anúncios', 'Serviços de terceiros', 'Manutenção / TI', 'Consultoria externa', 'Impostos e taxas', 'Taxas e Tarifas', 'Despesas bancárias', 'Retirada de lucro', 'Pro-labore', 'Outros'];

  const filteredTransactions = (transactions || []).filter(t => t.type === activeTab);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="bg-slate-950 text-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-10 border border-slate-800">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-4xl font-black tracking-tighter">Fechamento Mensal</h2>
            {isMonthClosed && (
              <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 flex items-center gap-1.5">
                <i className="fas fa-lock"></i> Período Fechado
              </span>
            )}
          </div>
          <p className="text-slate-400 text-sm font-medium">Competência: <span className="text-white font-bold capitalize">{new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long' })} / {year}</span></p>
          
          <div className="flex gap-8 mt-8 border-t border-slate-900 pt-8">
            <div>
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Entradas</p>
              <p className="text-sm font-bold text-emerald-400">{formatBRL(stats.ent)}</p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Saídas Op.</p>
              <p className="text-sm font-bold text-rose-400">{formatBRL(stats.saiImpact)}</p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Resultado Líquido</p>
              <p className={`text-sm font-bold ${stats.res >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>{formatBRL(stats.res)}</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-3 shrink-0">
          {!isMonthClosed ? (
            <button 
              type="button"
              onClick={handleFinalizePeriod} 
              disabled={globalLoading}
              className={`px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 transition-all bg-blue-600 hover:bg-blue-500 text-white shadow-2xl shadow-blue-600/20 active:scale-95 disabled:opacity-50 min-w-[200px]`}
            >
              {globalLoading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-check-double"></i>} 
              {globalLoading ? 'Processando...' : 'Finalizar Período'}
            </button>
          ) : (
            <div className="flex flex-col items-center gap-4">
               <div className="bg-emerald-500/10 text-emerald-400 px-8 py-4 rounded-2xl border border-emerald-500/20 flex items-center gap-3">
                  <i className="fas fa-check-circle"></i>
                  <span className="font-black uppercase text-[10px] tracking-widest">Snapshot Consolidado</span>
               </div>
               {session?.user.role === 'ADMIN' && (
                 <button onClick={handleReopen} className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-500 transition-colors">
                   <i className="fas fa-unlock mr-2"></i> Reabrir Período
                 </button>
               )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden min-h-[500px] relative">
        {isMonthClosed && (
          <div className="absolute inset-0 bg-slate-50/10 backdrop-blur-[1px] z-10 pointer-events-none flex items-center justify-center">
             <div className="bg-slate-900/90 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl scale-110 border border-slate-700">
                <i className="fas fa-lock text-amber-400"></i>
                <span className="text-[10px] font-black uppercase tracking-widest">Dados Imutáveis - Período Encerrado</span>
             </div>
          </div>
        )}

        <div className="p-6 border-b border-slate-100 flex justify-between bg-slate-50/50">
          <div className="flex bg-slate-100 p-1.5 rounded-xl">
            <button onClick={() => setActiveTab('SAIDA')} className={`px-8 py-2.5 rounded-lg text-xs font-black uppercase transition-all ${activeTab === 'SAIDA' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Saídas</button>
            <button onClick={() => setActiveTab('ENTRADA')} className={`px-8 py-2.5 rounded-lg text-xs font-black uppercase transition-all ${activeTab === 'ENTRADA' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Entradas</button>
          </div>
          <div className="flex items-center gap-2 px-4 text-slate-400">
             <i className="fas fa-info-circle text-xs"></i>
             <span className="text-[10px] font-medium">Conferência de categorias para fechamento contábil.</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-8 py-4">Data</th>
                <th className="px-8 py-4">Lançamento / Origem</th>
                <th className="px-8 py-4 w-1/4">Categoria</th>
                <th className="px-8 py-4 text-right">Valor</th>
                <th className="px-8 py-4 text-center">Auditoria</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTransactions.map(t => {
                const isSaving = savingIds[t.transactionKey];
                const justSaved = justSavedIds[t.transactionKey];
                return (
                  <tr key={t.transactionKey} className={`hover:bg-slate-50/50 transition-colors ${isMonthClosed ? 'bg-slate-50/20' : ''}`}>
                    <td className="px-8 py-4 text-[11px] text-slate-500 font-medium">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-8 py-4">
                       <p className="text-xs font-bold text-slate-900">{t.description}</p>
                       <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{t.source}</p>
                    </td>
                    <td className="px-8 py-4">
                      <select 
                        className={`w-full bg-slate-50 border ${justSaved ? 'border-emerald-500 shadow-sm shadow-emerald-100' : 'border-slate-200'} rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 transition-all ${isMonthClosed ? 'opacity-60 pointer-events-none' : 'cursor-pointer hover:border-slate-300'}`}
                        value={t.category}
                        disabled={isMonthClosed || isSaving}
                        onChange={(e) => handleInlineUpdate(t, e.target.value)}
                      >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className={`px-8 py-4 text-right font-bold text-xs ${t.type === 'ENTRADA' ? 'text-emerald-600' : 'text-slate-900'}`}>{formatBRL(t.amount)}</td>
                    <td className="px-8 py-4">
                       <div className="flex items-center gap-2">
                         <input 
                           type="text"
                           placeholder="Notas..."
                           className={`w-full bg-transparent border-b ${justSaved ? 'border-emerald-500' : 'border-slate-100 hover:border-slate-300'} px-2 py-1 text-xs outline-none focus:border-blue-500 transition-all ${isMonthClosed ? 'opacity-50 pointer-events-none' : ''}`}
                           defaultValue={t.observations || ''}
                           disabled={isMonthClosed || isSaving}
                           onBlur={(e) => handleObservationUpdate(t, e.target.value)}
                         />
                         <div className="w-4 shrink-0 flex justify-center">
                            {isSaving && <i className="fas fa-circle-notch fa-spin text-blue-500 text-[10px]"></i>}
                            {justSaved && <i className="fas fa-check text-emerald-500 text-[10px] animate-in zoom-in"></i>}
                         </div>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClosingView;
