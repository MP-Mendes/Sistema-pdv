'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { apiFetch } from '@/lib/http';
import { formatDateTime } from '@/lib/utils';
import { ScrollText } from 'lucide-react';
import toast from 'react-hot-toast';

interface AuditEvent { id: string; acao: string; entidade: string; dados: Record<string, unknown>; created_at: string; usuario: { nome: string } | null }

export default function AuditoriaPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  useEffect(() => { apiFetch<{ events: AuditEvent[] }>('/api/audit').then((data) => setEvents(data.events)).catch((error) => toast.error(error.message)); }, []);
  return <div><Header title="Auditoria" subtitle="Registro das operações sensíveis" /><div className="p-6"><div className="bg-white border rounded-xl overflow-hidden"><div className="overflow-x-auto max-h-[70vh]"><table className="w-full"><thead className="bg-slate-50 sticky top-0"><tr><th className="text-left px-4 py-3 text-sm">Data</th><th className="text-left px-4 py-3 text-sm">Usuário</th><th className="text-left px-4 py-3 text-sm">Ação</th><th className="text-left px-4 py-3 text-sm">Entidade</th><th className="text-left px-4 py-3 text-sm">Detalhes</th></tr></thead><tbody className="divide-y">{events.map((event) => <tr key={event.id}><td className="px-4 py-3 text-sm whitespace-nowrap">{formatDateTime(event.created_at)}</td><td className="px-4 py-3 text-sm">{event.usuario?.nome || 'Sistema'}</td><td className="px-4 py-3 text-sm">{event.acao.replaceAll('_', ' ')}</td><td className="px-4 py-3 text-sm">{event.entidade}</td><td className="px-4 py-3 text-xs text-slate-600 max-w-md break-words">{JSON.stringify(event.dados)}</td></tr>)}</tbody></table>{events.length === 0 && <div className="py-16 text-center text-slate-500"><ScrollText className="w-12 h-12 mx-auto mb-3" />Nenhum evento registrado.</div>}</div></div></div></div>;
}
