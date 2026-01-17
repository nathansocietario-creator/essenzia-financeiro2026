
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

  const fetchData = async () => {
    const uData = await storageService.getUsers();
    const lData = await storageService.getAuditLogs();
    setUsers(uData);
    setLogs(lData);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const pendingCount = users.filter(u => !u.active).length;

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const usersList = await storageService.getUsers();
    if (usersList.some(u => u.email === formData.email)) {
      alert('Este e-mail já possui um registro no sistema.');
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

    await storageService.saveUser(newUser);
    await storageService.logAction('SYSTEM_ADMIN', 'Administrador', 'CRIA_USUARIO', `Criou novo usuário ativo: ${formData.name}`);
    await fetchData();
    setShowAddModal(false);
    setFormData({ name: '', email: '', role: 'OPERADOR', password: '' });
    setLoading(false);
  };

  const handleApprove = async (user: User) => {
    await storageService.updateUser(user.id, { active: true });
    await storageService.logAction('SYSTEM_ADMIN', 'Administrador', 'APROVOU_ACESSO', `Aprovou acesso do usuário: ${user.name}`);
    await fetchData();
  };

  const handleRejectOrDelete = async (user: User, isPending: boolean) => {
    const actionLabel = isPending ? 'NEGAR' : 'REMOVER';
    const message = isPending 
      ? `Deseja realmente NEGAR a solicitação de ${user.name}? O registro será excluído permanentemente e ele não terá acesso.`
      : `Deseja realmente REMOVER permanentemente o usuário ${user.name}? Esta ação não pode ser desfeita.`;

    if (confirm(message)) {
      await storageService.deleteUser(user.id);
      const action = isPending ? 'NEGOU_SOLICITACAO' : 'REMOVEU_USUARIO';
      const detail = isPending ? `Negou e excluiu solicitação de: ${user.name}` : `Excluiu usuário permanentemente: ${user.name}`;
      
      await storageService.logAction('SYSTEM_ADMIN', 'Administrador', action, detail);
      await fetchData();
    }
  };

  const toggleUserStatus = async (user: User) => {
    const newStatus = !user.active;
    await storageService.updateUser(user.id, { active: newStatus });
    const action = newStatus ? 'REATIVOU' : 'SUSPENDEU';
    await storageService.logAction('SYSTEM_ADMIN', 'Administrador', action, `${action} acesso do usuário: ${user.name}`);
    await fetchData();
  };

  const filteredUsers = activeFilter === 'PENDING' ? users.filter(u => !u.active) : users;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">Controle de Acessos</h2>
          <p className="text-sm text-slate-500 font-medium">Gestão de identidades e auditoria de usuários</p>
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
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveFilter('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
            >
              Lista Geral
            </button>
            <button 
              onClick={() => setActiveFilter('PENDING')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeFilter === 'PENDING' ? 'bg-rose-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
            >
              Novas Solicitações
              {pendingCount > 0 && <span className="bg-white text-rose-600 px-1.5 rounded-md text-[10px]">{pendingCount}</span>}
            </button>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                <tr>
                  <th className="px-6 py-4">Usuário / E-mail</th>
                  <th className="px-6 py-4">Papel</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Controle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.length > 0 ? filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
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
                    <td className="px-6 py-5">
                      <div className="flex justify-center gap-2">
                        {!user.active ? (
                          <>
                            <button 
                              onClick={() => handleApprove(user)}
                              title="Aprovar Acesso"
                              className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
                            >
                              <i className="fas fa-check text-xs"></i>
                            </button>
                            <button 
                              onClick={() => handleRejectOrDelete(user, true)}
                              title="Negar e Excluir Registro"
                              className="w-10 h-10 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all"
                            >
                              <i className="fas fa-trash-alt text-xs"></i>
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => toggleUserStatus(user)}
                              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${user.active ? 'bg-slate-100 text-slate-400 hover:text-amber-600' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                              title={user.active ? "Suspender Acesso" : "Reativar Acesso"}
                            >
                              <i className={`fas ${user.active ? 'fa-user-slash' : 'fa-user-check'} text-xs`}></i>
                            </button>
                            <button 
                              onClick={() => handleRejectOrDelete(user, false)}
                              title="Excluir Usuário"
                              className="w-10 h-10 bg-slate-50 text-slate-300 rounded-xl flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all"
                            >
                              <i className="fas fa-trash-alt text-xs"></i>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-xs italic">Nenhum usuário para exibir.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm flex flex-col h-[600px]">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Atividade dos Administradores</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {logs.length > 0 ? logs.map(log => (
              <div key={log.id} className="relative pl-6 border-l-2 border-slate-100 pb-2 last:pb-0">
                <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-slate-300"></div>
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-1">
                  {new Date(log.timestamp).toLocaleString('pt-BR')}
                </p>
                <p className="text-xs font-bold text-slate-900">{log.userName}</p>
                <p className="text-[10px] text-slate-500 mb-1">{log.details}</p>
                <span className="text-[8px] font-black uppercase bg-slate-100 px-1.5 py-0.5 rounded tracking-tighter text-slate-400">{log.action}</span>
              </div>
            )) : (
              <div className="text-center py-10 text-slate-300 italic text-xs">Sem registros recentes.</div>
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Novo Colaborador</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-2"><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleAddUser} className="p-8 space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Nome Completo</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3.5 text-sm outline-none focus:border-blue-500 transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">E-mail</label>
                <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3.5 text-sm outline-none focus:border-blue-500 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Nível</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})} className="w-full border border-slate-200 rounded-xl p-3.5 text-sm outline-none font-bold">
                    <option value="OPERADOR">OPERADOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Senha</label>
                  <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3.5 text-sm outline-none transition-all" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-slate-950 text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-slate-800 transition-all mt-4">
                Confirmar Cadastro Ativo
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
