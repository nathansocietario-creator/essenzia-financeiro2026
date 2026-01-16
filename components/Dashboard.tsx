
import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ComposedChart, Bar, Line, Cell, Area
} from 'recharts';
import { Transaction } from '../types';
import { impactsResult, formatBRL } from '../utils/finance';

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

const ComparisonItem = ({ label, current, previous, average, isHistoryEnough }: any) => {
  const calcVar = (curr: number, base: number) => {
    if (base === 0) return 0;
    return ((curr - base) / Math.abs(base)) * 100;
  };

  const varPrev = calcVar(current, previous);
  const varAvg = calcVar(current, average);

  return (
    <div className="flex flex-col py-4 first:pt-0 last:pb-0 border-b last:border-0 border-slate-50">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-bold text-slate-700">{label}</span>
        <span className="text-sm font-bold text-slate-900">{formatBRL(current)}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50/50 p-2 rounded-xl flex flex-col">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Mês Anterior</span>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-600">{formatBRL(previous)}</span>
            <span className={`text-[9px] font-black flex items-center gap-0.5 ${varPrev >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              <i className={`fas fa-arrow-${varPrev >= 0 ? 'up' : 'down'}`}></i>
              {Math.abs(varPrev).toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="bg-slate-50/50 p-2 rounded-xl flex flex-col">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Média (3m)</span>
          <div className="flex items-center justify-between">
            {!isHistoryEnough ? (
              <span className="text-[9px] text-slate-300 italic">N/A</span>
            ) : (
              <>
                <span className="text-[10px] font-bold text-slate-600">{formatBRL(average)}</span>
                <span className={`text-[9px] font-black flex items-center gap-0.5 ${varAvg >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  <i className={`fas fa-arrow-${varAvg >= 0 ? 'up' : 'down'}`}></i>
                  {Math.abs(varAvg).toFixed(0)}%
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 backdrop-blur-md border border-slate-200 p-4 rounded-2xl shadow-2xl">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">{data.dayLabel}</p>
        <div className="space-y-2">
          <div className="flex justify-between items-center gap-8">
            <span className="text-[10px] font-bold text-emerald-600 uppercase">Entradas</span>
            <span className="text-xs font-bold text-slate-900">{formatBRL(data.in)}</span>
          </div>
          <div className="flex justify-between items-center gap-8">
            <span className="text-[10px] font-bold text-rose-500 uppercase">Saídas</span>
            <span className="text-xs font-bold text-slate-900">{formatBRL(data.out)}</span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex justify-between items-center gap-8">
            <span className="text-[10px] font-black text-blue-600 uppercase">Saldo Acum.</span>
            <span className="text-sm font-black text-slate-900">{formatBRL(data.balance)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ transactions, allTransactions, selectedMonth, selectedYear }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
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

    const inList = Object.entries(inMap).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount).slice(0, 6);
    const outList = Object.entries(outMap).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount).slice(0, 6);

    return { totalIn, totalOutImpact, result: totalIn - totalOutImpact, asaasFees, inList, outList };
  }, [transactions]);

  const chartData = useMemo(() => {
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    const data = [];
    const dailyIn: Record<number, number> = {};
    const dailyOut: Record<number, number> = {};
    
    transactions.forEach(t => {
      if (t.status !== 'CONFIRMADA') return;
      const day = parseInt(t.date.split('-')[2]);
      if (t.type === 'ENTRADA') {
        dailyIn[day] = (dailyIn[day] || 0) + t.amount;
      } else {
        dailyOut[day] = (dailyOut[day] || 0) + t.amount;
      }
    });

    let runningBalance = 0;
    for (let d = 1; d <= lastDay; d++) {
      const dayIn = dailyIn[d] || 0;
      const dayOut = dailyOut[d] || 0;
      runningBalance += (dayIn - dayOut);
      data.push({
        day: d,
        dayLabel: `${String(d).padStart(2, '0')}/${String(selectedMonth).padStart(2, '0')}`,
        in: dayIn,
        out: dayOut,
        balance: Number(runningBalance.toFixed(2))
      });
    }
    return data;
  }, [transactions, selectedMonth, selectedYear]);

  const advancedComp = useMemo(() => {
    const confirmed = allTransactions.filter(t => t.status === 'CONFIRMADA');
    const monthStats: Record<string, { in: number, outImpact: number, result: number, fees: number }> = {};
    
    confirmed.forEach(t => {
      const key = `${t.year}-${String(t.month).padStart(2, '0')}`;
      if (!monthStats[key]) monthStats[key] = { in: 0, outImpact: 0, result: 0, fees: 0 };
      if (t.type === 'ENTRADA') monthStats[key].in += t.amount;
      else if (impactsResult(t.category)) monthStats[key].outImpact += t.amount;
      
      if (t.category === 'Taxas e Tarifas' || t.category === 'Taxas Asaas' || t.category === 'Despesas bancárias') {
        monthStats[key].fees += t.amount;
      }
      monthStats[key].result = monthStats[key].in - monthStats[key].outImpact;
    });

    const getPrevMonthKey = (m: number, y: number, offset: number) => {
      let targetM = m - offset; let targetY = y;
      while (targetM <= 0) { targetM += 12; targetY -= 1; }
      return `${targetY}-${String(targetM).padStart(2, '0')}`;
    };

    const currentKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    const prevKey = getPrevMonthKey(selectedMonth, selectedYear, 1);
    const m2Key = getPrevMonthKey(selectedMonth, selectedYear, 2);
    const m3Key = getPrevMonthKey(selectedMonth, selectedYear, 3);

    const curr = monthStats[currentKey] || { in: 0, outImpact: 0, result: 0, fees: 0 };
    const prev = monthStats[prevKey] || { in: 0, outImpact: 0, result: 0, fees: 0 };
    const m2 = monthStats[m2Key] || { in: 0, outImpact: 0, result: 0, fees: 0 };
    const m3 = monthStats[m3Key] || { in: 0, outImpact: 0, result: 0, fees: 0 };

    const historyMonths = [prevKey, m2Key, m3Key].filter(k => monthStats[k]);
    const isHistoryEnough = historyMonths.length >= 3;

    const avg = {
      in: (prev.in + m2.in + m3.in) / 3,
      outImpact: (prev.outImpact + m2.outImpact + m3.outImpact) / 3,
      result: (prev.result + m2.result + m3.result) / 3,
      fees: (prev.fees + m2.fees + m3.fees) / 3
    };

    return { curr, prev, avg, isHistoryEnough };
  }, [allTransactions, selectedMonth, selectedYear]);

  if (isLoading) return <div className="animate-pulse space-y-8"><div className="h-10 w-48 bg-slate-200 rounded-lg"></div></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestão de Caixa</h2>
          <p className="text-sm text-slate-500 font-medium">Demonstrativo de Resultados e Fluxo Operacional</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Honorários e Receitas" value={summary.totalIn} />
        <StatCard label="Gastos Operacionais" value={summary.totalOutImpact} />
        <StatCard label="Taxas e Tarifas" value={summary.asaasFees} isNeutral />
        <div className="bg-slate-900 p-6 rounded-3xl shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Resultado Líquido Operacional</p>
          <p className={`text-2xl font-bold ${summary.result >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatBRL(summary.result)}
          </p>
          <div className="flex justify-between items-center mt-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Margem: {summary.totalIn > 0 ? ((summary.result / summary.totalIn) * 100).toFixed(1) : 0}%
            </p>
            <i className="fas fa-info-circle text-[10px] text-slate-600" title="Exclui Retirada de Lucro"></i>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico de Fluxo de Caixa Avançado */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm h-[480px] flex flex-col">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span> Fluxo de Caixa Diário
              </h3>
              <p className="text-[10px] text-slate-400 font-bold">Movimentação real de todas as contas</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Entradas
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div> Saldo
              </div>
            </div>
          </div>
          
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="0" vertical={false} stroke="#f1f5f9" strokeOpacity={0.5} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} interval={2} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} tickFormatter={(val) => `R$${Math.round(val/1000)}k`} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc', radius: 8}} />
                
                <Bar dataKey="in" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} fillOpacity={0.8} />
                <Area type="monotone" dataKey="balance" fill="url(#colorBalance)" stroke="none" />
                <Line type="monotone" dataKey="balance" stroke="#2563eb" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
            <i className="fas fa-history text-blue-600"></i> Fluxo Recente
          </h3>
          <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {transactions.slice(0, 10).map(t => (
              <div key={t.transactionKey} className="flex justify-between items-center group cursor-default">
                <div className="truncate mr-4">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">{t.description}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{t.category}</p>
                </div>
                <p className={`text-xs font-bold whitespace-nowrap ${t.type === 'ENTRADA' ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {t.type === 'ENTRADA' ? '+' : '-'}{formatBRL(t.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">Comparativo Avançado (Regra Operacional)</h3>
          <span className="text-[9px] text-slate-400 italic">*Exclui transações sem impacto no resultado (Ex: Retirada de Lucro)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <ComparisonItem label="Total de Entradas" current={advancedComp.curr.in} previous={advancedComp.prev.in} average={advancedComp.avg.in} isHistoryEnough={advancedComp.isHistoryEnough} />
          <ComparisonItem label="Gasto Operacional" current={advancedComp.curr.outImpact} previous={advancedComp.prev.outImpact} average={advancedComp.avg.outImpact} isHistoryEnough={advancedComp.isHistoryEnough} />
          <ComparisonItem label="Resultado Líquido" current={advancedComp.curr.result} previous={advancedComp.prev.result} average={advancedComp.avg.result} isHistoryEnough={advancedComp.isHistoryEnough} />
          <ComparisonItem label="Taxas e Tarifas" current={advancedComp.curr.fees} previous={advancedComp.prev.fees} average={advancedComp.avg.fees} isHistoryEnough={advancedComp.isHistoryEnough} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm h-full flex flex-col">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Faturamento por Tipo
          </h3>
          <div className="space-y-4">
            {summary.inList.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>{item.category}</span>
                  <span>{formatBRL(item.amount)}</span>
                </div>
                <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{width: `${(item.amount / (summary.totalIn || 1)) * 100}%`}}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm h-full flex flex-col">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span> Despesas por Plano de Contas
          </h3>
          <div className="space-y-4">
            {summary.outList.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <div className="flex items-center gap-2">
                    <span>{item.category}</span>
                    {!impactsResult(item.category) && <span className="text-[8px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded uppercase">Isento</span>}
                  </div>
                  <span>{formatBRL(item.amount)}</span>
                </div>
                <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden">
                  <div className={`h-full ${impactsResult(item.category) ? 'bg-blue-600' : 'bg-slate-300'}`} style={{width: `${(item.amount / (summary.totalOutImpact + (summary.outList.find(o => !impactsResult(o.category))?.amount || 0))) * 100}%`}}></div>
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
