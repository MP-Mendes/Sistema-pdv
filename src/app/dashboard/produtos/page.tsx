'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/Header';
import supabase from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import type { Produto } from '@/lib/types';
import { Plus, Edit2, Trash2, Search, X, Package, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const empty = { nome: '', codigo: '', descricao: '', preco: '', preco_custo: '', estoque: '', estoque_minimo: '', categoria: '', unidade: 'un' };

export default function ProdutosPage() {
  const { session } = useAuthStore();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [search, setSearch] = useState('');
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => {
    if (!session) return;
    const { data } = await supabase.from('produtos').select('*').eq('empresa_id', session.empresa.id).order('nome');
    if (data) setProdutos(data);
  };
  const openNew = () => { setF(empty); setEditId(null); setShow(true); };
  const openEdit = (p: Produto) => { setF({ nome: p.nome, codigo: p.codigo, descricao: p.descricao || '', preco: p.preco.toString(), preco_custo: (p.preco_custo || '').toString(), estoque: p.estoque.toString(), estoque_minimo: (p.estoque_minimo || '').toString(), categoria: p.categoria || '', unidade: p.unidade }); setEditId(p.id); setShow(true); };
  const save = async () => {
    if (!session || !session.empresa?.id) { toast.error('Sessão inválida - faça login novamente'); return; }
    if (!f.nome || !f.codigo || !f.preco) { toast.error('Preencha nome, código e preço'); return; }
    setSaving(true);
    try {
      const p = { empresa_id: session.empresa.id, nome: f.nome, codigo: f.codigo, descricao: f.descricao || null, preco: parseFloat(f.preco) || 0, preco_custo: f.preco_custo ? parseFloat(f.preco_custo) : null, estoque: parseInt(f.estoque) || 0, estoque_minimo: f.estoque_minimo ? parseInt(f.estoque_minimo) : null, categoria: f.categoria || null, unidade: f.unidade, ativo: true };
      if (editId) {
        const { error } = await supabase.from('produtos').update(p).eq('id', editId);
        if (error) throw error;
        toast.success('Atualizado!');
      } else {
        const { error } = await supabase.from('produtos').insert(p);
        if (error) throw error;
        toast.success('Cadastrado!');
      }
      setShow(false);
      await load();
    } catch (error) { console.error('Save error:', error); toast.error('Erro ao salvar: ' + (error as Error).message); }
    finally { setSaving(false); }
  };
  const del = async (id: string) => { if (!confirm('Remover?')) return; await supabase.from('produtos').update({ ativo: false }).eq('id', id); toast.success('Removido'); load(); };
  const filtered = produtos.filter(p => p.ativo && (p.nome.toLowerCase().includes(search.toLowerCase()) || p.codigo.toLowerCase().includes(search.toLowerCase()) || (p.categoria && p.categoria.toLowerCase().includes(search.toLowerCase()))));

  return (
    <div>
      <Header title="Produtos" subtitle="Catálogo de produtos" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl" placeholder="Buscar..." />
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl"><Plus className="w-5 h-5" /> Novo</button>
        </div>
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b"><tr><th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Código</th><th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Nome</th><th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Categoria</th><th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Preço</th><th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Estoque</th><th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Ações</th></tr></thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-slate-400"><Package className="w-12 h-12 mx-auto mb-2 opacity-50" />Nenhum produto</td></tr>
              : filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-mono">{p.codigo}</td>
                  <td className="px-4 py-3 text-sm font-medium">{p.nome}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{p.categoria || '-'}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">{formatCurrency(p.preco)}</td>
                  <td className="px-4 py-3 text-sm text-right"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.estoque <= 0 ? 'bg-red-100 text-red-700' : p.estoque_minimo && p.estoque <= p.estoque_minimo ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{p.estoque} {p.unidade}</span></td>
                  <td className="px-4 py-3 text-center"><button onClick={() => openEdit(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg inline-block"><Edit2 className="w-4 h-4" /></button><button onClick={() => del(p.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg inline-block ml-1"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b"><h2 className="text-lg font-semibold">{editId ? 'Editar' : 'Novo'} Produto</h2><button onClick={() => setShow(false)}><X className="w-5 h-5" /></button></div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Código *</label><input type="text" value={f.codigo} onChange={e => setF({...f, codigo: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Unidade</label><select value={f.unidade} onChange={e => setF({...f, unidade: e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="un">Unidade</option><option value="kg">Kg</option><option value="g">Grama</option><option value="l">Litro</option><option value="ml">ML</option><option value="cx">Caixa</option><option value="pc">Pacote</option></select></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Nome *</label><input type="text" value={f.nome} onChange={e => setF({...f, nome: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-1">Descrição</label><textarea value={f.descricao} onChange={e => setF({...f, descricao: e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows={2} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Preço Venda *</label><input type="number" step="0.01" value={f.preco} onChange={e => setF({...f, preco: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Preço Custo</label><input type="number" step="0.01" value={f.preco_custo} onChange={e => setF({...f, preco_custo: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium mb-1">Estoque</label><input type="number" value={f.estoque} onChange={e => setF({...f, estoque: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Estoque Mín.</label><input type="number" value={f.estoque_minimo} onChange={e => setF({...f, estoque_minimo: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Categoria</label><input type="text" value={f.categoria} onChange={e => setF({...f, categoria: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button onClick={() => setShow(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"><Save className="w-4 h-4" />{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}