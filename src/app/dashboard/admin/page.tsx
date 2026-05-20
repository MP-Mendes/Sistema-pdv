'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import supabase from '@/lib/supabase';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { Empresa } from '@/lib/types';
import { Shield, Building2, DollarSign, Package, TrendingUp, Search } from 'lucide-react';

export default function AdminPage() {
  const { session } = useAuthStore();
  const router = useRouter();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ totalEmpresas: 0, empresasAtivas: 0, totalVendas: 0, faturamentoTotal: 0 });

  useEffect(() => {
    if (session?.usuario?.role !== 'admin') { router.push('/dashboard'); return; }
    loadData();
  }, [session]);

  const loadData = async () => {
    const { data: ed } = await supabase.from('empresas').select('*').order('created_at', { ascending: false });
    if (ed) setEmpresas(ed);
    const { count: tv } = await supabase.from('vendas').select('*', { count: 'exact', head: true }).eq('status', 'finalizada');
    const { data: vd } = await supabase.from('vendas').select('total').eq('status', 'finalizada');
    const fat = vd?.reduce((s, v) => s + Number(v.total), 0) || 0;
    setStats({ totalEmpresas: ed?.length || 0, empresasAtivas: ed?.filter(e => e.ativo).length || 0, totalVendas: tv || 0, faturamentoTotal: fat });
  };

  const toggleStatus = async (id: string, current: boolean) => {
    await supabase.from('empresas').update({ ativo: !current }).eq('id', id);
    loadData();
  };

  const filtered = empresas.filter(e => e.nome.toLowerCase().includes(searchTerm.toLowerCase()) || (e.cnpj && e.cnpj.includes(searchTerm)));
  if (session?.usuario?.role !== 'admin') return null;

  return (
    <div>
      <Header title="Painel Admin" subtitle="Administração central do sistema" />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-lg"><Building2 className="w-5 h-5 text-purple-600" /></div>
              <div><p className="text-sm text-slate-500">Total Empresas</p><p className="text-xl font-bold">{stats.totalEmpresas}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg"><TrendingUp className="w-5 h-5 text-green-600" /></div>
              <div><p className="text-sm text-slate-500">Ativas</p><p className="text-xl font-bold text-green-600">{stats.empresasAtivas}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg"><Package className="w-5 h-5 text-blue-600" /></div>
              <div><p className="text-sm text-slate-500">Total Vendas</p><p className="text-xl font-bold">{stats.totalVendas}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 p-2 rounded-lg"><DollarSign className="w-5 h-5 text-orange-600" /></div>
              <div><p className="text-sm text-slate-500">Faturamento</p><p className="text-xl font-bold text-orange-600">{formatCurrency(stats.faturamentoTotal)}</p></div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Empresas Cadastradas</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="Buscar..." />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Empresa</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">CNPJ</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Plano</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Cadastro</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Status</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400">
                    <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />Nenhuma empresa encontrada
                  </td></tr>
                ) : filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium">{e.nome}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 font-mono">{e.cnpj || '-'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.plano === 'admin' ? 'bg-purple-100 text-purple-700' : e.plano === 'pro' ? 'bg-blue-100 text-blue-700' : e.plano === 'basic' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>{e.plano.toUpperCase()}</span></td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatDateTime(e.created_at)}</td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{e.ativo ? 'Ativa' : 'Inativa'}</span></td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleStatus(e.id, e.ativo)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium ${e.ativo ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                        {e.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}