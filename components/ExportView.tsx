
import React, { useMemo, useState } from 'react';
import { Transaction, FilterState } from '../types';
import { impactsResult, formatBRL } from '../utils/finance';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area
} from 'recharts';
import Logo from './Logo';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface ExportViewProps {
  transactions: Transaction[];
  filters: FilterState;
}

const ExportView: React.FC<ExportViewProps> = ({ transactions, filters }) => {
  const [isGenerating, setIsGenerating] = useState(false);

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

  const handleGeneratePdf = async () => {
    const element = document.getElementById('report-pdf');
    if (!element) {
      console.error("[PDF] Elemento #report-pdf não encontrado");
      return;
    }

    setIsGenerating(true);
    console.log("[PDF] Geração iniciada");

    try {
      // Captura o HTML como Canvas com escala para alta definição
      const canvas = await html2canvas(element, {
        scale: 3, 
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 1200
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const ratio = pdfWidth / imgWidth;
      const finalImgHeight = imgHeight * ratio;
      
      let heightLeft = finalImgHeight;
      let position = 0;

      // Primeira página
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, finalImgHeight);
      heightLeft -= pdfHeight;

      // Páginas subsequentes
      while (heightLeft >= 0) {
        position = heightLeft - finalImgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, finalImgHeight);
        heightLeft -= pdfHeight;
      }

      const fileName = `Relatorio-Performance-${String(filters.month).padStart(2, '0')}-${filters.year}.pdf`;
      pdf.save(fileName);
      console.log("[PDF] Download concluído");
    } catch (error) {
      console.error("[PDF] Erro ao gerar PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const monthName = new Date(2022, filters.month - 1).toLocaleString('pt-BR', { month: 'long' });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 no-print print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Relatórios Gerenciais</h2>
          <p className="text-slate-500 text-sm">Documentos financeiros para análise e decisão</p>
        </div>
        <button 
          onClick={handleGeneratePdf} 
          disabled={isGenerating}
          className={`bg-slate-950 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 shadow-2xl shadow-slate-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait`}
        >
          {isGenerating ? (
            <><i className="fas fa-circle-notch fa-spin"></i> Gerando PDF...</>
          ) : (
            <><i className="fas fa-file-pdf"></i> GERAR PDF / IMPRIMIR</>
          )}
        </button>
      </div>

      {/* Relatório A4 Real com ID para captura */}
      <div 
        id="report-pdf"
        className="bg-white border border-slate-100 shadow-2xl p-12 mx-auto max-w-[210mm] min-h-[297mm]"
      >
        <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10 mb-10">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-slate-950 p-2.5 rounded-3xl shadow-xl border border-slate-800 overflow-hidden">
                <Logo className="w-14 h-14" />
              </div>
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Essenzia Contabilidade</h1>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-1">Governança e Inteligência Financeira</p>
              </div>
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Relatório de Performance</h2>
            <p className="text-slate-500 font-bold mt-1">Competência: <span className="text-blue-600 capitalize">{monthName} / {filters.year}</span></p>
          </div>
          <div className="text-right text-[10px] text-slate-400 font-black uppercase tracking-widest leading-relaxed">
            <p className="bg-slate-100 px-2 py-1 rounded-md text-slate-600 inline-block mb-2">Documento de Performance</p>
            <p>Emissão: {new Date().toLocaleString('pt-BR')}</p>
            <p>ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
          </div>
        </div>

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

        <div className="mb-14">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-8 ml-1 flex items-center gap-3">
             <span className="w-8 h-[2px] bg-slate-200"></span>
             Fluxo de Caixa Diário
          </h3>
          <div className="h-48 w-full bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="0" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" hide />
                <YAxis hide domain={['auto', 'auto']} />
                <Area 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#0f172a" 
                  strokeWidth={3}
                  fill="#f1f5f9" 
                  fillOpacity={0.8} 
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-16 mb-16">
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></span> 
              Faturamento por Categoria
            </h3>
            <div className="space-y-5">
              {summary.inList.map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-[11px] font-bold text-slate-700">
                    <span className="truncate pr-4">{item.category}</span>
                    <span>{formatBRL(item.amount)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500" 
                      style={{ width: `${(item.amount / (summary.totalIn || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              {summary.inList.length === 0 && <p className="text-[10px] text-slate-300 italic">Sem dados registrados.</p>}
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900 shadow-sm"></span> 
              Plano de Contas Operacional
            </h3>
            <div className="space-y-5">
              {summary.outList.map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-700">
                    <div className="flex items-center gap-2 truncate pr-4">
                      <span className="truncate">{item.category}</span>
                      {!impactsResult(item.category) && (
                        <span className="text-[8px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase">Fluxo de Caixa</span>
                      )}
                    </div>
                    <span>{formatBRL(item.amount)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${impactsResult(item.category) ? 'bg-slate-900' : 'bg-slate-300'}`} 
                      style={{ width: `${(item.amount / (summary.totalOutImpact + summary.totalOutNonImpact || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              {summary.outList.length === 0 && <p className="text-[10px] text-slate-300 italic">Sem dados registrados.</p>}
            </div>
          </section>
        </div>

        <div className="mt-auto pt-12 text-center border-t-2 border-slate-100">
          <div className="p-8 rounded-3xl bg-slate-50/50 text-left mb-10 border border-slate-100">
            <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Nota Normativa de Cálculo Financeiro</h4>
            <p className="text-[9px] text-slate-400 leading-relaxed italic text-justify">
              Este relatório apresenta a performance operacional do escritório Essenzia. O Resultado Líquido (DRE) exclui lançamentos de natureza patrimonial, como Distribuição de Lucros e Aportes de Capital.
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

export default ExportView;
