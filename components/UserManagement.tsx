
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { hashPassword } from '../services/authService';
import { User, UserRole, AuditLog } from '../types';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING'>('ALL');
  const [formData, setFormData] = useState({ name: '', email: '', role: 'OPERADOR' as UserRole, password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setUsers(storageService.getUsers());
    setLogs(storageService.getAuditLogs());
  }, []);

  const pendingCount = users.filter(u => !u.active).length;

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const usersList = storageService.getUsers();
    if (usersList.some(u => u.email === formData.email)) {
      alert('E-mail já cadastrado.');
      setLoading(false);
      return;
    }

    const passwordHash = await hashPassword(formData.password);
    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: formData.name,
      email: formData.email,
      passwordHash,
      role: formData.role,
      active: true,
      createdAt: new Date().toISOString()
    };

    storageService.saveUser(newUser);
    setUsers(storageService.getUsers());
    setShowAddModal(false);
    setFormData({ name: '', email: '', role: 'OPERADOR', password: '' });
    setLoading(false);
  };

  const toggleUserStatus = (id: string, currentStatus: boolean, userName: string) => {
    storageService.updateUser(id, { active: !currentStatus });
    const action = !currentStatus ? 'ATIVOU' : 'DESATIVOU';
    storageService.logAction('SYSTEM_ADMIN', 'Administrador', action, `${action} acesso do usuário: ${userName}`);
    setUsers(storageService.getUsers());
  };

  const filteredUsers = activeFilter === 'PENDING' ? users.filter(u => !u.active) : users;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">Controle de Acessos</h2>
          <p className="text-sm text-slate-500 font-medium">Gestão de usuários, permissões e trilha de auditoria</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/10 flex items-center gap-2"
        >
          <i className="fas fa-user-plus text-xs"></i> Criar Usuário
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {/* Abas de Filtro */}
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveFilter('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
            >
              Todos os Usuários
            </button>
            <button 
              onClick={() => setActiveFilter('PENDING')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeFilter === 'PENDING' ? 'bg-rose-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
            >
              Aguardando Aprovação
              {pendingCount > 0 && <span className="bg-white text-rose-600 px-1.5 rounded-md text-[10px]">{pendingCount}</span>}
            </button>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                <tr>
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Nível</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.length > 0 ? filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="font-bold text-slate-900 text-sm">{user.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{user.email}</div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${user.role === 'ADMIN' ? 'text-blue-600' : 'text-slate-500'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${user.active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                        {user.active ? 'Ativo' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {!user.active ? (
                        <button 
                          onClick={() => toggleUserStatus(user.id, user.active, user.name)}
                          className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
                        >
                          Aprovar Acesso
                        </button>
                      ) : (
                        <button 
                          onClick={() => toggleUserStatus(user.id, user.active, user.name)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-2"
                          title="Desativar Usuário"
                        >
                          <i className="fas fa-user-slash text-xs"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-xs italic">Nenhum usuário encontrado neste filtro.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Logs de Auditoria */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm flex flex-col h-[600px]">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Atividade Recente</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {logs.map(log => (
              <div key={log.id} className="relative pl-6 border-l-2 border-slate-100 pb-2 last:pb-0">
                <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-slate-300"></div>
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-1">
                  {new Date(log.timestamp).toLocaleString('pt-BR')}
                </p>
                <p className="text-xs font-bold text-slate-900">{log.userName}</p>
                <p className="text-[10px] text-slate-500 mb-1">{log.details}</p>
                <span className="text-[8px] font-black uppercase bg-slate-100 px-1.5 py-0.5 rounded tracking-tighter text-slate-400">{log.action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Novo Usuário</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleAddUser} className="p-8 space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Nome Completo</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">E-mail</label>
                <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Nível de Acesso</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-blue-500 font-bold">
                  <option value="OPERADOR">OPERADOR (Importação e Relatórios)</option>
                  <option value="ADMIN">ADMIN (Controle Total)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Senha Provisória</label>
                <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-blue-500" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-slate-950 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-all mt-4">
                {loading ? 'Processando...' : 'Criar Usuário Ativo'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
