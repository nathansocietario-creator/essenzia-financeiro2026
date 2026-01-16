
import React, { useMemo, useState } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import { storageService } from '../services/storageService';
import { Transaction } from '../types';
import { impactsResult, formatBRL } from '../utils/finance';
import Logo from './Logo';

const EvolutionView: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Filtros Locais
  const [startPeriod, setStartPeriod] = useState({ month: 1, year: 2025 });
  const [endPeriod, setEndPeriod] = useState({ month: currentMonth, year: currentYear });
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('CONFIRMADA');

  const transactions = useMemo(() => storageService.getTransactions(), []);

  const evolutionData = useMemo(() => {
    const data: any[] = [];
    
    // Gerar lista de meses no intervalo
    let iterYear = startPeriod.year;
    let iterMonth = startPeriod.month;
    const endYear = endPeriod.year;
    const endMonth = endPeriod.month;

    while (iterYear < endYear || (iterYear === endYear && iterMonth <= endMonth)) {
      const monthKey = `${iterYear}-${String(iterMonth).padStart(2, '0')}`;
      
      const monthTransactions = transactions.filter(t => {
        const matchTime = t.year === iterYear && t.month === iterMonth;
        const matchSource = sourceFilter === 'ALL' || t.source === sourceFilter;
        const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
        return matchTime && matchSource && matchStatus;
      });

      let inValue = 0;
      let outTotalValue = 0;
      let outImpactValue = 0;
      let feesValue = 0;
      let withdrawalValue = 0;

      monthTransactions.forEach(t => {
        const isFee = ['Taxas e Tarifas', 'Taxas Asaas', 'Despesas bancárias'].includes(t.category);
        const impacts = impactsResult(t.category);

        if (t.type === 'ENTRADA') {
          inValue += t.amount;
        } else {
          outTotalValue += t.amount;
          if (impacts) outImpactValue += t.amount;
          else withdrawalValue += t.amount;
          
          if (isFee) feesValue += t.amount;
        }
      });

      data.push({
        monthKey,
        monthName: new Date(iterYear, iterMonth - 1).toLocaleString('pt-BR', { month: 'short' }),
        year: iterYear,
        fullLabel: `${new Date(iterYear, iterMonth - 1).toLocaleString('pt-BR', { month: 'short' })}/${String(iterYear).slice(2)}`,
        entradas: inValue,
        saidas: outImpactValue,
        saidasTotais: outTotalValue,
        retiradaLucro: withdrawalValue,
        taxas: feesValue,
        resultadoLiquido: inValue - outImpactValue,
        percentualTaxas: inValue > 0 ? (feesValue / inValue) * 100 : 0
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
      {/* Header e Filtros */}
      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Evolução Financeira</h2>
            <p className="text-sm text-slate-500 font-medium">Análise histórica consolidada de múltiplos períodos</p>
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
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Início</label>
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
                {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Fim</label>
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
                {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
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
              <option value="ASAAS">Somente ASAAS</option>
              <option value="MANUAL">Somente MANUAL</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Status Auditoria</label>
            <select 
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Confirmadas + Pendentes</option>
              <option value="CONFIRMADA">Somente Confirmadas</option>
              <option value="PENDENTE">Somente Pendentes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Visão de Impressão */}
      <div className="hidden print:block bg-white p-10 min-h-screen">
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-slate-950 p-2 rounded-xl shadow-lg">
                <Logo className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-tighter text-slate-900">Essenzia Contabilidade</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Análise Evolutiva Consolidada</p>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-900">Relatório de Evolução Mensal</h2>
            <p className="text-slate-500 font-medium">Período: <span className="text-slate-900 font-bold uppercase">{evolutionData[0]?.fullLabel} — {evolutionData[evolutionData.length-1]?.fullLabel}</span></p>
          </div>
          <div className="text-right text-[10px] text-slate-400 font-bold uppercase tracking-widest">
             Emissão: {new Date().toLocaleString('pt-BR')}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-32">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total de Entradas</p>
          <p className="text-2xl font-bold text-slate-900">{formatBRL(kpis.totalIn)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-32">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Saídas Operacionais</p>
          <p className="text-2xl font-bold text-slate-900">{formatBRL(kpis.totalOut)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-32">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resultado Acumulado</p>
          <p className={`text-2xl font-bold ${kpis.totalRes >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatBRL(kpis.totalRes)}
          </p>
        </div>
        <div className="bg-slate-950 p-6 rounded-3xl shadow-xl flex flex-col justify-between h-32">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Média Mensal Resultado</p>
          <p className="text-2xl font-bold text-white">{formatBRL(kpis.avgRes)}</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm h-[400px]">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span> Tendência Resultado Líquido
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolutionData}>
              <CartesianGrid strokeDasharray="0" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="fullLabel" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} tickFormatter={(val) => `R$${val/1000}k`} />
              <Tooltip cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Line type="monotone" dataKey="resultadoLiquido" name="Resultado" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: '#2563eb' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm h-[400px]">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-300"></span> Entradas x Saídas
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={evolutionData}>
              <CartesianGrid strokeDasharray="0" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="fullLabel" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} tickFormatter={(val) => `R$${val/1000}k`} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Legend verticalAlign="top" align="right" iconType="circle" />
              <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="saidas" name="Saídas Op." fill="#334155" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela Mensal */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
           <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Detalhamento Analítico Mensal</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black tracking-[0.15em]">
              <tr>
                <th className="px-8 py-5">Mês / Ano</th>
                <th className="px-8 py-5">Entradas</th>
                <th className="px-8 py-5">Saídas Op.</th>
                <th className="px-8 py-5">Ret. Lucro</th>
                <th className="px-8 py-5">Resultado Líquido</th>
                <th className="px-8 py-5">Taxas Asaas</th>
                <th className="px-8 py-5 text-center">% Taxas</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-50">
              {evolutionData.map(item => (
                <tr key={item.monthKey} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-5 font-bold text-slate-900 capitalize">{item.monthName} / {item.year}</td>
                  <td className="px-8 py-5 text-emerald-600 font-medium">{formatBRL(item.entradas)}</td>
                  <td className="px-8 py-5 text-slate-700 font-medium">{formatBRL(item.saidas)}</td>
                  <td className="px-8 py-5 text-slate-400 italic">{formatBRL(item.retiradaLucro)}</td>
                  <td className={`px-8 py-5 font-black ${item.resultadoLiquido >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                    {formatBRL(item.resultadoLiquido)}
                  </td>
                  <td className="px-8 py-5 text-slate-500 font-medium">{formatBRL(item.taxas)}</td>
                  <td className="px-8 py-5 text-center">
                    <span className="text-[10px] font-black text-slate-400">{item.percentualTaxas.toFixed(1)}%</span>
                  </td>
                </tr>
              ))}
              {evolutionData.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center text-slate-400 italic">Nenhum dado para o período selecionado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Rodapé de Impressão */}
      <div className="hidden print:block mt-12 pt-10 border-t border-slate-200 text-center">
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
          Simboli Financeiro & Analytics © 2025 - Relatório Estratégico de Evolução
        </p>
      </div>
    </div>
  );
};

export default EvolutionView;
