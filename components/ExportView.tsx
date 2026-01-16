
import React, { useMemo } from 'react';
import { Transaction, FilterState } from '../types';
import { impactsResult, formatBRL } from '../utils/finance';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area
} from 'recharts';
import Logo from './Logo';

interface ExportViewProps {
  transactions: Transaction[];
  filters: FilterState;
}

const ExportView: React.FC<ExportViewProps> = ({ transactions, filters }) => {
  const summary = useMemo(() => {
    let totalIn = 0;
    let totalOutImpact = 0;
    let totalOutNonImpact = 0;
    const inMap: Record<string, number> = {};
    const outMap: Record<string, number> = {};

    transactions.forEach(t => {
      if (t.type === 'ENTRADA') {
        totalIn += t.amount;
        inMap[t.category] = (inMap[t.category] || 0) + t.amount;
      } else {
        if (impactsResult(t.category)) {
          totalOutImpact += t.amount;
        } else {
          totalOutNonImpact += t.amount;
        }
        outMap[t.category] = (outMap[t.category] || 0) + t.amount;
      }
    });

    const inList = Object.entries(inMap)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    const outList = Object.entries(outMap)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    return { 
      totalIn, 
      totalOutImpact, 
      totalOutNonImpact, 
      result: totalIn - totalOutImpact,
      inList,
      outList
    };
  }, [transactions]);

  const chartData = useMemo(() => {
    const lastDay = new Date(filters.year, filters.month, 0).getDate();
    const data = [];
    const dailyBalance: Record<number, number> = {};
    
    transactions.forEach(t => {
      if (t.status !== 'CONFIRMADA') return;
      const day = parseInt(t.date.split('-')[2]);
      const delta = (t.type === 'ENTRADA' ? t.amount : -t.amount);
      dailyBalance[day] = (dailyBalance[day] || 0) + delta;
    });

    let running = 0;
    for (let d = 1; d <= lastDay; d++) {
      running += (dailyBalance[d] || 0);
      data.push({
        day: d,
        balance: Number(running.toFixed(2))
      });
    }
    return data;
  }, [transactions, filters]);

  const handlePrint = () => window.print();
  const monthName = new Date(2022, filters.month - 1).toLocaleString('pt-BR', { month: 'long' });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Gerador de Relatórios</h2>
          <p className="text-slate-500 text-sm">O Resultado Líquido exclui distribuições de lucro conforme regra de governança.</p>
        </div>
        <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-500/10">
          <i className="fas fa-file-pdf"></i> Gerar PDF / Imprimir
        </button>
      </div>

      <div className="bg-white border border-slate-100 shadow-2xl p-10 mx-auto max-w-[210mm] min-h-[297mm] print:shadow-none print:border-0 print:p-0">
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-slate-950 p-2 rounded-xl shadow-lg border border-slate-800">
                <Logo className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-tighter text-slate-900">Essenzia Contabilidade</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Governança e Inteligência Financeira</p>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-900">Relatório de Performance Mensal</h2>
            <p className="text-slate-500 font-medium">Competência: <span className="text-slate-900 font-bold capitalize">{monthName} / {filters.year}</span></p>
          </div>
          <div className="text-right text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            <p>Emissão: {new Date().toLocaleString('pt-BR')}</p>
            <p>Tipo: Operacional / DRE</p>
          </div>
        </div>

        {/* Resumo de Cards */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Entradas Operacionais</p>
            <p className="text-xl font-bold text-emerald-600">{formatBRL(summary.totalIn)}</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Saídas Operacionais</p>
            <p className="text-xl font-bold text-rose-600">{formatBRL(summary.totalOutImpact)}</p>
          </div>
          <div className="bg-slate-900 p-5 rounded-xl">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Resultado Líquido (DRE)</p>
            <p className={`text-xl font-bold ${summary.result >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatBRL(summary.result)}
            </p>
          </div>
        </div>

        {/* Evolução Diária */}
        <div className="mb-12">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Evolução do Saldo de Caixa Diário</h3>
          <div className="h-40 w-full bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="0" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" hide />
                <YAxis hide domain={['auto', 'auto']} />
                <Area 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  fill="#dbeafe" 
                  fillOpacity={0.5} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Análise Analítica por Categoria */}
        <div className="grid grid-cols-2 gap-12 mb-12">
          {/* Faturamento */}
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Faturamento por Tipo
            </h3>
            <div className="space-y-4">
              {summary.inList.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-slate-700">
                    <span className="truncate pr-4">{item.category}</span>
                    <span>{formatBRL(item.amount)}</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500" 
                      style={{ width: `${(item.amount / (summary.totalIn || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              {summary.inList.length === 0 && <p className="text-[10px] text-slate-400 italic">Sem registros no período.</p>}
            </div>
          </section>

          {/* Despesas */}
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span> Plano de Contas (Saídas)
            </h3>
            <div className="space-y-4">
              {summary.outList.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-700">
                    <div className="flex items-center gap-2 truncate pr-4">
                      <span className="truncate">{item.category}</span>
                      {!impactsResult(item.category) && (
                        <span className="text-[7px] bg-slate-200 text-slate-500 px-1 py-0.5 rounded font-black uppercase tracking-tighter">Isento</span>
                      )}
                    </div>
                    <span>{formatBRL(item.amount)}</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${impactsResult(item.category) ? 'bg-blue-600' : 'bg-slate-300'}`} 
                      style={{ width: `${(item.amount / (summary.totalOutImpact + summary.totalOutNonImpact || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              {summary.outList.length === 0 && <p className="text-[10px] text-slate-400 italic">Sem registros no período.</p>}
            </div>
          </section>
        </div>

        {/* Rodapé e Notas */}
        <div className="mt-auto pt-10 text-center border-t border-slate-100">
          <div className="p-8 rounded-2xl bg-slate-50/50 text-left mb-8">
            <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">Nota Normativa de Cálculo</h4>
            <p className="text-[9px] text-slate-500 leading-relaxed italic">
              Conforme regras de governança da Essenzia, o **Resultado Líquido** apresentado neste relatório refere-se exclusivamente à performance operacional do escritório. 
              Lançamentos classificados como "Retirada de Lucro" ou "Aporte de Capital" são tratados como movimentações patrimoniais/fluxo de caixa e não impactam as margens de rentabilidade operacional aqui descritas.
            </p>
          </div>
          <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Relatório oficial gerado via Essenzia Financeiro Intelligence © {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
};

export default ExportView;
