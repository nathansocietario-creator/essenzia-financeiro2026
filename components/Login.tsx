
import React, { useState } from 'react';
import { authService } from '../services/authService';
import Logo from './Logo';

interface AuthProps {
  onLoginSuccess: () => void;
}

type AuthMode = 'login' | 'register';

const Login: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const result = await authService.login(email, password);
      if (result.success && result.session) {
        onLoginSuccess();
      } else {
        setError(result.message || 'Credenciais inválidas ou conta aguardando aprovação.');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor do Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (password !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    if (password.length < 8) {
      setError('Aumente sua segurança: a senha deve ter pelo menos 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.register(name, email, password);
      if (result.success) {
        setSuccess(result.message);
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        if (result.autoActivated) {
           setTimeout(() => setMode('login'), 4000);
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Erro ao processar o cadastro no banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Elementos Decorativos de Fundo */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600 rounded-full blur-[140px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-12 duration-1000">
        {/* Logo e Nome do Sistema */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-900 rounded-3xl shadow-2xl mb-4 border border-slate-800 group hover:border-blue-500/50 transition-all duration-500">
            <Logo className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Essenzia <span className="text-blue-500">Financeiro</span></h1>
          <p className="text-[10px] uppercase tracking-[0.5em] font-black text-slate-500 mt-1">Accounting & Intelligence</p>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden border border-slate-100">
          
          {/* Tabs Switcher */}
          <div className="flex p-2 bg-slate-50 border-b border-slate-100">
            <button 
              onClick={() => { setMode('login'); resetMessages(); }}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-2xl transition-all duration-300 ${mode === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Entrar
            </button>
            <button 
              onClick={() => { setMode('register'); resetMessages(); }}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-2xl transition-all duration-300 ${mode === 'register' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Cadastrar
            </button>
          </div>

          <div className="p-8 md:p-10">
            {/* Feedback Messages */}
            {error && (
              <div className="mb-6 bg-rose-50 text-rose-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 border border-rose-100 animate-in shake duration-300">
                <i className="fas fa-exclamation-circle text-base"></i>
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 bg-emerald-50 text-emerald-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 border border-emerald-100 animate-in zoom-in-95 duration-300">
                <i className="fas fa-check-circle text-base"></i>
                {success}
              </div>
            )}

            <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-5">
              
              {mode === 'register' && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-left-4 duration-300">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nome Completo</label>
                  <div className="relative group">
                    <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"></i>
                    <input 
                      type="text" 
                      required
                      placeholder="Nathan Essenzia"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">E-mail Corporativo</label>
                <div className="relative group">
                  <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"></i>
                  <input 
                    type="email" 
                    required
                    placeholder="seu@email.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Senha de Acesso</label>
                <div className="relative group">
                  <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"></i>
                  <input 
                    type="password" 
                    required
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {mode === 'register' && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirmar Senha</label>
                  <div className="relative group">
                    <i className="fas fa-shield-alt absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"></i>
                    <input 
                      type="password" 
                      required
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {mode === 'login' && (
                <div className="flex justify-end">
                  <button type="button" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors">Esqueci a senha</button>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-slate-950 text-white font-black uppercase tracking-[0.2em] text-xs py-5 rounded-2xl shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500 opacity-10"></div>
                {loading ? (
                  <i className="fas fa-circle-notch fa-spin text-lg"></i>
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Acessar Painel' : 'Criar Conta'}</span>
                    <i className={`fas ${mode === 'login' ? 'fa-arrow-right' : 'fa-user-plus'} text-[10px]`}></i>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Rodapé Interno */}
          <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Ambiente Restrito <i className="fas fa-lock ml-1 text-slate-300"></i>
            </p>
          </div>
        </div>

        {/* Footer Externo */}
        <div className="mt-6 text-center">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">
            &copy; {new Date().getFullYear()} Essenzia Accounting Group
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
