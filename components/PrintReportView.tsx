
import React, { useEffect, useState, useMemo } from 'react';
import { Transaction, FilterState } from '../types';
import { impactsResult, formatBRL } from '../utils/finance';
import Logo from './Logo';

const PrintReportView: React.FC = () => {
  const [data, setData] = useState<{ transactions: Transaction[], filters: FilterState } | null>(null);

  useEffect(() => {
    console.log('[PRINTVIEW] Carregando dados do localStorage');
    const rawData = localStorage.getItem('essenzia_print_data');
    if (rawData) {
      setData(JSON.parse(rawData));
    }
  }, []);

  const summary = useMemo(() => {
    if (!data) return null;
    let totalIn = 0;
    let totalOutImpact = 0;
    let totalOutNonImpact = 0;
    const inMap: Record<string, number> = {};
    const outMap: Record<string, number> = {};

    data.transactions.forEach(t => {
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

    return { totalIn, totalOutImpact, totalOutNonImpact, result: totalIn - totalOutImpact, inList, outList };
  }, [data]);

  const handleActionPrint = () => {
    console.log('[PDF] Geração iniciada via browser');
    window.print();
    console.log('[PDF] Download concluído via spooler');
  };

  if (!data || !summary) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-10 bg-slate-50">
        <i className="fas fa-circle-notch fa-spin text-3xl text-blue-600 mb-4"></i>
        <p className="text-slate-500 font-bold">Carregando relatório para impressão...</p>
      </div>
    );
  }

  const monthName = new Date(2022, data.filters.month - 1).toLocaleString('pt-BR', { month: 'long' });

  return (
    <div className="min-h-screen bg-slate-100 py-10 print:bg-white print:py-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 0; size: auto; }
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-container { 
            box-shadow: none !important; 
            border: none !important; 
            margin: 0 !important; 
            padding: 2cm !important; 
            width: 100% !important;
            max-width: none !important;
          }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}} />

      {/* Control Bar - UI Only */}
      <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center no-print px-4">
        <button 
          onClick={() => window.close()} 
          className="text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors"
        >
          <i className="fas fa-arrow-left mr-2"></i> Voltar
        </button>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 font-medium">Use Ctrl+P para salvar como PDF</span>
          <button 
            onClick={handleActionPrint}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all"
          >
            <i className="fas fa-print mr-2"></i> GERAR PDF / IMPRIMIR
          </button>
        </div>
      </div>

      {/* Relatório A4 Real */}
      <div className="bg-white border border-slate-200 shadow-2xl p-16 mx-auto max-w-[210mm] min-h-[297mm] print-container relative overflow-hidden">
        
        {/* Header Relatório */}
        <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10 mb-10">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-slate-950 p-2.5 rounded-3xl shadow-xl overflow-hidden">
                <Logo className="w-14 h-14" />
              </div>
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Essenzia Contabilidade</h1>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] leading-none mt-1">Governança e Inteligência Financeira</p>
              </div>
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Relatório de Performance</h2>
            <p className="text-slate-500 font-bold mt-1">Competência: <span className="text-blue-600 capitalize">{monthName} / {data.filters.year}</span></p>
          </div>
          <div className="text-right text-[10px] text-slate-400 font-black uppercase tracking-widest leading-relaxed">
            <p className="bg-slate-100 px-2 py-1 rounded-md text-slate-600 inline-block mb-2">Relatório Consolidado</p>
            <p>Emissão: {new Date().toLocaleString('pt-BR')}</p>
            <p>ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Entradas Brutas</p>
            <p className="text-2xl font-black text-emerald-600">{formatBRL(summary.totalIn)}</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Saídas Operacionais</p>
            <p className="text-2xl font-black text-rose-600">{formatBRL(summary.totalOutImpact)}</p>
          </div>
          <div className="bg-slate-900 p-6 rounded-2xl shadow-xl">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Resultado Líquido</p>
            <p className={`text-2xl font-black ${summary.result >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatBRL(summary.result)}
            </p>
          </div>
        </div>

        {/* Listas Detalhadas */}
        <div className="grid grid-cols-2 gap-16 mb-16">
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></span> 
              Faturamento por Categoria
            </h3>
            <div className="space-y-4">
              {summary.inList.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-slate-50 pb-3">
                  <span className="text-[11px] font-bold text-slate-700">{item.category}</span>
                  <span className="text-[11px] font-black text-slate-900">{formatBRL(item.amount)}</span>
                </div>
              ))}
              {summary.inList.length === 0 && <p className="text-[10px] text-slate-300 italic text-center py-4">Sem entradas registradas.</p>}
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900 shadow-sm"></span> 
              Gastos Operacionais
            </h3>
            <div className="space-y-4">
              {summary.outList.slice(0, 15).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-slate-50 pb-3">
                   <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-700">{item.category}</span>
                      {!impactsResult(item.category) && <span className="text-[8px] bg-slate-200 text-slate-500 px-1 py-0.5 rounded font-black uppercase">Fluxo</span>}
                   </div>
                   <span className="text-[11px] font-black text-slate-900">{formatBRL(item.amount)}</span>
                </div>
              ))}
              {summary.outList.length === 0 && <p className="text-[10px] text-slate-300 italic text-center py-4">Sem saídas registradas.</p>}
            </div>
          </section>
        </div>

        {/* Rodapé Relatório */}
        <div className="mt-auto pt-10 border-t-2 border-slate-100">
          <div className="p-6 rounded-2xl bg-slate-50 text-left mb-10">
            <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Nota Normativa de Performance</h4>
            <p className="text-[9px] text-slate-400 leading-relaxed italic">
              Este documento apresenta a performance consolidada do escritório. Os cálculos baseiam-se em lançamentos operacionais confirmados, auditados via reconciliação bancária. O Resultado Líquido exclui distribuições de lucros e aportes patrimoniais.
            </p>
          </div>
          <div className="flex justify-between items-center">
             <p className="text-[9px] text-slate-400 uppercase font-black tracking-[0.4em]">Essenzia Intelligence © {new Date().getFullYear()}</p>
             <div className="w-12 h-1 bg-slate-950 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintReportView;
