'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { apiFetch } from '@/lib/http';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Banknote, ArrowDownToLine, ArrowUpFromLine, LockKeyhole, UnlockKeyhole } from 'lucide-react';
import toast from 'react-hot-toast';

interface CashMovement {
  id: string;
  tipo: 'venda' | 'suprimento' | 'sangria' | 'estorno';
  valor: number;
  observacoes: string | null;
  created_at: string;
}

interface CashRegister {
  id: string;
  valor_abertura: number;
  valor_calculado?: number;
  valor_fechamento_informado: number | null;
  valor_fechamento_calculado: number | null;
  status: 'aberto' | 'fechado';
  opened_at: string;
  closed_at: string | null;
  movimentacoes?: CashMovement[];
}

export default function CaixaPage() {
  const [current, setCurrent] = useState<CashRegister | null>(null);
  const [history, setHistory] = useState<CashRegister[]>([]);
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const data = await apiFetch<{ current: CashRegister | null; history: CashRegister[] }>('/api/cash');
      setCurrent(data.current);
      setHistory(data.history);
    } catch (error) { toast.error((error as Error).message); }
  };

  useEffect(() => { load(); }, []);

  const submit = async (action: 'open' | 'close' | 'movement', tipo?: 'suprimento' | 'sangria') => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0) return toast.error('Informe um valor válido.');
    if (action === 'movement' && !notes.trim()) return toast.error('Informe o motivo da movimentação.');
    setLoading(true);
    try {
      await apiFetch('/api/cash', {
        method: 'POST',
        body: JSON.stringify({ action, tipo, valor: numericValue, observacoes: notes }),
      });
      toast.success(action === 'open' ? 'Caixa aberto!' : action === 'close' ? 'Caixa fechado!' : tipo === 'sangria' ? 'Sangria registrada!' : 'Suprimento registrado!');
      setValue('');
      setNotes('');
      load();
    } catch (error) { toast.error((error as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <Header title="Caixa" subtitle="Abertura, movimentações e fechamento" />
      <div className="p-6 space-y-6">
        {!current ? (
          <section className="bg-white border border-slate-200 rounded-xl p-6 max-w-xl">
            <div className="flex items-center gap-3 mb-5"><UnlockKeyhole className="w-6 h-6 text-blue-600" /><div><h2 className="font-semibold text-slate-900">Abrir caixa</h2><p className="text-sm text-slate-500">Informe o dinheiro disponível no início do turno.</p></div></div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Valor inicial</label>
            <input type="number" min="0" step="0.01" value={value} onChange={(event) => setValue(event.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-3" placeholder="0,00" />
            <label className="block text-sm font-medium text-slate-700 mb-1">Observação</label>
            <input value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-4" placeholder="Opcional" />
            <button disabled={loading} onClick={() => submit('open')} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50">{loading ? 'Abrindo...' : 'Abrir caixa'}</button>
          </section>
        ) : (
          <>
            <section className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><div className="flex items-center gap-2"><Banknote className="w-6 h-6 text-green-600" /><h2 className="font-semibold text-slate-900">Caixa aberto</h2></div><p className="text-sm text-slate-500 mt-1">Desde {formatDateTime(current.opened_at)}</p></div>
                <div className="text-right"><p className="text-sm text-slate-500">Saldo calculado</p><p className="text-2xl font-bold text-green-700">{formatCurrency(Number(current.valor_calculado || 0))}</p></div>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-6">
              <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h2 className="font-semibold text-slate-900">Movimentar caixa</h2>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Valor</label><input type="number" min="0" step="0.01" value={value} onChange={(event) => setValue(event.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="0,00" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Motivo</label><input value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Obrigatório para sangria ou suprimento" /></div>
                <div className="grid grid-cols-2 gap-3"><button disabled={loading} onClick={() => submit('movement', 'suprimento')} className="py-2.5 bg-green-600 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"><ArrowDownToLine className="w-4 h-4" /> Suprimento</button><button disabled={loading} onClick={() => submit('movement', 'sangria')} className="py-2.5 bg-orange-600 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"><ArrowUpFromLine className="w-4 h-4" /> Sangria</button></div>
                <div className="pt-4 border-t"><p className="text-sm text-slate-600 mb-2">Para fechar, informe o dinheiro contado no caixa.</p><button disabled={loading} onClick={() => submit('close')} className="w-full py-2.5 bg-slate-900 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"><LockKeyhole className="w-4 h-4" /> Fechar caixa</button></div>
              </section>

              <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-4 border-b"><h2 className="font-semibold text-slate-900">Movimentações do turno</h2></div>
                <div className="divide-y max-h-[28rem] overflow-y-auto">
                  {!current.movimentacoes?.length ? <p className="p-8 text-center text-sm text-slate-500">Nenhuma movimentação registrada.</p> : current.movimentacoes.map((movement) => <div key={movement.id} className="p-4 flex items-center justify-between gap-4"><div><p className="text-sm font-medium capitalize">{movement.tipo}</p><p className="text-xs text-slate-500">{movement.observacoes || formatDateTime(movement.created_at)}</p></div><span className={`font-semibold ${movement.tipo === 'venda' || movement.tipo === 'suprimento' ? 'text-green-700' : 'text-red-700'}`}>{movement.tipo === 'venda' || movement.tipo === 'suprimento' ? '+' : '-'}{formatCurrency(Number(movement.valor))}</span></div>)}
                </div>
              </section>
            </div>
          </>
        )}

        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b"><h2 className="font-semibold text-slate-900">Últimos turnos</h2></div>
          <div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50"><tr><th className="text-left px-4 py-3 text-sm">Abertura</th><th className="text-left px-4 py-3 text-sm">Fechamento</th><th className="text-right px-4 py-3 text-sm">Calculado</th><th className="text-right px-4 py-3 text-sm">Informado</th><th className="text-center px-4 py-3 text-sm">Status</th></tr></thead><tbody className="divide-y">{history.map((cash) => <tr key={cash.id}><td className="px-4 py-3 text-sm">{formatDateTime(cash.opened_at)}</td><td className="px-4 py-3 text-sm">{cash.closed_at ? formatDateTime(cash.closed_at) : '—'}</td><td className="px-4 py-3 text-sm text-right">{cash.valor_fechamento_calculado == null ? '—' : formatCurrency(Number(cash.valor_fechamento_calculado))}</td><td className="px-4 py-3 text-sm text-right">{cash.valor_fechamento_informado == null ? '—' : formatCurrency(Number(cash.valor_fechamento_informado))}</td><td className="px-4 py-3 text-center text-sm capitalize">{cash.status}</td></tr>)}</tbody></table></div>
        </section>
      </div>
    </div>
  );
}
