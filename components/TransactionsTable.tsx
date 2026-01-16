
import React, { useState } from 'react';
import { Transaction } from '../types';
import { storageService } from '../services/storageService';

interface TransactionsTableProps {
  transactions: Transaction[];
  onRefresh: () => void;
}

const TransactionsTable: React.FC<TransactionsTableProps> = ({ transactions, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = transactions.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.clientOrRecipient || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleStatus = (t: Transaction) => {
    try {
      const newStatus = t.status === 'CONFIRMADA' ? 'PENDENTE' : 'CONFIRMADA';
      storageService.updateTransaction({ ...t, status: newStatus });
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = (t: Transaction) => {
    if (confirm('Deseja realmente excluir este lançamento?')) {
      try {
        storageService.deleteTransaction(t.transactionKey);
        onRefresh();
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-bold text-slate-900">Extrato Consolidado</h2>
        <div className="relative w-full md:w-96">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input 
            type="text" 
            placeholder="Pesquisar por descrição, categoria..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black tracking-[0.15em]">
              <tr>
                <th className="px-8 py-5">Data</th>
                <th className="px-8 py-5">Descrição / Categoria</th>
                <th className="px-8 py-5">Fonte</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Valor</th>
                <th className="px-8 py-5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-50">
              {filtered.map(t => (
                <tr key={t.transactionKey} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5 whitespace-nowrap text-slate-500 font-medium">
                    {new Date(t.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-8 py-5">
                    <div className="font-bold text-slate-900 mb-0.5">{t.description}</div>
                    <div className="text-[10px] text-blue-600 font-black uppercase tracking-wider">{t.category}</div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg font-black uppercase tracking-widest border border-slate-200">{t.source}</span>
                  </td>
                  <td className="px-8 py-5">
                    <button 
                      onClick={() => toggleStatus(t)}
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                        t.status === 'CONFIRMADA' 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                          : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}
                    >
                      {t.status}
                    </button>
                  </td>
                  <td className={`px-8 py-5 text-right font-bold ${t.type === 'ENTRADA' ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {t.type === 'ENTRADA' ? '+' : ''}{formatCurrency(t.amount)}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><i className="fas fa-edit"></i></button>
                      <button onClick={() => handleDelete(t)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors"><i className="fas fa-trash-alt"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-400 italic text-sm">
                    Nenhum registro encontrado para os critérios selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TransactionsTable;
