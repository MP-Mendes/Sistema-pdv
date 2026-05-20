'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Eye, EyeOff, LogIn, UserPlus, Store } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const { session, setSession, loading: authLoading, setAuthLoading } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regSenha, setRegSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');

  // Check existing session on mount - THIS FIXES THE INFINITE LOADING
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.session) {
          setSession(data.session);
        } else {
          setAuthLoading(false);
        }
      } catch {
        setAuthLoading(false);
      }
    };
    checkSession();
  }, [setSession, setAuthLoading]);

  // Redirect if session exists
  useEffect(() => {
    if (session) {
      router.push('/dashboard');
    }
  }, [session, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !senha) { toast.error('Preencha todos os campos'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });
      const data = await res.json();
      if (data.success) {
        setSession(data.session);
        toast.success('Login realizado com sucesso!');
        router.push('/dashboard');
      } else {
        toast.error(data.error || 'Erro ao fazer login');
      }
    } catch { toast.error('Erro de conexão'); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeEmpresa || !nomeUsuario || !regEmail || !regSenha) { toast.error('Preencha todos os campos obrigatórios'); return; }
    if (regSenha !== confirmSenha) { toast.error('As senhas não coincidem'); return; }
    if (regSenha.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomeEmpresa, cnpj, nomeUsuario, email: regEmail, senha: regSenha }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Conta criada! Faça login para continuar.');
        setIsLogin(true);
        setEmail(regEmail);
        setRegSenha('');
        setConfirmSenha('');
      } else { toast.error(data.error || 'Erro ao criar conta'); }
    } catch { toast.error('Erro de conexão'); }
    finally { setLoading(false); }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4" />
          <p className="text-white text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <Store className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-white">Sistema PDV</h1>
          <p className="text-blue-200 mt-1">Ponto de Venda completo</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex mb-6 bg-slate-100 rounded-lg p-1">
            <button onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <LogIn className="w-4 h-4 inline mr-1" /> Entrar
            </button>
            <button onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${!isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <UserPlus className="w-4 h-4 inline mr-1" /> Criar Conta
            </button>
          </div>
          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="seu@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all pr-10" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Empresa *</label>
                <input type="text" value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="Minha Empresa" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ</label>
                <input type="text" value={cnpj} onChange={(e) => setCnpj(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Seu Nome *</label>
                <input type="text" value={nomeUsuario} onChange={(e) => setNomeUsuario(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="João Silva" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="seu@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha *</label>
                <input type="password" value={regSenha} onChange={(e) => setRegSenha(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="Mínimo 6 caracteres" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Senha *</label>
                <input type="password" value={confirmSenha} onChange={(e) => setConfirmSenha(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="Repita a senha" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Criando conta...' : 'Criar Conta'}
              </button>
            </form>
          )}
        </div>
        <p className="text-center text-blue-200 text-sm mt-6">© 2024 Sistema PDV. Todos os direitos reservados.</p>
      </div>
    </div>
  );
}