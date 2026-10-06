'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { useAuthStore } from '@/store/authStore';
import { apiFetch } from '@/lib/http';
import { UserCog, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface TeamUser {
  id: string;
  nome: string;
  email: string;
  role: 'admin' | 'gerente' | 'operador';
  ativo: boolean;
}

const emptyForm = { nome: '', email: '', senha: '', role: 'operador' as TeamUser['role'] };

export default function EquipePage() {
  const session = useAuthStore((state) => state.session);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { users } = await apiFetch<{ users: TeamUser[] }>('/api/team');
      setUsers(users);
    } catch (error) { toast.error((error as Error).message); }
  };
  useEffect(() => { if (session?.usuario.role === 'admin') load(); }, [session]);

  const createUser = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/team', { method: 'POST', body: JSON.stringify(form) });
      toast.success('Usuário criado!');
      setShow(false);
      setForm(emptyForm);
      load();
    } catch (error) { toast.error((error as Error).message); }
    finally { setSaving(false); }
  };

  const toggleUser = async (user: TeamUser) => {
    try {
      await apiFetch('/api/team', { method: 'PATCH', body: JSON.stringify({ id: user.id, ativo: !user.ativo }) });
      toast.success(user.ativo ? 'Usuário desativado' : 'Usuário ativado');
      load();
    } catch (error) { toast.error((error as Error).message); }
  };

  if (session?.usuario.role !== 'admin') return null;

  return <div><Header title="Equipe" subtitle="Usuários e permissões da empresa" /><div className="p-6"><div className="flex justify-end mb-6"><button onClick={() => setShow(true)} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl flex items-center gap-2"><UserPlus className="w-5 h-5" /> Novo usuário</button></div><div className="bg-white border border-slate-200 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50 border-b"><tr><th className="text-left px-4 py-3 text-sm">Nome</th><th className="text-left px-4 py-3 text-sm">Email</th><th className="text-left px-4 py-3 text-sm">Função</th><th className="text-center px-4 py-3 text-sm">Status</th><th className="text-center px-4 py-3 text-sm">Ação</th></tr></thead><tbody className="divide-y">{users.map((user) => <tr key={user.id}><td className="px-4 py-3 text-sm font-medium">{user.nome}</td><td className="px-4 py-3 text-sm text-slate-600">{user.email}</td><td className="px-4 py-3 text-sm capitalize">{user.role}</td><td className="px-4 py-3 text-center text-sm">{user.ativo ? 'Ativo' : 'Inativo'}</td><td className="px-4 py-3 text-center"><button disabled={user.id === session.usuario.id} onClick={() => toggleUser(user)} className={`px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 ${user.ativo ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{user.ativo ? 'Desativar' : 'Ativar'}</button></td></tr>)}</tbody></table></div>{users.length === 0 && <div className="py-12 text-center text-slate-500"><UserCog className="w-10 h-10 mx-auto mb-2" />Nenhum usuário encontrado.</div>}</div></div>{show && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl w-full max-w-md"><div className="p-4 border-b flex items-center justify-between"><h2 className="font-semibold">Novo usuário</h2><button aria-label="Fechar" onClick={() => setShow(false)}><X className="w-5 h-5" /></button></div><div className="p-4 space-y-4"><div><label className="block text-sm font-medium mb-1">Nome</label><input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div><div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div><div><label className="block text-sm font-medium mb-1">Senha inicial</label><input type="password" value={form.senha} onChange={(event) => setForm({ ...form, senha: event.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Mínimo 8 caracteres" /></div><div><label className="block text-sm font-medium mb-1">Função</label><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as TeamUser['role'] })} className="w-full px-3 py-2 border rounded-lg"><option value="operador">Operador</option><option value="gerente">Gerente</option><option value="admin">Administrador</option></select></div></div><div className="p-4 border-t flex justify-end gap-2"><button onClick={() => setShow(false)} className="px-4 py-2 border rounded-lg">Cancelar</button><button disabled={saving} onClick={createUser} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{saving ? 'Criando...' : 'Criar usuário'}</button></div></div></div>}</div>;
}
