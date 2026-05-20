'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import Header from '@/components/Header';
import supabase from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { METODOS_PAGAMENTO, type Produto, type Cliente, type MetodoPagamento } from '@/lib/types';
import { Search, Plus, Minus, Trash2, ShoppingCart, User, X, Check, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VendasPage() {
  const { session } = useAuthStore();
  const { items, clienteId, clienteNome, desconto, addItem, removeItem, updateQuantity, setCliente, setDesconto, clearCart, getSubtotal, getTotal } = useCartStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastVenda, setLastVenda] = useState<any>(null);
  const [clienteSearch, setClienteSearch] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [paymentMetodos, setPaymentMetodos] = useState<{ metodo: MetodoPagamento; valor: number }[]>([{ metodo: 'dinheiro', valor: 0 }]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadProdutos(); loadClientes(); searchRef.current?.focus(); }, []);

  const loadProdutos = async () => {
    if (!session) return;
    const { data } = await supabase.from('produtos').select('*').eq('empresa_id', session.empresa.id).eq('ativo', true).order('nome');
    if (data) setProdutos(data);
  };

  const loadClientes = async () => {
    if (!session) return;
    const { data } = await supabase.from('clientes').select('*').eq('empresa_id', session.empresa.id).eq('ativo', true).order('nome');
    if (data) setClientes(data);
  };

  const filteredProdutos = produtos.filter(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || p.codigo.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredClientes = clientes.filter(c => c.nome.toLowerCase().includes(clienteSearch.toLowerCase()));

  const handleSelectCliente = (cliente: Cliente) => { setSelectedCliente(cliente); setCliente(cliente.id, cliente.nome); setShowClientModal(false); setClienteSearch(''); };
  const handleAddToCart = (produto: Produto) => { if (produto.estoque <= 0) { toast.error('Produto sem estoque!'); return; } addItem(produto); toast.success(produto.nome + ' adicionado!'); setSearchTerm(''); searchRef.current?.focus(); };

  const handleFinalizeSale = () => {
    if (items.length === 0) { toast.error('Adicione itens ao carrinho'); return; }
    setPaymentMetodos([{ metodo: 'dinheiro', valor: getTotal() }]);
    setShowPaymentModal(true);
  };

  const addPaymentMethod = () => { const remaining = getTotal() - paymentMetodos.reduce((s, m) => s + m.valor, 0); if (remaining <= 0) { toast.error('Total já foi coberto'); return; } setPaymentMetodos([...paymentMetodos, { metodo: 'dinheiro', valor: remaining }]); };
  const updatePaymentMethod = (index: number, field: 'metodo' | 'valor', value: any) => { const updated = [...paymentMetodos]; if (field === 'metodo') updated[index].metodo = value; else updated[index].valor = parseFloat(value) || 0; setPaymentMetodos(updated); };
  const removePaymentMethod = (index: number) => { if (paymentMetodos.length <= 1) return; setPaymentMetodos(paymentMetodos.filter((_, i) => i !== index)); };

  const handleConfirmPayment = async () => {
    if (!session) return;
    const totalPagamentos = paymentMetodos.reduce((s, m) => s + m.valor, 0);
    const totalVenda = getTotal();
    if (Math.abs(totalPagamentos - totalVenda) > 0.01) { toast.error('Pagamentos (' + formatCurrency(totalPagamentos) + ') != Venda (' + formatCurrency(totalVenda) + ')'); return; }
    try {
      const { data: lv } = await supabase.from('vendas').select('numero_venda').eq('empresa_id', session.empresa.id).order('numero_venda', { ascending: false }).limit(1).single();
      const numeroVenda = lv ? lv.numero_venda + 1 : 1;
      const { data: venda, error: ve } = await supabase.from('vendas').insert({ empresa_id: session.empresa.id, cliente_id: clienteId, usuario_id: session.usuario.id, numero_venda: numeroVenda, subtotal: getSubtotal(), desconto, total: totalVenda, status: 'finalizada' }).select().single();
      if (ve) throw ve;
      await supabase.from('itens_venda').insert(items.map(item => ({ venda_id: venda.id, produto_id: item.produto.id, produto_nome: item.produto.nome, produto_codigo: item.produto.codigo, quantidade: item.quantidade, preco_unitario: item.produto.preco, subtotal: item.subtotal })));
      await supabase.from('pagamentos_venda').insert(paymentMetodos.map(m => ({ venda_id: venda.id, metodo: m.metodo, valor: m.valor })));
      for (const item of items) { await supabase.from('produtos').update({ estoque: item.produto.estoque - item.quantidade }).eq('id', item.produto.id); }
      const crediarioPayment = paymentMetodos.find(m => m.metodo === 'crediario' || m.metodo === 'carne');
      if (crediarioPayment && clienteId) { await supabase.from('crediarios').insert({ empresa_id: session.empresa.id, cliente_id: clienteId, venda_id: venda.id, valor_total: crediarioPayment.valor, valor_pago: 0, valor_pendente: crediarioPayment.valor, status: 'aberto' }); }
      setLastVenda({ ...venda, itens: items, pagamentos: paymentMetodos, cliente_nome: clienteNome });
      setShowPaymentModal(false); setShowReceipt(true); clearCart(); loadProdutos();
      toast.success('Venda finalizada!');
    } catch (error) { console.error(error); toast.error('Erro ao finalizar venda'); }
  };

  const subtotal = getSubtotal(); const total = getTotal(); const totalPagamentos = paymentMetodos.reduce((s, m) => s + m.valor, 0);

  return (
    <div>
      <Header title="Vendas" subtitle="Frente de caixa" />
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input ref={searchRef} type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg" placeholder="Buscar produto por nome ou código..." />
            </div>
            {searchTerm && (
              <div className="bg-white rounded-xl border border-slate-200 max-h-80 overflow-y-auto">
                {filteredProdutos.length === 0 ? <p className="p-4 text-slate-400 text-center">Nenhum produto encontrado</p> : filteredProdutos.map(p => (
                  <button key={p.id} onClick={() => handleAddToCart(p)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-left">
                    <div><p className="font-medium text-slate-900">{p.nome}</p><p className="text-sm text-slate-500">Cód: {p.codigo} • Estoque: {p.estoque}</p></div>
                    <div className="text-right"><p className="font-bold text-green-600">{formatCurrency(p.preco)}</p><Plus className="w-4 h-4 text-blue-600 ml-auto" /></div>
                  </button>
                ))}
              </div>
            )}
            {!searchTerm && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-medium text-slate-500 mb-3">Produtos (clique para adicionar)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                  {produtos.slice(0, 30).map(p => (
                    <button key={p.id} onClick={() => handleAddToCart(p)} disabled={p.estoque <= 0} className="p-3 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed">
                      <p className="font-medium text-sm text-slate-900 truncate">{p.nome}</p>
                      <p className="text-xs text-slate-500">Cód: {p.codigo}</p>
                      <p className="font-bold text-green-600 mt-1">{formatCurrency(p.preco)}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 flex flex-col h-fit sticky top-6">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                  <h2 className="font-semibold text-slate-900">Carrinho</h2>
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                {items.length > 0 && <button onClick={clearCart} className="text-red-500 hover:text-red-700 text-sm">Limpar</button>}
              </div>
              <button onClick={() => setShowClientModal(true)} className="w-full flex items-center gap-2 p-2 border border-dashed border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-500">{clienteNome || 'Selecionar cliente (opcional)'}</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto max-h-64 p-4 space-y-2">
              {items.length === 0 ? <p className="text-slate-400 text-center py-8 text-sm">Carrinho vazio</p> : items.map(item => (
                <div key={item.produto.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{item.produto.nome}</p><p className="text-xs text-slate-500">{formatCurrency(item.produto.preco)} x {item.quantidade}</p></div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQuantity(item.produto.id, item.quantidade - 1)} className="p-1 rounded hover:bg-slate-200"><Minus className="w-3 h-3" /></button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantidade}</span>
                    <button onClick={() => updateQuantity(item.produto.id, item.quantidade + 1)} className="p-1 rounded hover:bg-slate-200"><Plus className="w-3 h-3" /></button>
                  </div>
                  <p className="text-sm font-bold text-green-600 w-20 text-right">{formatCurrency(item.subtotal)}</p>
                  <button onClick={() => removeItem(item.produto.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-200 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
              {desconto > 0 && <div className="flex justify-between text-sm text-red-500"><span>Desconto</span><span>-{formatCurrency(desconto)}</span></div>}
              <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2"><span>Total</span><span className="text-green-600">{formatCurrency(total)}</span></div>
              <button onClick={handleFinalizeSale} disabled={items.length === 0} className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <Check className="w-5 h-5" /> Finalizar Venda
              </button>
            </div>
          </div>
        </div>
      </div>
      {showClientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b"><h2 className="text-lg font-semibold">Selecionar Cliente</h2><button onClick={() => setShowClientModal(false)}><X className="w-5 h-5" /></button></div>
            <div className="p-4"><input type="text" value={clienteSearch} onChange={(e) => setClienteSearch(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg" placeholder="Buscar cliente..." /></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <button onClick={() => { setSelectedCliente(null); setCliente(null, null); setShowClientModal(false); }} className="w-full p-3 text-left rounded-lg hover:bg-slate-100 border border-slate-200"><p className="font-medium">Venda sem cliente</p></button>
              {filteredClientes.map(c => (<button key={c.id} onClick={() => handleSelectCliente(c)} className="w-full p-3 text-left rounded-lg hover:bg-slate-100 border border-slate-200"><p className="font-medium">{c.nome}</p><p className="text-sm text-slate-500">{c.cpf_cnpj || 'Sem CPF/CNPJ'}</p></button>))}
            </div>
          </div>
        </div>
      )}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b"><h2 className="text-lg font-semibold">Formas de Pagamento</h2><button onClick={() => setShowPaymentModal(false)}><X className="w-5 h-5" /></button></div>
            <div className="p-4 space-y-4 overflow-y-auto">
              <div className="bg-blue-50 p-4 rounded-xl"><p className="text-sm text-blue-600">Total da Venda</p><p className="text-3xl font-bold text-blue-700">{formatCurrency(total)}</p></div>
              <div className="space-y-3">
                {paymentMetodos.map((pm, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select value={pm.metodo} onChange={(e) => updatePaymentMethod(index, 'metodo', e.target.value)} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg">
                      {METODOS_PAGAMENTO.map(m => (<option key={m.value} value={m.value}>{m.label}</option>))}
                    </select>
                    <input type="number" value={pm.valor || ''} step="0.01" min="0" onChange={(e) => updatePaymentMethod(index, 'valor', e.target.value)} className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-right" placeholder="0.00" />
                    {paymentMetodos.length > 1 && (<button onClick={() => removePaymentMethod(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><X className="w-4 h-4" /></button>)}
                  </div>
                ))}
              </div>
              <button onClick={addPaymentMethod} className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-500 hover:text-blue-500 transition-all text-sm">+ Adicionar forma de pagamento</button>
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="flex justify-between text-sm"><span>Total pago:</span><span className={totalPagamentos === total ? 'text-green-600 font-bold' : 'text-orange-600 font-bold'}>{formatCurrency(totalPagamentos)}</span></div>
                {totalPagamentos !== total && <p className="text-xs text-orange-600 mt-1">Restante: {formatCurrency(total - totalPagamentos)}</p>}
              </div>
            </div>
            <div className="p-4 border-t">
              <button onClick={handleConfirmPayment} disabled={Math.abs(totalPagamentos - total) > 0.01} className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                <Check className="w-5 h-5" /> Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}
      {showReceipt && lastVenda && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b"><h2 className="text-lg font-semibold">Comprovante</h2><button onClick={() => setShowReceipt(false)}><X className="w-5 h-5" /></button></div>
            <div className="p-6 overflow-y-auto">
              <div className="text-center mb-4"><h3 className="font-bold text-lg">{session?.empresa?.nome || 'Empresa'}</h3><p className="text-xs text-slate-500">COMPROVANTE NÃO FISCAL</p></div>
              <div className="border-t border-dashed border-slate-300 pt-3 space-y-1 text-sm">
                <p><strong>Venda #:</strong> {(lastVenda.numero_venda || 0).toString().padStart(6, '0')}</p>
                <p><strong>Data:</strong> {new Date(lastVenda.created_at).toLocaleString('pt-BR')}</p>
                {lastVenda.cliente_nome && <p><strong>Cliente:</strong> {lastVenda.cliente_nome}</p>}
              </div>
              <div className="border-t border-dashed border-slate-300 mt-3 pt-3">
                {lastVenda.itens?.map((item: any, i: number) => (<div key={i} className="flex justify-between text-sm py-1"><span>{item.quantidade}x {item.produto.nome}</span><span>{formatCurrency(item.subtotal)}</span></div>))}
              </div>
              <div className="border-t border-dashed border-slate-300 mt-3 pt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(lastVenda.subtotal)}</span></div>
                {lastVenda.desconto > 0 && <div className="flex justify-between text-red-500"><span>Desconto:</span><span>-{formatCurrency(lastVenda.desconto)}</span></div>}
                <div className="flex justify-between font-bold text-lg border-t border-slate-200 pt-2"><span>Total:</span><span className="text-green-600">{formatCurrency(lastVenda.total)}</span></div>
              </div>
              <div className="border-t border-dashed border-slate-300 mt-3 pt-3 text-sm">
                <p className="font-medium mb-1">Pagamentos:</p>
                {lastVenda.pagamentos?.map((p: any, i: number) => (<div key={i} className="flex justify-between"><span>{METODOS_PAGAMENTO.find(m => m.value === p.metodo)?.label}:</span><span>{formatCurrency(p.valor)}</span></div>))}
              </div>
            </div>
            <div className="p-4 border-t">
              <button onClick={() => window.print()} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                <Printer className="w-5 h-5" /> Imprimir Comprovante
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}