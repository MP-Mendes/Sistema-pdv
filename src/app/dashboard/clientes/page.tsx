'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/Header';
import supabase from '@/lib/supabase';
import type { Cliente } from '@/lib/types';
import { Plus, Edit2, Trash2, Search, X, Users, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const empty = { nome: '', cpf_cnpj: '', email: '', telefone: '', endereco: '', observacoes: '', limite_credito: '' };

export default function ClientesPage() {
  const { session } = useAuthStore();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState('');
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => {
    if (!session) return;
    const { data } = await supabase.from('clientes').select('*').eq('empresa_id', session.empresa.id).eq('ativo', true).order('nome');
    if (data) setClientes(data);
  };
  const openNew = () => { setF(empty); setEditId(null); setShow(true); };
  const openEdit = (c: Cliente) => { setF({ nome: c.nome, cpf_cnpj: c.cpf_cnpj || '', email: c.email || '', telefone: c.telefone || '', endereco: c.endereco || '', observacoes: c.observacoes || '', limite_credito: (c.limite_credito || 0).toString() }); setEditId(c.id); setShow(true); };
  const save = async () => {
    if (!session || !f.nome) { toast.error('Preencha o nome'); return; }
    setSaving(true);
    try {
      const p = { empresa_id: session.empresa.id, nome: f.nome, cpf_cnpj: f.cpf_cnpj || null, email: f.email || null, telefone: f.telefone || null, endereco: f.endereco || null, observacoes: f.observacoes || null, limite_credito: parseFloat(f.limite_credito) || 0, ativo: true };
      if (editId) { await supabase.from('clientes').update(p).eq('id', editId); toast.success('Atualizado!'); }
      else { await supabase.from('clientes').insert(p); toast.success('Cadastrado!'); }
      setShow(false); load();
    } catch { toast.error('Erro ao salvar'); }
    finally { setSaving(false); }
  };
  const del = async (id: string) => { if (!confirm('Remover?')) return; await supabase.from('clientes').update({ ativo: false }).eq('id', id); toast.success('Removido'); load(); };
  const filtered = clientes.filter(c => c.nome.toLowerCase().includes(search.toLowerCase()) || (c.cpf_cnpj && c.cpf_cnpj.includes(search)));

  return (
    <div>
      <Header title="Clientes" subtitle="Gerenciamento de clientes" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl" placeholder="Buscar..." />
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl"><Plus className="w-5 h-5" /> Novo</button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b"><tr><th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Nome</th><th className="text-left px-4 py-3 text-sm font-medium text-slate-600">CPF/CNPJ</th><th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Telefone</th><th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Email</th><th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Ações</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-slate-400"><Users className="w-12 h-12 mx-auto mb-2 opacity-50" />Nenhum cliente</td></tr>
              : filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium">{c.nome}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 font-mono">{c.cpf_cnpj || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{c.telefone || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{c.email || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => openEdit(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg inline-block"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => del(c.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg inline-block ml-1"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b"><h2 className="text-lg font-semibold">{editId ? 'Editar' : 'Novo'} Cliente</h2><button onClick={() => setShow(false)}><X className="w-5 h-5" /></button></div>
            <div className="p-4 space-y-4">
              <div><label className="block text-sm font-medium mb-1">Nome *</label><input type="text" value={f.nome} onChange={e => setF({...f, nome: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">CPF/CNPJ</label><input type="text" value={f.cpf_cnpj} onChange={e => setF({...f, cpf_cnpj: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Telefone</label><input type="text" value={f.telefone} onChange={e => setF({...f, telefone: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={f.email} onChange={e => setF({...f, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-1">Endereço</label><input type="text" value={f.endereco} onChange={e => setF({...f, endereco: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-1">Limite Crédito</label><input type="number" step="0.01" value={f.limite_credito} onChange={e => setF({...f, limite_credito: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-1">Observações</label><textarea value={f.observacoes} onChange={e => setF({...f, observacoes: e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows={3} /></div>
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