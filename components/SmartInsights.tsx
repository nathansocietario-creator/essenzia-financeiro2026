
import React, { useState, useEffect } from 'react';
import { generateStrategicInsights } from '../services/geminiService';

interface SmartInsightsProps {
  summary: any;
  previousSummary: any;
  budgets: any[];
}

const SmartInsights: React.FC<SmartInsightsProps> = ({ summary, previousSummary, budgets }) => {
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const loadInsights = async () => {
    setLoading(true);
    const result = await generateStrategicInsights(summary, previousSummary, budgets);
    setInsights(result);
    setLoading(false);
  };

  useEffect(() => {
    loadInsights();
  }, [summary.result]);

  return (
    <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
      {/* Decorative Light */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] group-hover:bg-blue-500/30 transition-all duration-700"></div>
      
      <div className="flex justify-between items-center mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-400/20">
            <i className="fas fa-brain text-blue-400"></i>
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Advisor AI</h3>
            <p className="text-blue-300/60 text-[10px] uppercase font-black tracking-widest">Análise Estratégica Essenzia</p>
          </div>
        </div>
        <button 
          onClick={loadInsights} 
          disabled={loading}
          className="text-white/40 hover:text-white transition-colors p-2"
        >
          <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
        </button>
      </div>

      <div className="space-y-4 relative z-10">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-4 bg-white/5 rounded-full animate-pulse" style={{ width: `${80 + Math.random() * 20}%` }}></div>
            ))}
          </div>
        ) : (
          insights.map((insight, idx) => (
            <div key={idx} className="flex gap-4 group/item">
              <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] shrink-0"></div>
              <p className="text-blue-50/80 text-sm font-medium leading-relaxed group-hover/item:text-white transition-colors">{insight}</p>
            </div>
          ))
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center relative z-10">
         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300/40">Powered by Gemini 2.5 Flash</span>
         <i className="fas fa-chevron-right text-white/20"></i>
      </div>
    </div>
  );
};

export default SmartInsights;
