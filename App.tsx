
import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Transaction, FilterState, FinancialInstitution, AuthSession, ModulePermission } from './types.ts';
import { storageService } from './services/storageService.ts';
import { authService } from './services/authService.ts';

// Components
import Dashboard from './components/Dashboard.tsx';
import TransactionsTable from './components/TransactionsTable.tsx';
import ExportView from './components/ExportView.tsx';
import ImportHistory from './components/ImportHistory.tsx';
import ClosingView from './components/ClosingView.tsx';
import EvolutionView from './components/EvolutionView.tsx';
import BackupView from './components/BackupView.tsx';
import Logo from './components/Logo.tsx';
import ModuleGuardFinanceiro from './components/ModuleGuardFinanceiro.tsx';

const SidebarLink = ({ to, icon, label, active }: { to: string, icon: string, label: string, active: boolean }) => (
  <Link 
    to={to} 
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
      active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <i className={`fas ${icon} w-5 text-center ${active ? 'text-white' : 'group-hover:text-blue-400'}`}></i>
    <span className="font-medium text-sm">{label}</span>
  </Link>
);

const AppContent: React.FC = () => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [permissions, setPermissions] = useState<ModulePermission | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sources, setSources] = useState<FinancialInstitution[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const location = useLocation();
  
  const isPrintView = new URLSearchParams(window.location.search).get('print') === '1';

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [filters, setFilters] = useState<FilterState>({
    month: currentMonth,
    year: Math.max(2025, currentYear),
    source: 'ALL',
    type: 'ALL',
    category: 'ALL',
    status: 'ALL',
    auditStatus: 'ALL'
  });

  /**
   * refreshAll() - Recarrega todos os dados do módulo garantindo a limpeza de estados.
   */
  const refreshData = async () => {
    setRefreshing(true);
    
    // OBRIGATÓRIO: Limpeza de estados locais antes de carregar
    setTransactions([]);
    setSources([]);
    
    // Limpeza de qualquer cache em localStorage que possa ter sido criado
    Object.keys(localStorage).forEach(key => {
      if (key.includes('report') || key.includes('dashboard') || key.includes('snapshot')) {
        localStorage.removeItem(key);
      }
    });
    
    try {
      // Reconsulta total do banco
      const [tData, sData] = await Promise.all([
        storageService.getTransactions(),
        storageService.getSources()
      ]);
      
      setTransactions(tData || []);
      setSources(sData || []);
      
      console.log(`[REFRESH_ALL] Sincronização concluída: ${tData?.length || 0} transações.`);
    } catch (error) {
      console.error("[REFRESH_ALL] Erro crítico ao sincronizar:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const s = await authService.getSession();
      setSession(s);
      await refreshData();
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (isPrintView && !loading) {
      const timer = setTimeout(() => {
        window.print();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isPrintView, loading]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchMonth = Number(t.month) === Number(filters.month);
      const matchYear = Number(t.year) === Number(filters.year);
      const matchSource = filters.source === 'ALL' || t.source === filters.source;
      return matchMonth && matchYear && matchSource;
    });
  }, [transactions, filters]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <i className="fas fa-circle-notch fa-spin text-3xl text-blue-600"></i>
    </div>
  );

  return (
    <ModuleGuardFinanceiro onPermissionGranted={setPermissions}>
      <div className={`flex min-h-screen font-sans ${isPrintView ? 'block bg-white' : 'bg-slate-50 print:block print:bg-white'}`}>
        {!isPrintView && (
          <aside className="w-64 bg-slate-950 text-white flex flex-col sticky top-0 h-screen print:hidden">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-10">
                <div className="bg-slate-900 w-11 h-11 rounded-xl flex items-center justify-center border border-slate-800 overflow-hidden shadow-inner">
                  <Logo className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="font-bold text-sm tracking-tight leading-none text-white">Essenzia Plataforma</h1>
                  <p className="text-[9px] uppercase tracking-widest font-black mt-1 text-slate-500">
                    Financeiro
                  </p>
                </div>
              </div>

              <nav className="space-y-1.5">
                <SidebarLink to="/financeiro" icon="fa-chart-line" label="Dashboard" active={location.pathname === '/financeiro'} />
                <SidebarLink to="/financeiro/evolucao" icon="fa-chart-area" label="Evolução" active={location.pathname === '/financeiro/evolucao'} />
                <SidebarLink to="/financeiro/transacoes" icon="fa-list-ul" label="Transações" active={location.pathname === '/financeiro/transacoes'} />
                <SidebarLink to="/financeiro/importacoes" icon="fa-fingerprint" label="Importações" active={location.pathname === '/financeiro/importacoes'} />
                <SidebarLink to="/financeiro/fechamento" icon="fa-lock" label="Fechamento" active={location.pathname === '/financeiro/fechamento'} />
                <SidebarLink to="/financeiro/relatorios" icon="fa-file-invoice" label="Relatórios" active={location.pathname === '/financeiro/relatorios'} />
                <SidebarLink to="/financeiro/backup" icon="fa-history" label="Backup" active={location.pathname === '/financeiro/backup'} />
              </nav>
            </div>

            <div className="mt-auto p-6 border-t border-slate-900">
              <div className="bg-slate-900/50 rounded-2xl p-4 flex items-center gap-3 border border-transparent">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase bg-slate-700">
                  {session?.user.name.charAt(0) || 'A'}
                </div>
                <div className="truncate">
                  <span className="text-[11px] font-bold block text-white truncate">{session?.user.name}</span>
                  <span className="text-[9px] text-blue-500 uppercase font-black tracking-tighter">
                    Acesso Total
                  </span>
                </div>
              </div>
            </div>
          </aside>
        )}

        <div className="flex-1 flex flex-col print:block">
          {!isPrintView && (
            <header className="bg-white border-b border-slate-200 h-20 flex items-center justify-between px-8 sticky top-0 z-40 print:hidden">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                  <select 
                    value={filters.month} 
                    onChange={(e) => setFilters({...filters, month: parseInt(e.target.value)})}
                    className="bg-transparent text-sm font-bold text-slate-700 outline-none px-3 py-1 cursor-pointer"
                  >
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{new Date(2022, m - 1).toLocaleString('pt-BR', {month: 'long'})}</option>
                    ))}
                  </select>
                  <select 
                    value={filters.year} 
                    onChange={(e) => setFilters({...filters, year: parseInt(e.target.value)})}
                    className="bg-transparent text-sm font-bold text-slate-700 outline-none px-3 py-1 cursor-pointer"
                  >
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                {refreshing && <i className="fas fa-circle-notch fa-spin text-blue-500 text-xs"></i>}
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-slate-400 leading-none">Sistema</p>
                  <p className="text-xs font-bold text-emerald-500 flex items-center justify-end gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    Pronto
                  </p>
                </div>
              </div>
            </header>
          )}

          <main className={`flex-1 ${isPrintView ? 'p-0 m-0' : 'p-8 print:p-0 print:m-0'}`}>
            <Routes>
              <Route path="/financeiro" element={<Dashboard transactions={filteredTransactions} allTransactions={transactions} selectedMonth={filters.month} selectedYear={filters.year} />} />
              <Route path="/financeiro/importacoes" element={<ImportHistory onRefresh={refreshData} currentMonth={filters.month} currentYear={filters.year} isAdmin={session?.user.role === 'ADMIN'} />} />
              <Route path="/financeiro/fechamento" element={<ClosingView transactions={filteredTransactions} month={filters.month} year={filters.year} onRefresh={refreshData} />} />
              <Route path="/financeiro/backup" element={<BackupView canRestore={true} globalYear={filters.year} globalMonth={filters.month} />} />
              <Route path="/financeiro/transacoes" element={<TransactionsTable transactions={filteredTransactions} onRefresh={refreshData} />} />
              <Route path="/financeiro/relatorios" element={<ExportView transactions={filteredTransactions} filters={filters} />} />
              <Route path="/financeiro/evolucao" element={<EvolutionView transactions={transactions} filters={filters} />} />
              <Route path="*" element={<Navigate to="/financeiro" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </ModuleGuardFinanceiro>
  );
};

const App: React.FC = () => (
  <HashRouter><AppContent /></HashRouter>
);

export default App;
