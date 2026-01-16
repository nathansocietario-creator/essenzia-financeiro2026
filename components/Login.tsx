
import React, { useState } from 'react';
import { authService } from '../services/authService';
import Logo from './Logo';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const session = await authService.login(email, password);
      if (session) {
        onLoginSuccess();
      } else {
        setError('E-mail ou senha inválidos. Verifique suas credenciais.');
      }
    } catch (err) {
      setError('Ocorreu um erro ao tentar realizar o login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-1/2 h-1/2 bg-blue-600 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-1/3 h-1/3 bg-emerald-500 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10">
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-10 md:p-12 border border-slate-800/50">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-950 rounded-[1.5rem] shadow-2xl mb-6 border border-slate-800">
              <Logo className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-black text-slate-950 mb-1 tracking-tight">Essenzia</h1>
            <p className="text-[10px] uppercase tracking-[0.4em] font-black text-slate-400">Financeiro Intelligence</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-xs font-bold flex items-center gap-3 border border-rose-100 animate-in shake duration-300">
                <i className="fas fa-exclamation-circle text-sm"></i>
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">E-mail Corporativo</label>
              <input 
                type="email" 
                required
                autoFocus
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                placeholder="nome@essenzia.com.br"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Senha de Acesso</label>
              <input 
                type="password" 
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-950 text-white font-black uppercase tracking-widest text-xs py-5 rounded-2xl shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
            >
              {loading ? (
                <i className="fas fa-circle-notch fa-spin"></i>
              ) : (
                <>
                  Entrar no Sistema
                  <i className="fas fa-arrow-right text-[10px]"></i>
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-10 border-t border-slate-100 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acesso Restrito - Essenzia Contabilidade</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
