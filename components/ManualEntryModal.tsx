
import React, { useState, useEffect } from 'react';
import { Transaction, TransactionSource, TransactionType, FinancialInstitution } from '../types';
import { storageService } from '../services/storageService';
import { authService } from '../services/authService';
import { createManualKey } from '../utils/crypto';
import { categorizeTransaction } from '../services/geminiService';

interface ManualEntryModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const ManualEntryModal: React.FC<ManualEntryModalProps> = ({ onClose, onSuccess }) => {
  const [sources, setSources] = useState<FinancialInstitution[]>([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    clientOrRecipient: '',
    amount: '',
    type: 'SAIDA' as TransactionType,
    category: 'Outros',
    paymentMethod: 'PIX',
    source: 'MANUAL',
    observations: ''
  });
  const [isClassifying, setIsClassifying] = useState(false);
  
  const session = authService.getSession();

  // DO: Fetch sources asynchronously and update state
  useEffect(() => {
    const fetchSources = async () => {
      const data = await storageService.getSources();
      setSources(data);
    };
    fetchSources();
  }, []);

  const outCategories = [
    'Aluguel / Condomínio', 'Energia elétrica', 'Água', 'Internet / Telefonia', 
    'Sistemas contábeis', 'Certificado digital', 'Honorários contábeis terceirizados', 
    'Material de escritório', 'Marketing e publicidade', 'Tráfego pago / anúncios', 
    'Serviços de terceiros', 'Manutenção / TI', 'Consultoria externa', 
    'Impostos e taxas', 'Taxas e Tarifas', 'Despesas bancárias', 'Retirada de lucro', 'Pro-labore', 'Outros'
  ];

  const inCategories = [
    'Honorários contábeis mensais',
    'Honorários de abertura de empresa',
    'Honorários de alteração contratual',
    'Honorários de encerramento de empresa',
    'Honorários de regularizações',
    'Aporte de Capital',
    'Outros'
  ];

  const categories = formData.type === 'ENTRADA' ? inCategories : outCategories;

  const handleAutoCategorize = async () => {
    if (!formData.description) return;
    setIsClassifying(true);
    const result = await categorizeTransaction(formData.description);
    setFormData(prev => ({ ...prev, category: result.category }));
    setIsClassifying(false);
  };

  // DO: make handleSubmit async to await storage calls
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor, insira um valor válido.');
      return;
    }

    const [year, month, day] = formData.date.split('-').map(Number);

    const transaction: Transaction = {
      ...formData,
      amount,
      account: sources.find(s => s.id === formData.source)?.name || 'Caixa Geral',
      status: 'CONFIRMADA',
      transactionKey: createManualKey(formData.date, amount, formData.type, formData.description, formData.category),
      confidenceScore: 100,
      month,
      year,
      createdBy: session.user.id
    };

    // Fix: added await for saveTransactions call which returns a Promise
    const { inserted } = await storageService.saveTransactions([transaction], undefined, session.user.id);
    if (inserted > 0) {
      // DO: await async storage calls
      await storageService.logAction(session.user.id, session.user.name, 'LANCAMENTO_MANUAL', `Lançou manualmente: ${formData.description} (${formData.category})`);
      onSuccess();
      onClose();
    } else {
      alert('Esta transação já existe (duplicata detectada).');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col border border-slate-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-900">Novo Lançamento Manual</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600"><i className="fas fa-times"></i></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
              <input 
                type="date" 
                required
                className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
              <select 
                className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.type}
                onChange={e => {
                  const newType = e.target.value as TransactionType;
                  setFormData({...formData, type: newType, category: 'Outros'});
                }}
              >
                <option value="ENTRADA">Entrada</option>
                <option value="SAIDA">Saída</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Instituição</label>
              <select 
                className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                value={formData.source}
                onChange={e => setFormData({...formData, source: e.target.value})}
              >
                {sources.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$)</label>
              <input 
                type="number" 
                step="0.01"
                required
                placeholder="0,00"
                className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                required
                placeholder="Ex: Pagamento Certificado Digital"
                className="flex-1 border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                onBlur={handleAutoCategorize}
              />
              <button 
                type="button"
                onClick={handleAutoCategorize}
                title="Classificar com IA"
                className="bg-slate-100 p-2 rounded-lg text-slate-500 hover:text-blue-600 transition-colors"
              >
                {isClassifying ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria</label>
            <select 
              required
              className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="px-6 py-2 text-slate-600 font-semibold hover:bg-slate-200 rounded-lg transition-all">Cancelar</button>
            <button 
              type="submit"
              className="px-6 py-2 bg-slate-950 text-white font-semibold rounded-lg hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
            >
              Salvar Lançamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualEntryModal;
