
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { authService } from '../services/authService';
import { User, UserRole, AuditLog, AuthSession } from '../types';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState<{show: boolean, userId: string, userName: string}>({show: false, userId: '', userName: ''});
  const [showDeleteModal, setShowDeleteModal] = useState<{show: boolean, user: User | null}>({show: false, user: null});
  
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING'>('ALL');
  const [formData, setFormData] = useState({ name: '', email: '', role: 'OPERADOR' as UserRole, password: '' });
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<AuthSession | null>(null);

  const fetchData = async () => {
    try {
      const uData = await storageService.getUsers();
      const lData = await storageService.getAuditLogs();
      setUsers(uData || []);
      setLogs(lData || []);
    } catch (error) {
      console.error("Erro ao carregar dados de usuários:", error);
    }
  };

  useEffect(() => {
    // Correctly fetch session on mount to resolve Promise errors
    authService.getSession().then(setCurrentSession);
    fetchData();
  }, []);

  const pendingCount = users.filter(u => !u.active).length;

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const usersList = await storageService.getUsers();
      if (usersList.some(u => u.email === formData.email)) {
        alert('Este e-mail já possui um registro no sistema.');
        setLoading(false);
        return;
      }
      const passwordHash = await authService.hashPassword(formData.password);
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
      await storageService.logAction(currentSession?.user.id || 'SYSTEM', currentSession?.user.name || 'Admin', 'CRIA_USUARIO', `Criou usuário: ${formData.name}`);
      await fetchData();
      setShowAddModal(false);
      setFormData({ name: '', email: '', role: 'OPERADOR', password: '' });
      alert("Usuário criado com sucesso.");
    } catch (error) {
      alert("Erro ao criar usuário.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const passwordHash = await authService.hashPassword(newPassword);
      await storageService.updateUser(showPasswordModal.userId, { passwordHash });
      await storageService.logAction(currentSession?.user.id || 'SYSTEM', currentSession?.user.name || 'Admin', 'ALTEROU_SENHA', `Alterou senha de: ${showPasswordModal.userName}`);
      
      alert("Senha atualizada com sucesso.");
      setShowPasswordModal({show: false, userId: '', userName: ''});
      setNewPassword('');
      await fetchData();
    } catch (error) {
      alert("Erro ao alterar senha.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (user: User) => {
    setProcessingId(user.id);
    try {
      await storageService.updateUser(user.id, { active: true });
      await storageService.logAction(currentSession?.user.id || 'SYSTEM', currentSession?.user.name || 'Admin', 'APROVOU_ACESSO', `Aprovou acesso de: ${user.name}`);
      await fetchData();
      alert(`Acesso de ${user.name} liberado.`);
    } catch (e) {
      alert("Erro ao aprovar usuário.");
    } finally {
      setProcessingId(null);
    }
  };

  const confirmDelete = async () => {
    const user = showDeleteModal.user;
    if (!user) return;

    if (user.id === currentSession?.user.id) {
      alert("Você não pode excluir a si mesmo.");
      setShowDeleteModal({show: false, user: null});
      return;
    }

    setProcessingId(user.id);
    try {
      // Persistência real no banco de dados
      await storageService.deleteUser(user.id);
      
      // Auditoria da exclusão
      await storageService.logAction(
        currentSession?.user.id || 'SYSTEM', 
        currentSession?.user.name || 'Admin', 
        'EXCLUIU_USUARIO', 
        `Excluiu permanentemente o usuário: ${user.name} (${user.email})`
      );
      
      // Forçar atualização da lista (fetchData) para sumir com o usuário da UI
      await fetchData();
      
      alert("Usuário excluído com sucesso.");
    } catch (e) {
      console.error("Erro na exclusão:", e);
      alert("Ocorreu um erro técnico ao tentar excluir o usuário. Verifique sua permissão.");
    } finally {
      setProcessingId(null);
      setShowDeleteModal({show: false, user: null});
    }
  };

  const filteredUsers = activeFilter === 'PENDING' ? users.filter(u => !u.active) : users;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">Controle de Acessos</h2>
          <p className="text-sm text-slate-500 font-medium">Gestão administrativa de usuários e permissões</p>
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
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeFilter === 'ALL' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
            >
              Todos os Usuários
            </button>
            <button 
              onClick={() => setActiveFilter('PENDING')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeFilter === 'PENDING' ? 'bg-rose-600 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
            >
              Aguardando Aprovação
              {pendingCount > 0 && <span className="bg-white text-rose-600 px-1.5 rounded-md text-[10px]">{pendingCount}</span>}
            </button>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Usuário</th>
                    <th className="px-6 py-4">Nível</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className={`hover:bg-slate-50/50 transition-colors ${!user.active ? 'bg-rose-50/20' : ''}`}>
                      <td className="px-6 py-5">
                        <div className="font-bold text-slate-900">{user.name}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{user.email}</div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${user.role === 'ADMIN' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-100 text-slate-500'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${user.active ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          <span className={`text-[9px] font-black uppercase tracking-wider ${user.active ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {user.active ? 'Ativo' : 'Pendente'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center gap-2">
                          {/* Botão de Liberação apenas para pendentes */}
                          {!user.active && (
                             <button 
                               onClick={() => handleApprove(user)}
                               disabled={processingId !== null}
                               className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase hover:bg-emerald-700 transition-all disabled:opacity-50"
                             >
                               {processingId === user.id ? <i className="fas fa-spinner fa-spin"></i> : "Liberar Acesso"}
                             </button>
                          )}

                          {/* Botão Alterar Senha - Sempre visível */}
                          <button 
                            onClick={() => setShowPasswordModal({show: true, userId: user.id, userName: user.name})}
                            disabled={processingId !== null}
                            className="w-8 h-8 bg-slate-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-center transition-all disabled:opacity-50"
                            title="Redefinir Senha"
                          >
                            <i className="fas fa-key text-[10px]"></i>
                          </button>

                          {/* Botão Excluir - Abre Modal de Confirmação */}
                          <button 
                            onClick={() => setShowDeleteModal({show: true, user})}
                            disabled={processingId !== null}
                            className="w-8 h-8 bg-slate-50 text-slate-300 rounded-lg flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all disabled:opacity-50" 
                            title="Excluir Permanentemente"
                          >
                            <i className="fas fa-trash-alt text-[10px]"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Auditoria do Sistema */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm flex flex-col h-[600px]">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Auditoria Administrativa</h3>
            <button onClick={fetchData} className="text-slate-400 hover:text-blue-600"><i className="fas fa-sync-alt text-xs"></i></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {logs.length > 0 ? logs.map(log => (
              <div key={log.id} className="relative pl-6 border-l-2 border-slate-100 pb-2">
                <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-slate-300"></div>
                <p className="text-[9px] font-black uppercase text-blue-600 mb-1">{new Date(log.timestamp).toLocaleString('pt-BR')}</p>
                <p className="text-xs font-bold text-slate-900">{log.userName}</p>
                <p className="text-[10px] text-slate-500 mb-1 leading-tight">{log.details}</p>
                <span className="text-[8px] font-black uppercase bg-slate-100 px-1.5 py-0.5 rounded text-slate-400 tracking-tighter">{log.action}</span>
              </div>
            )) : (
              <div className="text-center py-20 text-slate-300 italic text-xs">Sem registros recentes.</div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Adicionar Usuário */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Novo Acesso</h3>
              <button onClick={() => !loading && setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleAddUser} className="p-8 space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Nome Completo</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3.5 text-sm outline-none focus:border-blue-500 transition-all bg-slate-50" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">E-mail</label>
                <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3.5 text-sm outline-none focus:border-blue-500 transition-all bg-slate-50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Permissão</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})} className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-bold bg-slate-50">
                    <option value="OPERADOR">OPERADOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Senha</label>
                  <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3.5 text-sm bg-slate-50" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-slate-950 text-white py-4 rounded-xl font-black uppercase text-[10px] hover:bg-slate-800 transition-all mt-4 tracking-widest shadow-xl shadow-slate-900/20 disabled:opacity-50">
                {loading ? <i className="fas fa-spinner fa-spin mr-2"></i> : "Criar Usuário Ativo"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Alterar Senha */}
      {showPasswordModal.show && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Nova Senha</h3>
              <button onClick={() => !loading && setShowPasswordModal({show: false, userId: '', userName: ''})} className="text-slate-400 hover:text-slate-600"><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleChangePassword} className="p-8 space-y-6">
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center">
                <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1">Usuário</p>
                <p className="text-sm font-bold text-blue-900">{showPasswordModal.userName}</p>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Defina a nova senha</label>
                <input 
                  type="password" 
                  required 
                  autoFocus
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  className="w-full border border-slate-200 rounded-xl p-3.5 text-sm outline-none focus:border-blue-500 transition-all bg-slate-50" 
                />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[10px] hover:bg-blue-700 transition-all tracking-widest shadow-xl shadow-blue-500/20 disabled:opacity-50">
                {loading ? <i className="fas fa-spinner fa-spin mr-2"></i> : "Atualizar Credenciais"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirmar Exclusão */}
      {showDeleteModal.show && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl border border-rose-100 animate-in zoom-in-95 duration-300 text-center p-10">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 text-3xl">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Excluir Usuário?</h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              Deseja realmente excluir esse usuário?<br/>
              <span className="font-bold text-slate-900">{showDeleteModal.user?.name}</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={() => !processingId && setShowDeleteModal({show: false, user: null})}
                className="py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
              >
                Não
              </button>
              <button 
                type="button"
                onClick={confirmDelete}
                disabled={processingId !== null}
                className="py-4 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50 flex items-center justify-center"
              >
                {processingId === showDeleteModal.user?.id ? <i className="fas fa-spinner fa-spin"></i> : "Sim, Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
