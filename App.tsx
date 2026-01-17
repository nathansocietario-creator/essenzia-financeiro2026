
import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Transaction, FilterState, FinancialInstitution, AuthSession, User } from './types';
import { storageService } from './services/storageService';
import { authService } from './services/authService';

// Components
import Dashboard from './components/Dashboard';
import TransactionsTable from './components/TransactionsTable';
import GeneralView from './components/GeneralView';
import ExportView from './components/ExportView';
import ImportHistory from './components/ImportHistory';
import ClosingView from './components/ClosingView';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import EvolutionView from './components/EvolutionView';
import Logo from './components/Logo';

const SidebarLink = ({ to, icon, label, active, badge }: { to: string, icon: string, label: string, active: boolean, badge?: number }) => (
  <Link 
    to={to} 
    className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${
      active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <div className="flex items-center gap-3">
      <i className={`fas ${icon} w-5 text-center ${active ? 'text-white' : 'group-hover:text-blue-400'}`}></i>
      <span className="font-medium text-sm">{label}</span>
    </div>
    {badge ? (
      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${active ? 'bg-white text-blue-600' : 'bg-rose-600 text-white'}`}>
        {badge}
      </span>
    ) : null}
  </Link>
);

const AppContent: React.FC = () => {
  const [session, setSession] = useState<AuthSession | null>(authService.getSession());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sources, setSources] = useState<FinancialInstitution[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const location = useLocation();
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [filters, setFilters] = useState<FilterState>({
    month: currentMonth,
    year: Math.max(2025, currentYear),
    source: 'ALL',
    type: 'ALL',
    category: 'ALL',
    status: 'ALL'
  });

  useEffect(() => {
    if (session) {
      refreshData();
    }
  }, [session, location.pathname]);

  const refreshData = async () => {
    const [tData, sData, uData] = await Promise.all([
      storageService.getTransactions(),
      storageService.getSources(),
      storageService.getUsers()
    ]);
    setTransactions(tData);
    setSources(sData);
    setUsers(uData);
  };

  const handleLogout = async () => {
    await authService.logout();
    setSession(null);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchMonth = Number(t.month) === Number(filters.month);
      const matchYear = Number(t.year) === Number(filters.year);
      const matchSource = filters.source === 'ALL' || t.source === filters.source;
      const matchStatus = filters.status === 'ALL' || t.status === filters.status;
      const matchType = filters.type === 'ALL' || t.type === filters.type;
      return matchMonth && matchYear && matchSource && matchStatus && matchType;
    });
  }, [transactions, filters]);

  const pendingUsersCount = users.filter(u => !u.active).length;

  if (!session) {
    return <Login onLoginSuccess={() => setSession(authService.getSession())} />;
  }

  const isPrintMode = location.pathname === '/relatorios' || location.pathname === '/evolucao';
  const isAdmin = session?.user.role === 'ADMIN';

  return (
    <div className={`flex min-h-screen bg-slate-50 font-sans ${isPrintMode ? 'print:bg-white' : ''}`}>
      <aside className="w-64 bg-slate-950 text-white flex flex-col sticky top-0 h-screen print:hidden">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-slate-900 w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl border border-slate-800">
              <Logo className="w-9 h-9" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight">Essenzia</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black">Financeiro</p>
            </div>
          </div>

          <nav className="space-y-2">
            <SidebarLink to="/" icon="fa-chart-line" label="Gestão de Caixa" active={location.pathname === '/'} />
            <SidebarLink to="/transactions" icon="fa-list-ul" label="Transações" active={location.pathname === '/transactions'} />
            <SidebarLink to="/evolucao" icon="fa-chart-area" label="Evolução" active={location.pathname === '/evolucao'} />
            <SidebarLink to="/auditoria" icon="fa-fingerprint" label="Importações" active={location.pathname === '/auditoria'} />
            <SidebarLink to="/fechamento" icon="fa-lock" label="Fechamento" active={location.pathname === '/fechamento'} />
            <SidebarLink to="/relatorios" icon="fa-file-invoice" label="Relatórios" active={location.pathname === '/relatorios'} />
            
            {isAdmin && (
              <div className="pt-6">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 px-4">Administração</p>
                <SidebarLink 
                  to="/usuarios" 
                  icon="fa-users-gear" 
                  label="Usuários" 
                  active={location.pathname === '/usuarios'} 
                  badge={pendingUsersCount > 0 ? pendingUsersCount : undefined}
                />
              </div>
            )}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-slate-900">
          <div className="bg-slate-900 rounded-2xl p-4">
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Usuário Atual</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-xs uppercase">
                {session?.user.name.charAt(0)}
              </div>
              <div className="truncate">
                <span className="text-sm font-medium block truncate">{session?.user.name}</span>
                <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">{session?.user.role}</span>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full text-[10px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-300 flex items-center justify-center gap-2 pt-2 border-t border-slate-800"
            >
              <i className="fas fa-power-off"></i>
              Sair do App
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
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
                {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="h-6 w-px bg-slate-200"></div>
            <select 
              value={filters.source} 
              onChange={(e) => setFilters({...filters, source: e.target.value})}
              className="text-xs font-bold text-slate-500 uppercase tracking-wider outline-none bg-transparent cursor-pointer hover:text-blue-600 transition-colors"
            >
              <option value="ALL">Fontes: Todas</option>
              {sources.map(s => (
                <option key={s.id} value={s.id}>Fonte: {s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sistema Conectado</p>
              <p className="text-xs font-bold text-emerald-500 flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                Supabase Online
              </p>
            </div>
          </div>
        </header>

        <main className={`flex-1 p-8 ${isPrintMode ? 'print:p-0' : ''}`}>
          <Routes>
            <Route path="/" element={<Dashboard transactions={filteredTransactions} allTransactions={transactions} selectedMonth={filters.month} selectedYear={filters.year} />} />
            <Route path="/auditoria" element={<ImportHistory onRefresh={refreshData} />} />
            <Route path="/fechamento" element={<ClosingView transactions={filteredTransactions} month={filters.month} year={filters.year} onRefresh={refreshData} />} />
            <Route path="/transactions" element={<TransactionsTable transactions={filteredTransactions} onRefresh={refreshData} />} />
            <Route path="/relatorios" element={<ExportView transactions={filteredTransactions} filters={filters} />} />
            <Route path="/evolucao" element={<EvolutionView />} />
            <Route path="/usuarios" element={isAdmin ? <UserManagement /> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <HashRouter><AppContent /></HashRouter>
);

export default App;
