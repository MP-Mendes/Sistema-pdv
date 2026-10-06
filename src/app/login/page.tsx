'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Eye, EyeOff, LogIn, Store } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const { session, setSession, loading: authLoading, setAuthLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
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
          <div className="mb-6">
            <div className="flex items-center gap-2 text-slate-900">
              <LogIn className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Acesso ao sistema</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">Entre com a conta fornecida pelo administrador.</p>
          </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="seu@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all pr-10" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
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
        </div>
        <p className="text-center text-blue-200 text-sm mt-6">© {new Date().getFullYear()} Sistema PDV. Todos os direitos reservados.</p>
      </div>
    </div>
  );
}
