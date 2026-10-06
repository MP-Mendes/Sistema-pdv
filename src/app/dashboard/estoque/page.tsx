'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { apiFetch } from '@/lib/http';
import type { Produto } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { Boxes, Plus, Minus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface Movement {
  id: string;
  tipo: string;
  quantidade: number;
  estoque_anterior: number;
  estoque_posterior: number;
  observacoes: string | null;
  created_at: string;
  produto: { nome: string; codigo: string; unidade: string } | null;
}

export default function EstoquePage() {
  const [products, setProducts] = useState<Produto[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [productId, setProductId] = useState('');
  const [type, setType] = useState<'entrada' | 'saida' | 'ajuste'>('entrada');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [{ products }, { movements }] = await Promise.all([
        apiFetch<{ products: Produto[] }>('/api/products'),
        apiFetch<{ movements: Movement[] }>('/api/inventory'),
      ]);
      setProducts(products);
      setMovements(movements);
    } catch (error) { toast.error((error as Error).message); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/inventory', { method: 'POST', body: JSON.stringify({ produto_id: productId, tipo: type, quantidade: Number(quantity), observacoes: notes }) });
      toast.success('Estoque atualizado!');
      setQuantity('');
      setNotes('');
      load();
    } catch (error) { toast.error((error as Error).message); }
    finally { setSaving(false); }
  };

  const icon = (movementType: string) => movementType === 'entrada' || movementType === 'cancelamento' ? <Plus className="w-4 h-4 text-green-600" /> : movementType === 'ajuste' ? <RefreshCw className="w-4 h-4 text-blue-600" /> : <Minus className="w-4 h-4 text-red-600" />;

  return <div><Header title="Estoque" subtitle="Entradas, saídas e trilha de movimentações" /><div className="p-6 grid grid-cols-1 xl:grid-cols-[22rem_1fr] gap-6"><section className="bg-white border rounded-xl p-5 h-fit"><div className="flex items-center gap-2 mb-4"><Boxes className="w-5 h-5 text-blue-600" /><h2 className="font-semibold">Nova movimentação</h2></div><div className="space-y-4"><div><label className="block text-sm font-medium mb-1">Produto</label><select value={productId} onChange={(event) => setProductId(event.target.value)} className="w-full px-3 py-2 border rounded-lg"><option value="">Selecione</option>{products.map((product) => <option key={product.id} value={product.id}>{product.codigo} — {product.nome}</option>)}</select></div><div><label className="block text-sm font-medium mb-1">Tipo</label><select value={type} onChange={(event) => setType(event.target.value as typeof type)} className="w-full px-3 py-2 border rounded-lg"><option value="entrada">Entrada</option><option value="saida">Saída</option><option value="ajuste">Ajuste por diferença</option></select></div><div><label className="block text-sm font-medium mb-1">Quantidade</label><input type="number" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="w-full px-3 py-2 border rounded-lg" /><p className="text-xs text-slate-500 mt-1">Em “Ajuste”, use valor negativo para reduzir.</p></div><div><label className="block text-sm font-medium mb-1">Motivo</label><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="w-full px-3 py-2 border rounded-lg" /></div><button disabled={saving || !productId || !quantity || !notes.trim()} onClick={save} className="w-full py-2.5 bg-blue-600 text-white rounded-lg disabled:opacity-50">{saving ? 'Registrando...' : 'Registrar movimentação'}</button></div></section><section className="bg-white border rounded-xl overflow-hidden"><div className="p-4 border-b"><h2 className="font-semibold">Últimas movimentações</h2></div><div className="overflow-x-auto max-h-[42rem]"><table className="w-full"><thead className="bg-slate-50 sticky top-0"><tr><th className="text-left px-4 py-3 text-sm">Data</th><th className="text-left px-4 py-3 text-sm">Produto</th><th className="text-left px-4 py-3 text-sm">Tipo</th><th className="text-right px-4 py-3 text-sm">Quantidade</th><th className="text-right px-4 py-3 text-sm">Saldo</th><th className="text-left px-4 py-3 text-sm">Motivo</th></tr></thead><tbody className="divide-y">{movements.map((movement) => <tr key={movement.id}><td className="px-4 py-3 text-sm whitespace-nowrap">{formatDateTime(movement.created_at)}</td><td className="px-4 py-3 text-sm"><p className="font-medium">{movement.produto?.nome || 'Produto removido'}</p><p className="text-xs text-slate-500">{movement.produto?.codigo}</p></td><td className="px-4 py-3 text-sm capitalize"><span className="inline-flex items-center gap-1">{icon(movement.tipo)}{movement.tipo}</span></td><td className="px-4 py-3 text-sm text-right">{Number(movement.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</td><td className="px-4 py-3 text-sm text-right">{Number(movement.estoque_posterior).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</td><td className="px-4 py-3 text-sm text-slate-600">{movement.observacoes || '—'}</td></tr>)}</tbody></table>{movements.length === 0 && <p className="p-10 text-center text-slate-500">Nenhuma movimentação registrada.</p>}</div></section></div></div>;
}
