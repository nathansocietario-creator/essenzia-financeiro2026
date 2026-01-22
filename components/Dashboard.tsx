
import React, { useMemo } from 'react';
import { Transaction } from '../types.ts';
import { impactsResult, formatBRL } from '../utils/finance.ts';

interface DashboardProps {
  transactions: Transaction[];
  allTransactions: Transaction[];
  selectedMonth: number;
  selectedYear: number;
}

const StatCard = ({ label, value, type = 'neutral' }: any) => (
  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-40 group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-blue-500 transition-colors">{label}</p>
    <div>
      <p className={`text-3xl font-black tracking-tighter ${type === 'positive' ? 'text-emerald-600' : type === 'negative' ? 'text-rose-600' : 'text-slate-900'}`}>
        {formatBRL(value)}
      </p>
      <div className="mt-2 w-8 h-1 bg-slate-100 rounded-full group-hover:w-16 transition-all duration-500 group-hover:bg-blue-500"></div>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ transactions, selectedMonth, selectedYear }) => {
  const summary = useMemo(() => {
    let totalIn = 0; 
    let totalOutImpact = 0; 
    const inMap: Record<string, number> = {};
    const outMap: Record<string, number> = {};

    transactions.forEach(t => {
      if (t.type === 'ENTRADA') {
        totalIn += t.amount;
        inMap[t.category] = (inMap[t.category] || 0) + t.amount;
      } else {
        if (impactsResult(t.category)) {
          totalOutImpact += t.amount;
        }
        outMap[t.category] = (outMap[t.category] || 0) + t.amount;
      }
    });

    return { totalIn, totalOutImpact, result: totalIn - totalOutImpact, inMap, outMap };
  }, [transactions]);

  const monthName = new Date(2022, selectedMonth - 1).toLocaleString('pt-BR', { month: 'long' });

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-700">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <i className="fas fa-folder-open text-slate-300 text-3xl"></i>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Nenhum dado encontrado</h2>
        <p className="text-slate-500 text-sm max-w-xs text-center mt-2">
          Não há transações importadas para <span className="capitalize">{monthName} / {selectedYear}</span>. Por favor, realize uma importação.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">Visão Geral Financeira</h2>
          <p className="text-sm text-slate-500 font-medium">Performance do período selecionado: <span className="text-slate-900 font-bold capitalize">{monthName} / {selectedYear}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total de Entradas" value={summary.totalIn} type="positive" />
        <StatCard label="Saídas Operacionais" value={summary.totalOutImpact} type="negative" />
        <div className="bg-slate-950 p-8 rounded-[2rem] shadow-2xl shadow-slate-950/20 flex flex-col justify-between h-40">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Margem Operacional</p>
          <p className={`text-3xl font-black tracking-tighter ${summary.result >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatBRL(summary.result)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
            <i className="fas fa-arrow-trend-up text-emerald-500"></i> Fontes de Faturamento
          </h3>
          <div className="space-y-5">
            {Object.entries(summary.inMap).sort((a,b) => (b[1] as number) - (a[1] as number)).map(([cat, val], idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-slate-700">{cat}</span>
                  <span className="text-slate-950">{formatBRL(val as number)}</span>
                </div>
                <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${((val as number) / (summary.totalIn || 1)) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
            <i className="fas fa-arrow-trend-down text-rose-500"></i> Maiores Centros de Custo
          </h3>
          <div className="space-y-5">
            {Object.entries(summary.outMap).sort((a,b) => (b[1] as number) - (a[1] as number)).slice(0, 6).map(([cat, val], idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-slate-700">{cat}</span>
                  <span className="text-slate-950">{formatBRL(val as number)}</span>
                </div>
                <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500" style={{ width: `${((val as number) / (summary.totalOutImpact || 1)) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
