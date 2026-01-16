
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Transaction } from '../types';

interface GeneralViewProps {
  allTransactions: Transaction[];
}

const GeneralView: React.FC<GeneralViewProps> = ({ allTransactions }) => {
  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string, entries: number, exits: number, sortKey: string }> = {};
    
    allTransactions.forEach(t => {
      const key = `${t.year}-${String(t.month).padStart(2, '0')}`;
      if (!map[key]) {
        const monthName = new Date(t.year, t.month - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        map[key] = { month: monthName, entries: 0, exits: 0, sortKey: key };
      }
      if (t.type === 'ENTRADA') map[key].entries += t.amount;
      else map[key].exits += t.amount;
    });

    return Object.values(map)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(item => ({
        ...item,
        result: item.entries - item.exits,
        margin: item.entries > 0 ? ((item.entries - item.exits) / item.entries) * 100 : 0
      }));
  }, [allTransactions]);

  const totals = useMemo(() => {
    const sumIn = allTransactions.filter(t => t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
    const sumOut = allTransactions.filter(t => t.type === 'SAIDA').reduce((acc, t) => acc + t.amount, 0);
    const avgResult = monthlyData.length > 0 ? (sumIn - sumOut) / monthlyData.length : 0;
    
    return {
      sumIn,
      sumOut,
      totalResult: sumIn - sumOut,
      avgResult,
      monthsCount: monthlyData.length
    };
  }, [allTransactions, monthlyData]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Visão Consolidada</h2>
          <p className="text-slate-500 text-sm">Comparativo histórico de todos os períodos importados</p>
        </div>
      </div>

      {/* Global Totals Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Entradas Acumuladas</p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totals.sumIn)}</p>
          <p className="text-[10px] text-slate-400 mt-2 italic">Total de {totals.monthsCount} meses</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Saídas Acumuladas</p>
          <p className="text-2xl font-bold text-rose-600">{formatCurrency(totals.sumOut)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lucro Histórico</p>
          <p className={`text-2xl font-bold ${totals.totalResult >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
            {formatCurrency(totals.totalResult)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Média de Resultado</p>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(totals.avgResult)}</p>
          <p className="text-[10px] text-slate-400 mt-2 italic">Média por mês apurado</p>
        </div>
      </div>

      {/* Main Comparative Chart */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold mb-8 text-slate-800">Evolução de Performance Mensal</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} tickFormatter={(val) => `R$${val/1000}k`} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(val: number) => formatCurrency(val)} 
              />
              <Legend verticalAlign="top" align="right" iconType="circle" />
              <Bar dataKey="entries" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
              <Bar dataKey="exits" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Comparative Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">Tabela de Performance por Período</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
              <tr>
                <th className="px-8 py-4">Mês / Ano</th>
                <th className="px-8 py-4">Faturamento</th>
                <th className="px-8 py-4">Despesas</th>
                <th className="px-8 py-4">Resultado</th>
                <th className="px-8 py-4 text-center">Margem</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-50">
              {monthlyData.length > 0 ? [...monthlyData].reverse().map((m, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-4 font-bold text-slate-700 capitalize">{m.month}</td>
                  <td className="px-8 py-4 text-emerald-600 font-medium">{formatCurrency(m.entries)}</td>
                  <td className="px-8 py-4 text-rose-500 font-medium">{formatCurrency(m.exits)}</td>
                  <td className={`px-8 py-4 font-bold ${m.result >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                    {formatCurrency(m.result)}
                  </td>
                  <td className="px-8 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      m.margin >= 30 ? 'bg-emerald-100 text-emerald-700' : 
                      m.margin >= 10 ? 'bg-blue-100 text-blue-700' : 
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {m.margin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400">
                    Nenhum dado consolidado disponível. Importe extratos para visualizar o comparativo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GeneralView;
