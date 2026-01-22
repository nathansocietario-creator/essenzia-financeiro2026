
import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Transaction, FilterState } from '../types';
import { impactsResult, formatBRL } from '../utils/finance';

interface EvolutionViewProps {
  transactions: Transaction[];
  filters: FilterState;
}

const EvolutionView: React.FC<EvolutionViewProps> = ({ transactions, filters }) => {
  const [startPeriod, setStartPeriod] = useState({ month: 1, year: filters.year });
  const [endPeriod, setEndPeriod] = useState({ month: 12, year: filters.year });
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    setStartPeriod({ month: 1, year: filters.year });
    setEndPeriod({ month: 12, year: filters.year });
  }, [filters.year]);

  const evolutionData = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    
    const data: any[] = [];
    let iterYear = startPeriod.year;
    let iterMonth = startPeriod.month;
    const endYear = endPeriod.year;
    const endMonth = endPeriod.month;

    const startDate = iterYear * 12 + iterMonth;
    const endDate = endYear * 12 + endMonth;
    
    if (startDate > endDate) {
        return [];
    }

    while (iterYear < endYear || (iterYear === endYear && iterMonth <= endMonth)) {
      const currentYear = iterYear;
      const currentMonth = iterMonth;

      const monthTransactions = transactions.filter(t => {
        const tMonth = Number(t.month);
        const tYear = Number(t.year);
        
        const matchTime = tYear === currentYear && tMonth === currentMonth;
        const matchSource = sourceFilter === 'ALL' || t.source === sourceFilter;
        const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
        
        return matchTime && matchSource && matchStatus;
      });

      let inValue = 0;
      let outImpactValue = 0;
      let feesValue = 0;
      let withdrawalValue = 0;

      monthTransactions.forEach(t => {
        const isFee = ['Taxas e Tarifas', 'Taxas Asaas', 'Despesas bancárias'].includes(t.category);
        const impacts = impactsResult(t.category);

        if (t.type === 'ENTRADA') {
          inValue += t.amount;
        } else {
          if (impacts) outImpactValue += t.amount;
          else withdrawalValue += t.amount;
          
          if (isFee) feesValue += t.amount;
        }
      });

      data.push({
        monthKey: `${currentYear}-${String(currentMonth).padStart(2, '0')}`,
        fullLabel: `${new Date(currentYear, currentMonth - 1).toLocaleString('pt-BR', { month: 'short' })}/${String(currentYear).slice(2)}`,
        entradas: inValue,
        saidas: outImpactValue,
        resultadoLiquido: inValue - outImpactValue,
        retiradas: withdrawalValue,
        taxas: feesValue
      });

      iterMonth++;
      if (iterMonth > 12) {
        iterMonth = 1;
        iterYear++;
      }
    }

    return data;
  }, [transactions, startPeriod, endPeriod, sourceFilter, statusFilter]);

  const kpis = useMemo(() => {
    const totalIn = evolutionData.reduce((acc, d) => acc + d.entradas, 0);
    const totalOut = evolutionData.reduce((acc, d) => acc + d.saidas, 0);
    const totalRes = evolutionData.reduce((acc, d) => acc + d.resultadoLiquido, 0);
    const avgRes = evolutionData.length > 0 ? totalRes / evolutionData.length : 0;

    return { totalIn, totalOut, totalRes, avgRes };
  }, [evolutionData]);

  const handlePrint = () => window.print();

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
          }
          .evolution-container {
            padding: 0 !important;
          }
        }
      `}} />

      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">Análise Financeira Histórica</h2>
            <p className="text-sm text-slate-500 font-medium">Comparativo consolidado por período: {startPeriod.month}/{startPeriod.year} até {endPeriod.month}/{endPeriod.year}</p>
          </div>
          <button 
            onClick={handlePrint} 
            className="bg-slate-950 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 flex items-center gap-2"
          >
            <i className="fas fa-file-pdf"></i> Exportar Visão
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Início do Período</label>
            <div className="flex gap-2">
              <select 
                className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none"
                value={startPeriod.month}
                onChange={e => setStartPeriod({ ...startPeriod, month: parseInt(e.target.value) })}
              >
                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{new Date(2022, m-1).toLocaleString('pt-BR', {month: 'short'})}</option>
                ))}
              </select>
              <select 
                className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none"
                value={startPeriod.year}
                onChange={e => setStartPeriod({ ...startPeriod, year: parseInt(e.target.value) })}
              >
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Fim do Período</label>
            <div className="flex gap-2">
              <select 
                className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none"
                value={endPeriod.month}
                onChange={e => setEndPeriod({ ...endPeriod, month: parseInt(e.target.value) })}
              >
                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{new Date(2022, m-1).toLocaleString('pt-BR', {month: 'short'})}</option>
                ))}
              </select>
              <select 
                className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none"
                value={endPeriod.year}
                onChange={e => setEndPeriod({ ...endPeriod, year: parseInt(e.target.value) })}
              >
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Fonte de Dados</label>
            <select 
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none"
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
            >
              <option value="ALL">Todas as Fontes</option>
              <option value="ASAAS">Asaas</option>
              <option value="MANUAL">Lançamentos Manuais</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Status Auditoria</label>
            <select 
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Todos os Status</option>
              <option value="CONFIRMADA">Apenas Confirmadas</option>
              <option value="PENDENTE">Apenas Pendentes</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-32">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entradas Totais</p>
          <p className="text-2xl font-bold text-slate-900">{formatBRL(kpis.totalIn)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-32">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Saídas Operacionais</p>
          <p className="text-2xl font-bold text-slate-900">{formatBRL(kpis.totalOut)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-32">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lucro Operacional</p>
          <p className={`text-2xl font-bold ${kpis.totalRes >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatBRL(kpis.totalRes)}
          </p>
        </div>
        <div className="bg-slate-950 p-6 rounded-3xl shadow-xl flex flex-col justify-between h-32 text-white">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Média Líquida/Mês</p>
          <p className="text-2xl font-bold">{formatBRL(kpis.avgRes)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm h-[450px]">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8">Fluxo Comparativo Bruto</h3>
          <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evolutionData}>
                <CartesianGrid strokeDasharray="0" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="fullLabel" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} tickFormatter={(val) => `R$${val/1000}k`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Legend verticalAlign="top" align="right" iconType="circle" />
                <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="saidas" name="Saídas" fill="#334155" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvolutionView;
