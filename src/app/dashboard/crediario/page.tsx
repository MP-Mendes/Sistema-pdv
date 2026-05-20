'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/Header';
import supabase from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Crediario, Cliente } from '@/lib/types';
import { CreditCard, Search, X, DollarSign, Users, AlertTriangle, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface CrediarioWithCliente extends Crediario {
  cliente: Cliente | null;
}

export default function CrediarioPage() {
  const { session } = useAuthStore();
  const [crediarios, setCrediarios] = useState<CrediarioWithCliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCrediario, setSelectedCrediario] = useState<CrediarioWithCliente | null>(null);
  const [paymentValue, setPaymentValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix'>('dinheiro');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadCrediarios(); }, []);

  const loadCrediarios = async () => {
    if (!session) return;
    const { data } = await supabase.from('crediarios').select('*, cliente:clientes(*)')
      .eq('empresa_id', session.empresa.id).order('created_at', { ascending: false });
    if (data) setCrediarios(data as CrediarioWithCliente[]);
  };

  const handlePayment = async () => {
    if (!selectedCrediario || !paymentValue) return;
    const valor = parseFloat(paymentValue);
    if (valor <= 0 || valor > selectedCrediario.valor_pendente) {
      toast.error('Valor inválido'); return;
    }
    setLoading(true);
    try {
      await supabase.from('pagamentos_crediario').insert({
        crediario_id: selectedCrediario.id, valor, metodo: paymentMethod,
      });
      const novoValorPago = Number(selectedCrediario.valor_pago) + valor;
      const novoValorPendente = Number(selectedCrediario.valor_total) - novoValorPago;
      const novoStatus = novoValorPendente <= 0.01 ? 'quitado' : 'parcial';
      await supabase.from('crediarios').update({
        valor_pago: novoValorPago, valor_pendente: Math.max(0, novoValorPendente), status: novoStatus,
      }).eq('id', selectedCrediario.id);
      toast.success('Pagamento registrado!');
      setShowPaymentModal(false);
      setPaymentValue('');
      loadCrediarios();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao registrar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const filtered = crediarios.filter((c) => {
    const matchSearch = !searchTerm || c.cliente?.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPendente = crediarios.filter(c => c.status !== 'quitado').reduce((s, c) => s + Number(c.valor_pendente), 0);
  const totalClientes = new Set(crediarios.filter(c => c.status !== 'quitado').map(c => c.cliente_id)).size;
  const totalQuitado = crediarios.filter(c => c.status === 'quitado').reduce((s, c) => s + Number(c.valor_total), 0);

  const statusColors: Record<string, string> = {
    aberto: 'bg-yellow-100 text-yellow-700',
    parcial: 'bg-blue-100 text-blue-700',
    quitado: 'bg-green-100 text-green-700',
    vencido: 'bg-red-100 text-red-700',
  };

  const statusLabels: Record<string, string> = {
    aberto: 'Aberto', parcial: 'Parcial', quitado: 'Quitado', vencido: 'Vencido',
  };

  return (
    <div>
      <Header title="Crediário" subtitle="Controle de crediário e carnês" />
      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 p-2 rounded-lg"><DollarSign className="w-5 h-5 text-orange-600" /></div>
              <div><p className="text-sm text-slate-500">Total Pendente</p><p className="text-xl font-bold text-orange-600">{formatCurrency(totalPendente)}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
              <div><p className="text-sm text-slate-500">Clientes com Débito</p><p className="text-xl font-bold">{totalClientes}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg"><CreditCard className="w-5 h-5 text-green-600" /></div>
              <div><p className="text-sm text-slate-500">Total Quitado</p><p className="text-xl font-bold text-green-600">{formatCurrency(totalQuitado)}</p></div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              placeholder="Buscar por cliente..." />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-slate-300 rounded-xl">
            <option value="all">Todos os status</option>
            <option value="aberto">Aberto</option>
            <option value="parcial">Parcial</option>
            <option value="quitado">Quitado</option>
            <option value="vencido">Vencido</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Cliente</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Data</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Total</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Pago</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Pendente</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Status</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400">
                    <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />Nenhum crediário encontrado
                  </td></tr>
                ) : filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium">{c.cliente?.nome || 'Cliente removido'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(Number(c.valor_total))}</td>
                    <td className="px-4 py-3 text-sm text-right text-green-600">{formatCurrency(Number(c.valor_pago))}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-orange-600">{formatCurrency(Number(c.valor_pendente))}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status] || ''}`}>
                        {statusLabels[c.status] || c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.status !== 'quitado' && (
                        <button onClick={() => { setSelectedCrediario(c); setShowPaymentModal(true); }}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">
                          Registrar Pagamento
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedCrediario && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Registrar Pagamento</h2>
              <button onClick={() => setShowPaymentModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl">
                <p className="text-sm text-slate-500">Cliente</p>
                <p className="font-medium">{selectedCrediario.cliente?.nome}</p>
                <div className="flex justify-between mt-2">
                  <div><p className="text-xs text-slate-500">Total</p><p className="font-semibold">{formatCurrency(Number(selectedCrediario.valor_total))}</p></div>
                  <div className="text-right"><p className="text-xs text-slate-500">Pendente</p><p className="font-semibold text-orange-600">{formatCurrency(Number(selectedCrediario.valor_pendente))}</p></div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor do Pagamento</label>
                <input type="number" step="0.01" max={selectedCrediario.valor_pendente} value={paymentValue}
                  onChange={(e) => setPaymentValue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Método de Pagamento</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="cartao_debito">Cartão de Débito</option>
                  <option value="pix">PIX</option>
                </select>
              </div>
              <button onClick={() => setPaymentValue(selectedCrediario.valor_pendente.toString())}
                className="text-sm text-blue-600 hover:underline">Pagar valor total</button>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancelar</button>
              <button onClick={handlePayment} disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50">
                <Save className="w-4 h-4" /> {loading ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}