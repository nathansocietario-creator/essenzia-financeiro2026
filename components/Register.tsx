
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: null, message: '' });

    if (formData.password !== formData.confirmPassword) {
      setStatus({ type: 'error', message: 'As senhas não conferem.' });
      return;
    }

    if (formData.password.length < 6) {
      setStatus({ type: 'error', message: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    setLoading(true);
    try {
      const result = await authService.register(formData.name, formData.email, formData.password);
      if (result.success) {
        setStatus({ type: 'success', message: result.message });
        setFormData({ name: '', email: '', password: '', confirmPassword: '' });
      } else {
        setStatus({ type: 'error', message: result.message });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Erro ao processar solicitação.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-1/2 h-1/2 bg-blue-600 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-1/3 h-1/3 bg-emerald-500 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 p-10 md:p-12 border border-slate-800/50">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-slate-950 mb-2">Solicitar Acesso</h1>
            <p className="text-[10px] uppercase tracking-[0.3em] font-black text-slate-400">Fluxo de Aprovação Interna</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {status.type === 'success' ? (
              <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2rem] text-center space-y-4 animate-in zoom-in-95 duration-500">
                <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <i className="fas fa-check text-white text-2xl"></i>
                </div>
                <h3 className="text-lg font-bold text-emerald-900">Solicitação Enviada!</h3>
                <div className="text-xs text-emerald-700 leading-relaxed font-medium">
                  Seu cadastro foi salvo em nosso banco de dados local. <br/><br/>
                  <span className="font-bold">Aviso:</span> Como este é um sistema interno, nenhum e-mail real será enviado. 
                  Entre em contato com o administrador para ativar seu acesso.
                </div>
                <Link to="/" className="inline-block bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all">
                  Voltar ao Login
                </Link>
              </div>
            ) : (
              <>
                {status.type === 'error' && (
                  <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-xs font-bold flex items-center gap-3 border border-rose-100 animate-in shake duration-300">
                    <i className="fas fa-exclamation-circle text-sm"></i>
                    {status.message}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Nome Completo</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    placeholder="Seu nome"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">E-mail Corporativo</label>
                  <input 
                    type="email" 
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    placeholder="nome@essenzia.com.br"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Senha</label>
                    <input 
                      type="password" 
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                      placeholder="••••••"
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Confirmar</label>
                    <input 
                      type="password" 
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                      placeholder="••••••"
                      value={formData.confirmPassword}
                      onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-blue-600 text-white font-black uppercase tracking-widest text-xs py-5 rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {loading ? <i className="fas fa-circle-notch fa-spin"></i> : 'Solicitar Cadastro'}
                </button>
              </>
            )}
          </form>

          {status.type !== 'success' && (
            <div className="mt-8 pt-8 border-t border-slate-100 text-center">
              <p className="text-xs font-medium text-slate-500">
                Já possui conta? {' '}
                <Link to="/" className="text-blue-600 font-bold hover:underline">Fazer Login</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;
