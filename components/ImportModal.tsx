
import React, { useState, useEffect } from 'react';
import { parseAsaasCSV } from '../utils/asaasParser';
import { storageService } from '../services/storageService';
import { authService } from '../services/authService';
import { Transaction, ImportJob, FinancialInstitution } from '../types';

interface ImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ onClose, onSuccess }) => {
  const [sources, setSources] = useState<FinancialInstitution[]>([]);
  const [selectedSource, setSelectedSource] = useState('ASAAS');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const session = authService.getSession();

  useEffect(() => {
    setSources(storageService.getSources());
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setError('');
    setLoading(true);

    try {
      const text = await selectedFile.text();
      const parsed = await parseAsaasCSV(text);
      if (parsed.length === 0) {
        throw new Error("O arquivo parece estar vazio ou não contém dados de transações reconhecíveis.");
      }
      
      const adjustedPreview = parsed.map(t => ({
        ...t,
        source: selectedSource,
        account: sources.find(s => s.id === selectedSource)?.name || t.account
      }));

      setPreview(adjustedPreview);
    } catch (err: any) {
      console.error("Erro no parsing do CSV:", err);
      setError(err.message || 'Erro ao processar arquivo. Verifique se é um CSV válido.');
      setPreview([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (preview.length === 0 || !file || !session) return;

    setLoading(true);
    const jobId = `job_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const initialJob: ImportJob = {
      id: jobId,
      timestamp,
      source: selectedSource,
      userName: session.user.name,
      userId: session.user.id,
      fileName: file.name,
      periodStart: preview.length > 0 ? preview[0].date : timestamp,
      periodEnd: preview.length > 0 ? preview[preview.length - 1].date : timestamp,
      totalLines: preview.length,
      insertedCount: 0,
      ignoredCount: 0,
      alertCount: 0,
      errorCount: 0,
      status: 'PROCESSANDO'
    };

    storageService.saveImportJob(initialJob);
    await new Promise(resolve => setTimeout(resolve, 600));

    try {
      const { inserted, ignored } = storageService.saveTransactions(preview, jobId, session.user.id);

      const finalJob: ImportJob = {
        ...initialJob,
        insertedCount: inserted,
        ignoredCount: ignored,
        status: inserted > 0 ? 'CONCLUÍDA' : 'CONCLUÍDA_COM_ALERTAS'
      };

      storageService.saveImportJob(finalJob);
      storageService.logAction(session.user.id, session.user.name, 'IMPORTACAO', `Importou arquivo ${file.name} com ${inserted} lançamentos novos`);
      
      onSuccess();
      onClose();
      alert(`Importação concluída!\n- Inseridas: ${inserted}\n- Ignoradas: ${ignored}`);
    } catch (err) {
      storageService.saveImportJob({ ...initialJob, status: 'ERRO', errorCount: 1 });
      alert("Ocorreu um erro crítico durante a gravação dos dados.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Importar Extrato Bancário</h2>
            <p className="text-sm text-slate-500">Selecione a instituição e o arquivo CSV</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600" disabled={loading}><i className="fas fa-times"></i></button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Destino da Importação</label>
            <div className="flex flex-wrap gap-2">
              {sources.map(s => (
                <button
                  key={s.id}
                  type="button"
                  disabled={!!file}
                  onClick={() => setSelectedSource(s.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                    selectedSource === s.id 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400'
                  } ${!!file ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {!file ? (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center hover:border-blue-500 transition-colors cursor-pointer group bg-slate-50">
              <input type="file" accept=".csv" className="hidden" id="csv-upload" onChange={handleFileChange} />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <i className="fas fa-file-csv text-5xl text-slate-300 group-hover:text-blue-500 mb-4 transition-colors"></i>
                <p className="font-medium text-slate-600 mb-2">Arraste seu CSV aqui ou clique para selecionar</p>
                <div className="bg-slate-950 text-white px-6 py-2 rounded-lg font-semibold inline-block hover:bg-slate-800 transition-all border border-slate-700">
                  Selecionar Arquivo
                </div>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100">
                <span className="text-sm font-medium text-blue-800 flex items-center gap-2">
                  <i className="fas fa-file-alt"></i> {file.name}
                </span>
                <button 
                  onClick={() => {setFile(null); setPreview([]); setError('');}} 
                  className="text-xs font-bold text-rose-600 hover:underline"
                  disabled={loading}
                >
                  Remover Arquivo
                </button>
              </div>

              {loading && (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <i className="fas fa-circle-notch fa-spin text-3xl text-blue-600"></i>
                  <p className="text-sm text-slate-500 font-medium">Processando dados...</p>
                </div>
              )}

              {preview.length > 0 && !loading && (
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-3">Prévia de Lançamentos ({preview.length})</h3>
                  <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-slate-400 font-bold uppercase tracking-wider">Data</th>
                          <th className="px-6 py-3 text-slate-400 font-bold uppercase tracking-wider">Descrição</th>
                          <th className="px-6 py-3 text-right text-slate-400 font-bold uppercase tracking-wider">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {preview.slice(0, 10).map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-6 py-3 text-slate-500">{new Date(p.date).toLocaleDateString('pt-BR')}</td>
                            <td className="px-6 py-3 font-medium text-slate-900 truncate max-w-[300px]">{p.description}</td>
                            <td className={`px-6 py-3 text-right font-bold ${p.type === 'ENTRADA' ? 'text-emerald-600' : 'text-slate-900'}`}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.amount)}
                            </td>
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

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-6 py-2.5 text-slate-600 text-sm font-bold hover:bg-slate-200 rounded-xl transition-all"
            disabled={loading}
          >
            Cancelar
          </button>
          <button 
            disabled={preview.length === 0 || loading}
            onClick={handleImport}
            className="px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 shadow-xl shadow-blue-500/20 flex items-center gap-2"
          >
            {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
            Finalizar Importação
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
