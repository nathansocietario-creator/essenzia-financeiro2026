
import React, { useState, useEffect } from 'react';
import { Transaction, AuditStatus, TransactionType, AuthSession } from '../types';
import { storageService } from '../services/storageService';
import { authService } from '../services/authService';
import { formatBRL } from '../utils/finance';

interface TransactionsTableProps {
  transactions: Transaction[];
  onRefresh: () => void;
}

const TransactionsTable: React.FC<TransactionsTableProps> = ({ transactions, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editReason, setEditReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    authService.getSession().then(setSession);
  }, []);

  const filtered = transactions.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.originalDescription.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction || !session) return;

    const isCritical = 
      editingTransaction.date !== editingTransaction.originalDate || 
      editingTransaction.amount !== editingTransaction.originalAmount ||
      editingTransaction.type !== editingTransaction.originalType;

    if (isCritical && !editReason.trim()) {
      alert("Para alterações críticas (Data, Valor ou Tipo), você deve obrigatoriamente fornecer um motivo para a auditoria.");
      return;
    }

    setSaving(true);
    try {
      await storageService.logAction(
        session.user.id, 
        session.user.name, 
        'CORRECAO_TRANSACAO', 
        `Editou transação: ${editingTransaction.description}`,
        { 
          transactionKey: editingTransaction.transactionKey, 
          reason: editReason,
          newValue: JSON.stringify({ category: editingTransaction.category, amount: editingTransaction.amount })
        }
      );

      await storageService.updateTransaction({
        ...editingTransaction,
        auditStatus: 'AUDITADO',
        auditedBy: session.user.name,
        auditedAt: new Date().toISOString(),
        updatedBy: session.user.id
      }, session.user.id);

      setEditingTransaction(null);
      setEditReason('');
      onRefresh();
    } catch (err) {
      alert("Erro ao salvar alterações.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Fluxo de Caixa</h2>
          <p className="text-sm text-slate-500 font-medium">Entradas e saídas do período</p>
        </div>
        <div className="relative w-full md:w-96">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input 
            type="text" 
            placeholder="Pesquisar..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black tracking-widest">
              <tr>
                <th className="px-8 py-5">Audit</th>
                <th className="px-8 py-5">Data</th>
                <th className="px-8 py-5">Descrição / Categoria</th>
                <th className="px-8 py-5">Fonte</th>
                <th className="px-8 py-5 text-right">Valor</th>
                <th className="px-8 py-5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-50">
              {filtered.map(t => (
                <tr key={t.transactionKey} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    {t.auditStatus === 'AUDITADO' ? (
                      <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border border-blue-100" title={`Auditado por ${t.auditedBy}`}>
                        <i className="fas fa-check-circle mr-1"></i> AUDITADO
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border border-slate-200">
                        PENDENTE
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-slate-500 font-medium">
                    {new Date(t.date).toLocaleDateString('pt-BR')}
                    {t.date !== t.originalDate && <i className="fas fa-info-circle ml-2 text-amber-500" title={`Original: ${new Date(t.originalDate).toLocaleDateString('pt-BR')}`}></i>}
                  </td>
                  <td className="px-8 py-5">
                    <div className="font-bold text-slate-900 mb-0.5 flex items-center gap-2">
                      {t.description}
                      {t.description !== t.originalDescription && <span className="text-[8px] bg-amber-50 text-amber-600 px-1 rounded">Editado</span>}
                    </div>
                    <div className="text-[10px] text-blue-600 font-black uppercase tracking-wider">{t.category}</div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg font-black uppercase tracking-widest border border-slate-200">{t.source}</span>
                  </td>
                  <td className={`px-8 py-5 text-right font-bold ${t.type === 'ENTRADA' ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {formatBRL(t.amount)}
                    {t.amount !== t.originalAmount && <div className="text-[8px] text-amber-500 line-through">{formatBRL(t.originalAmount)}</div>}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => setEditingTransaction(t)} className="w-8 h-8 rounded-lg text-slate-300 hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center justify-center">
                        <i className="fas fa-edit text-xs"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingTransaction && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Auditoria de Transação</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">ID: {editingTransaction.transactionKey.slice(0, 12)}...</p>
              </div>
              <button onClick={() => setEditingTransaction(null)} className="text-slate-400 hover:text-slate-600"><i className="fas fa-times"></i></button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Data Lançamento</label>
                  <input type="date" className="w-full border border-slate-200 rounded-xl p-3.5 text-sm bg-slate-50 focus:border-blue-500" value={editingTransaction.date} onChange={e => setEditingTransaction({...editingTransaction, date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Valor (R$)</label>
                  <input type="number" step="0.01" className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-bold bg-slate-50 focus:border-blue-500" value={editingTransaction.amount} onChange={e => setEditingTransaction({...editingTransaction, amount: parseFloat(e.target.value)})} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Descrição Visível</label>
                <input type="text" className="w-full border border-slate-200 rounded-xl p-3.5 text-sm bg-slate-50 focus:border-blue-500" value={editingTransaction.description} onChange={e => setEditingTransaction({...editingTransaction, description: e.target.value})} />
                <p className="mt-1 text-[9px] text-slate-400 italic">Original: {editingTransaction.originalDescription}</p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Categoria Financeira</label>
                <select className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-bold bg-white focus:border-blue-500" value={editingTransaction.category} onChange={e => setEditingTransaction({...editingTransaction, category: e.target.value})}>
                   {editingTransaction.type === 'ENTRADA' ? (
                     ['Honorários contábeis mensais', 'Honorários de abertura de empresa', 'Honorários de alteração contratual', 'Honorários de encerramento de empresa', 'Honorários de regularizações', 'Aporte de Capital', 'Outros'].map(c => <option key={c} value={c}>{c}</option>)
                   ) : (
                     ['Aluguel / Condomínio', 'Energia elétrica', 'Água', 'Internet / Telefonia', 'Sistemas contábeis', 'Certificado digital', 'Honorários contábeis terceirizados', 'Material de escritório', 'Marketing e publicidade', 'Tráfego pago / anúncios', 'Serviços de terceiros', 'Manutenção / TI', 'Consultoria externa', 'Impostos e taxas', 'Taxas e Tarifas', 'Despesas bancárias', 'Retirada de lucro', 'Pro-labore', 'Outros'].map(c => <option key={c} value={c}>{c}</option>)
                   )}
                </select>
              </div>

              {(editingTransaction.date !== editingTransaction.originalDate || editingTransaction.amount !== editingTransaction.originalAmount) && (
                <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 animate-in fade-in slide-in-from-top-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">Justificativa da Alteração Crítica</label>
                  <textarea 
                    required
                    className="w-full bg-white border border-amber-200 rounded-xl p-3.5 text-sm outline-none focus:border-amber-500 min-h-[80px]"
                    placeholder="Ex: Valor corrigido pois o extrato incluía estorno posterior..."
                    value={editReason}
                    onChange={e => setEditReason(e.target.value)}
                  />
                </div>
              )}

              <button 
                type="submit" 
                disabled={saving}
                className="w-full bg-slate-950 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {saving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-check-double mr-2"></i>}
                Gravar Auditoria
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsTable;
