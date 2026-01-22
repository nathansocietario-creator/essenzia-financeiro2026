
import React, { useState, useEffect } from 'react';
import { parseAsaasCSV } from '../utils/asaasParser.ts';
import { storageService } from '../services/storageService.ts';
import { authService } from '../services/authService.ts';
import { Transaction, ImportJob, FinancialInstitution, AuthSession } from '../types.ts';
import { formatBRL } from '../utils/finance.ts';

interface ImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ onClose, onSuccess }) => {
  const [sources, setSources] = useState<FinancialInstitution[]>([]);
  const [selectedSource, setSelectedSource] = useState('ASAAS');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Transaction[]>([]);
  const [detectedMonths, setDetectedMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [processLogs, setProcessLogs] = useState<{msg: string, type: 'info' | 'success' | 'error'}[]>([]);

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setProcessLogs(prev => [...prev, { msg, type }]);
  };

  useEffect(() => {
    authService.getSession().then(setSession);
    storageService.getSources().then(setSources);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setError('');
    setProcessLogs([]);
    setLoading(true);
    addLog(`Arquivo selecionado: ${selectedFile.name}`, 'info');

    try {
      addLog(`Lendo conteúdo...`, 'info');
      const text = await selectedFile.text();
      addLog(`Conteúdo lido (${text.length} bytes). Iniciando parser...`, 'info');
      
      const parsed = await parseAsaasCSV(text, selectedSource);
      addLog(`Parser concluído. Encontrados ${parsed.length} registros válidos.`, 'success');
      
      if (parsed.length === 0) throw new Error("O arquivo não contém registros válidos para importação.");
      
      const months = Array.from(new Set(parsed.map(t => `${new Date(t.date).toLocaleString('pt-BR', {month: 'long'})}/${t.year}`)));
      setDetectedMonths(months);
      setPreview(parsed);
    } catch (err: any) {
      const msg = err.message || (typeof err === 'object' ? JSON.stringify(err, null, 2) : String(err));
      setError(msg);
      addLog(msg, 'error');
      setPreview([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (preview.length === 0 || !file || !session) return;

    setLoading(true);
    setError('');
    addLog("Sincronizando com o banco de dados Supabase...", 'info');
    
    const jobId = `job_${Date.now()}`;
    const timestamp = new Date().toISOString();

    try {
      const { inserted, ignored } = await storageService.saveTransactions(preview);
      addLog(`Transações processadas. Inseridas: ${inserted}, Ignoradas (Duplicadas): ${ignored}`, 'success');

      const job: ImportJob = {
        id: jobId,
        timestamp,
        source: selectedSource,
        userName: session.user.name,
        userId: session.user.id,
        fileName: file.name,
        periodStart: preview[0].date,
        periodEnd: preview[preview.length - 1].date,
        totalLines: preview.length,
        insertedCount: inserted,
        ignoredCount: ignored,
        alertCount: 0,
        errorCount: 0,
        status: 'CONCLUÍDA'
      };

      await storageService.saveImportJob(job);
      await storageService.logAction(session.user.id, session.user.name, 'IMPORTACAO', `Arquivo: ${file.name}. Novos: ${inserted}, Duplicados: ${ignored}`);
      
      addLog("Finalizando processo...", 'success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);

    } catch (err: any) {
      // Extrair mensagem legível ou serializar objeto de erro técnico
      const technicalMsg = err.message || err.details || (typeof err === 'object' ? JSON.stringify(err, null, 2) : String(err));
      console.error("DEBUG SUPABASE ERROR:", technicalMsg);
      
      setError(technicalMsg);
      addLog(`Falha na gravação: Verifique o log técnico.`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-200">
        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Central de Importação</h2>
            <p className="text-sm text-slate-500">Fluxo de Conciliação Bancária Automática</p>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-600" disabled={loading}><i className="fas fa-times text-xl"></i></button>
        </div>

        <div className="p-10 flex-1 overflow-y-auto space-y-8 custom-scrollbar">
          {error && (
            <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
              <div className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center shrink-0">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-rose-900 text-sm">Erro Crítico Detectado</h4>
                <pre className="text-rose-700 text-[10px] mt-1 leading-relaxed font-mono whitespace-pre-wrap max-h-32 overflow-y-auto bg-white/50 p-2 rounded-lg border border-rose-100">{error}</pre>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 p-2 bg-slate-100 rounded-2xl border border-slate-200 w-fit">
            {sources.map(s => (
              <button
                key={s.id}
                type="button"
                disabled={!!file || loading}
                onClick={() => setSelectedSource(s.id)}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  selectedSource === s.id 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                } ${!!file ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {!file ? (
            <div className="border-4 border-dashed border-slate-100 rounded-[2.5rem] p-20 text-center hover:border-blue-500/30 transition-all cursor-pointer bg-slate-50/50 group">
              <input type="file" accept=".csv" className="hidden" id="csv-upload-input" onChange={handleFileChange} />
              <label htmlFor="csv-upload-input" className="cursor-pointer block">
                <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <i className="fas fa-cloud-upload-alt text-3xl text-blue-500"></i>
                </div>
                <p className="font-black text-slate-900 text-lg">Selecione o Extrato CSV</p>
                <p className="text-sm text-slate-400 mt-2">Clique aqui para carregar o documento do seu computador</p>
              </label>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div className="bg-slate-950 rounded-2xl p-5 font-mono text-[10px] space-y-1.5 border border-slate-800 shadow-inner max-h-40 overflow-y-auto">
                  {processLogs.map((log, i) => (
                    <div key={i} className={`${log.type === 'error' ? 'text-rose-400' : log.type === 'success' ? 'text-emerald-400' : 'text-slate-400'}`}>
                      <span className="opacity-30 mr-2">[{new Date().toLocaleTimeString()}]</span>
                      <span className="font-bold mr-2">{log.type === 'error' ? '✖' : log.type === 'success' ? '✔' : 'ℹ'}</span>
                      {log.msg}
                    </div>
                  ))}
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-blue-500">
                      <i className="fas fa-file-invoice"></i>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Origem</p>
                      <p className="text-sm font-bold text-blue-900 truncate max-w-[200px]">{file.name}</p>
                    </div>
                 </div>
                 <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-emerald-500">
                      <i className="fas fa-calendar-alt"></i>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Competências</p>
                      <p className="text-sm font-bold text-emerald-900">{detectedMonths.length > 0 ? detectedMonths.join(', ') : 'Processando...'}</p>
                    </div>
                 </div>
               </div>

               {preview.length > 0 && (
                 <div>
                   <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 ml-2">Amostra de Lançamentos ({preview.length} total)</h3>
                   <div className="border border-slate-100 rounded-[2rem] overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                           <tr>
                              <th className="px-6 py-4 text-slate-400 font-bold uppercase">Data</th>
                              <th className="px-6 py-4 text-slate-400 font-bold uppercase">Descrição</th>
                              <th className="px-6 py-4 text-right text-slate-400 font-bold uppercase">Valor</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {preview.slice(0, 5).map((p, idx) => (
                             <tr key={idx}>
                               <td className="px-6 py-4 font-medium text-slate-500">{new Date(p.date).toLocaleDateString('pt-BR')}</td>
                               <td className="px-6 py-4 font-bold text-slate-900 truncate max-w-[250px]">{p.description}</td>
                               <td className={`px-6 py-4 text-right font-bold ${p.type === 'ENTRADA' ? 'text-emerald-600' : 'text-slate-900'}`}>{formatBRL(p.amount)}</td>
                             </tr>
                           ))}
                        </tbody>
                      </table>
                   </div>
                 </div>
               )}
            </div>
          )}
        </div>

        <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
          <button 
            onClick={() => !loading && onClose()} 
            className="px-8 py-3 text-slate-500 text-xs font-black uppercase tracking-widest hover:text-slate-700"
            disabled={loading}
          >
            Fechar
          </button>
          
          {file && (
            <button 
              onClick={() => { setFile(null); setPreview([]); setError(''); setProcessLogs([]); }}
              className="px-8 py-3 text-rose-500 text-xs font-black uppercase tracking-widest hover:text-rose-700"
              disabled={loading}
            >
              Remover Arquivo
            </button>
          )}

          <button 
            disabled={preview.length === 0 || loading}
            onClick={handleImport}
            className="px-10 py-4 bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20 flex items-center gap-3 disabled:opacity-20"
          >
            {loading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-check-double"></i>}
            {loading ? "Sincronizando..." : "Executar Conciliação"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
