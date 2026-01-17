
import React, { useMemo, useState, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ComposedChart, Bar, Line, Cell, Area
} from 'recharts';
import { Transaction, MonthlyBudget } from '../types';
import { impactsResult, formatBRL } from '../utils/finance';
import { storageService } from '../services/storageService';
import SmartInsights from './SmartInsights';

interface DashboardProps {
  transactions: Transaction[];
  allTransactions: Transaction[];
  selectedMonth: number;
  selectedYear: number;
}

const StatCard = ({ label, value, trend, isNeutral = false }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</p>
    <p className={`text-2xl font-bold ${isNeutral ? 'text-slate-900' : value >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
      {formatBRL(value)}
    </p>
    {trend !== undefined && trend !== 0 && (
      <div className={`text-[10px] font-bold mt-2 flex items-center gap-1 ${trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
        <i className={`fas fa-caret-${trend >= 0 ? 'up' : 'down'}`}></i>
        {Math.abs(trend).toFixed(1)}% vs anterior
      </div>
    )}
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ transactions, allTransactions, selectedMonth, selectedYear }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [budget, setBudget] = useState<MonthlyBudget | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const bData = await storageService.getBudgets(selectedYear, selectedMonth);
      setBudget(bData);
      setIsLoading(false);
    };
    fetchData();
  }, [selectedMonth, selectedYear]);

  const summary = useMemo(() => {
    let totalIn = 0; 
    let totalOutImpact = 0; 
    let asaasFees = 0;
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
      if (t.category === 'Taxas e Tarifas' || t.category === 'Taxas Asaas' || t.category === 'Despesas bancárias') {
        asaasFees += t.amount;
      }
    });

    return { totalIn, totalOutImpact, result: totalIn - totalOutImpact, asaasFees, inMap, outMap };
  }, [transactions]);

  const advancedComp = useMemo(() => {
    const confirmed = allTransactions.filter(t => t.status === 'CONFIRMADA');
    const monthStats: Record<string, { in: number, result: number }> = {};
    
    confirmed.forEach(t => {
      const key = `${t.year}-${String(t.month).padStart(2, '0')}`;
      if (!monthStats[key]) monthStats[key] = { in: 0, result: 0 };
      
      // Fix: Use a guarded reference to ensure current is defined before arithmetic operations
      const current = monthStats[key];
      if (current) {
        if (t.type === 'ENTRADA') current.in += t.amount;
        else if (impactsResult(t.category)) current.result -= t.amount;
      }
    });

    const getPrevKey = (m: number, y: number) => {
      let tm = m - 1; let ty = y;
      if (tm <= 0) { tm = 12; ty--; }
      return `${ty}-${String(tm).padStart(2, '0')}`;
    };

    const prev = monthStats[getPrevKey(selectedMonth, selectedYear)] || { in: 0, result: 0 };
    return { prev };
  }, [allTransactions, selectedMonth, selectedYear]);

  // Fix: Explicitly cast Object.entries result to number tuples to avoid "unknown" type errors in math and formatting
  const outList = (Object.entries(summary.outMap) as [string, number][])
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  if (isLoading) return <div className="animate-pulse space-y-8"><div className="h-10 w-48 bg-slate-200 rounded-lg"></div></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestão Estratégica</h2>
          <p className="text-sm text-slate-500 font-medium">Controle de Governança e Inteligência Operacional</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <SmartInsights 
            summary={summary} 
            previousSummary={advancedComp.prev} 
            budgets={budget?.budgets || []} 
          />
        </div>
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Honorários (In)" value={summary.totalIn} />
          <StatCard label="Gastos Operacionais" value={summary.totalOutImpact} />
          <div className="bg-emerald-600 p-6 rounded-3xl shadow-xl shadow-emerald-900/10">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100/60 mb-2">Margem Líquida</p>
            <p className="text-2xl font-bold text-white">{formatBRL(summary.result)}</p>
            <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest mt-2">
              EFICIÊNCIA: {summary.totalIn > 0 ? ((summary.result / summary.totalIn) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Consumo de Orçamento */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
            <i className="fas fa-bullseye text-blue-600"></i> Consumo de Metas (Budget)
          </h3>
          <div className="space-y-6">
            {outList.map((item, idx) => {
              const b = budget?.budgets.find(x => x.category === item.category);
              const percent = b ? (item.amount / b.amount) * 100 : 0;
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700">{item.category}</span>
                    <span className="text-slate-400">{formatBRL(item.amount)} {b ? `/ ${formatBRL(b.amount)}` : ''}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${percent > 100 ? 'bg-rose-500' : percent > 80 ? 'bg-amber-500' : 'bg-blue-600'}`} 
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
            {!budget && (
              <div className="text-center py-6">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Nenhuma meta definida para este mês</p>
                <button className="mt-2 text-blue-600 text-xs font-black uppercase hover:underline">Configurar Budgets</button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
            <i className="fas fa-chart-bar text-emerald-500"></i> Ranking de Faturamento
          </h3>
          <div className="space-y-5">
            {/* Fix: Explicitly cast Object.entries result to number tuples to avoid "unknown" type errors during sorting, arithmetic, and formatting */}
            {(Object.entries(summary.inMap) as [string, number][])
              .sort((a,b) => b[1]-a[1])
              .map(([cat, val], idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-100">
                    0{idx+1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-bold text-slate-700">{cat}</span>
                      <span className="text-sm font-bold text-slate-900">{formatBRL(val)}</span>
                    </div>
                    <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${(val / (summary.totalIn || 1)) * 100}%` }}></div>
                    </div>
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
