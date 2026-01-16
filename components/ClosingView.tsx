
import React, { useState, useEffect, useMemo } from 'react';
import { storageService } from '../services/storageService';
import { authService } from '../services/authService';
import { Transaction, TransactionType, MonthlyClosing } from '../types';
import { impactsResult, formatBRL } from '../utils/finance';

interface ClosingViewProps {
  transactions: Transaction[];
  month: number;
  year: number;
  onRefresh?: () => void;
}

const TransactionRow: React.FC<{ t: Transaction, isClosed: boolean, onUpdate: () => void }> = ({ t, isClosed, onUpdate }) => {
  const [localObs, setLocalObs] = useState(t.observations || '');
  const outCategories = ['Aluguel / Condomínio', 'Energia elétrica', 'Água', 'Internet / Telefonia', 'Sistemas contábeis', 'Certificado digital', 'Honorários contábeis terceirizados', 'Material de escritório', 'Marketing e publicidade', 'Tráfego pago / anúncios', 'Serviços de terceiros', 'Manutenção / TI', 'Consultoria externa', 'Impostos e taxas', 'Taxas e Tarifas', 'Despesas bancárias', 'Retirada de lucro', 'Pro-labore', 'Outros'];
  const inCategories = ['Honorários contábeis mensais', 'Honorários de abertura de empresa', 'Honorários de alteração contratual', 'Honorários de encerramento de empresa', 'Honorários de regularizações', 'Aporte de Capital', 'Outros'];
  const categories = t.type === 'ENTRADA' ? inCategories : outCategories;

  const handleUpdate = (updates: Partial<Transaction>) => {
    storageService.updateTransaction({ ...t, ...updates });
    onUpdate();
  };

  const isImpact = impactsResult(t.category);

  return (
    <tr className={`group hover:bg-slate-50 transition-colors border-b border-slate-50 ${!isImpact ? 'bg-slate-50/50' : ''}`}>
      <td className="px-4 py-3 text-[11px] text-slate-500 font-medium">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
      <td className="px-4 py-3">
        <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{t.description}</p>
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-slate-400 font-medium uppercase">{t.source}</p>
          {!isImpact && <span className="text-[8px] bg-slate-200 text-slate-500 px-1 rounded font-black uppercase tracking-tighter">Isento de Impacto</span>}
        </div>
      </td>
      <td className="px-4 py-3">
        <select value={t.category} onChange={(e) => handleUpdate({ category: e.target.value })} className="w-full text-[11px] font-bold py-1 px-2 rounded-lg border border-slate-200 bg-white">
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>
      <td className="px-4 py-3">
        <input type="text" className="w-full text-[11px] py-1 px-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500" value={t.observations || ''} onChange={(e) => setLocalObs(e.target.value)} onBlur={() => handleUpdate({ observations: localObs })} />
      </td>
      <td className={`px-4 py-3 text-right font-bold text-xs ${t.type === 'ENTRADA' ? 'text-emerald-600' : 'text-slate-900'}`}>{formatBRL(t.amount)}</td>
    </tr>
  );
};

const ClosingView: React.FC<ClosingViewProps> = ({ transactions, month, year, onRefresh }) => {
  const [closings, setClosings] = useState<MonthlyClosing[]>([]);
  const [activeTab, setActiveTab] = useState<TransactionType>('SAIDA');
  const isClosed = storageService.isMonthClosed(month, year);
  // Get current session for user info
  const session = authService.getSession();

  useEffect(() => { setClosings(storageService.getClosings()); }, [month, year]);

  const totals = useMemo(() => {
    let ent = 0; let saiImpact = 0; let saiTotal = 0;
    transactions.forEach(t => {
      if (t.type === 'ENTRADA') ent += t.amount;
      else {
        saiTotal += t.amount;
        if (impactsResult(t.category)) saiImpact += t.amount;
      }
    });
    return { ent, saiImpact, saiTotal, res: ent - saiImpact };
  }, [transactions]);

  // Fix: Added closedById and use session user data to fulfill MonthlyClosing interface requirements
  const handleClose = () => {
    if (!session) {
      alert('Sessão expirada. Por favor, faça login novamente.');
      return;
    }

    const closing: MonthlyClosing = {
      id: `${year}-${month}`, 
      month, 
      year, 
      closedAt: new Date().toISOString(), 
      closedBy: session.user.name,
      closedById: session.user.id,
      snapshot: { 
        totalIn: totals.ent, 
        totalOut: totals.saiImpact, 
        result: totals.res, 
        transactionCount: transactions.length 
      }
    };
    storageService.closeMonth(closing);
    setClosings(storageService.getClosings());
    if (onRefresh) onRefresh();
    alert('Fechamento Operacional realizado.');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="bg-slate-950 text-white p-8 rounded-[2rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-2">Auditoria DRE / Fluxo</p>
          <h2 className="text-3xl font-bold">Fechamento de Período</h2>
          <p className="text-slate-400 text-sm mt-1">Competência: <span className="text-white font-bold capitalize">{new Date(2022, month - 1).toLocaleString('pt-BR', { month: 'long' })} / {year}</span></p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Resultado Operacional</p>
          <p className={`text-2xl font-bold ${totals.res >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatBRL(totals.res)}</p>
          <button onClick={handleClose} className="mt-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 group shadow-xl">
            <i className="fas fa-lock group-hover:scale-110 transition-transform"></i> Gravar Auditoria
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
        <div className="p-6 border-b border-slate-100 flex justify-between bg-slate-50/50">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setActiveTab('SAIDA')} className={`px-8 py-2 rounded-lg text-xs font-black uppercase transition-all ${activeTab === 'SAIDA' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Saídas</button>
            <button onClick={() => setActiveTab('ENTRADA')} className={`px-8 py-2 rounded-lg text-xs font-black uppercase transition-all ${activeTab === 'ENTRADA' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Entradas</button>
          </div>
          <div className="text-[10px] text-slate-400 font-bold flex items-center gap-4">
            <span>Fluxo Total: {formatBRL(totals.saiTotal)}</span>
            <span className="text-blue-600">Impacto DRE: {formatBRL(totals.saiImpact)}</span>
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
            <tr><th className="px-4 py-4 w-24">Data</th><th className="px-4 py-4">Descrição</th><th className="px-4 py-4 w-56">Categoria</th><th className="px-4 py-4">Observações</th><th className="px-4 py-4 text-right w-32">Valor</th></tr>
          </thead>
          <tbody>
            {transactions.filter(t => t.type === activeTab).map(t => <TransactionRow key={t.transactionKey} t={t} isClosed={isClosed} onUpdate={onRefresh || (() => {})} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClosingView;
