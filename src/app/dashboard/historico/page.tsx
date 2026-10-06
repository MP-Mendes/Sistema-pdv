'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/Header';
import { apiFetch } from '@/lib/http';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { History, Eye, X, TrendingUp, DollarSign, ShoppingBag, Printer, Download, Ban, ChevronLeft, ChevronRight } from 'lucide-react';
import { printThermalElement } from '@/lib/thermalPrint';
import toast from 'react-hot-toast';

interface VendaH {
  id: string; numero_venda: number; total: number; subtotal: number; desconto: number;
  created_at: string; cliente?: { nome: string } | null;
  itens?: { id: string; produto_nome: string; quantidade: number; subtotal: number }[];
  pagamentos?: { metodo: string; valor: number }[];
  status?: string;
  cliente_nome?: string;
}

export default function HistoricoPage() {
  const { session } = useAuthStore();
  const [vendas, setVendas] = useState<VendaH[]>([]);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [selected, setSelected] = useState<VendaH | null>(null);
  const [show, setShow] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('finalizada');
  const receiptRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!session) return;
    const params = new URLSearchParams({ page: String(page), pageSize: '25', status });
    if (dataInicio) params.set('from', dataInicio);
    if (dataFim) params.set('to', dataFim);
    try {
      const result = await apiFetch<{ sales: VendaH[]; total: number }>(`/api/sales?${params}`);
      setVendas(result.sales);
      setTotal(result.total);
    } catch (error) { toast.error((error as Error).message); }
  };

  useEffect(() => { if (session) load(); }, [session, dataInicio, dataFim, page, status]);

  const cancelSale = async (sale: VendaH) => {
    const reason = window.prompt(`Motivo do cancelamento da venda #${sale.numero_venda.toString().padStart(6, '0')}:`);
    if (!reason) return;
    try {
      await apiFetch(`/api/sales/${sale.id}/cancel`, { method: 'POST', body: JSON.stringify({ motivo: reason }) });
      toast.success('Venda cancelada e estoque estornado.');
      setShow(false);
      load();
    } catch (error) { toast.error((error as Error).message); }
  };

  const printReceipt = async () => {
    if (!receiptRef.current || !selected) return;
    try {
      await printThermalElement(receiptRef.current, { title: `Venda ${selected.numero_venda}`, widthMm: 80 });
    } catch (error) { toast.error((error as Error).message); }
  };

  const exportCsv = () => {
    const rows = [['Venda', 'Data', 'Cliente', 'Status', 'Total'], ...vendas.map((sale) => [
      sale.numero_venda,
      formatDateTime(sale.created_at),
      sale.cliente?.nome || '',
      sale.status || status,
      Number(sale.total).toFixed(2),
    ])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `vendas-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const fat = vendas.reduce((s, v) => s + Number(v.total), 0);
  const count = vendas.length;
  const media = count > 0 ? fat / count : 0;

  return (
    <div>
      <Header title="Histórico" subtitle="Vendas e faturamento" />
      <div className="p-6">
        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div><label className="block text-sm text-slate-600 mb-1">Início</label><input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg" /></div>
          <div><label className="block text-sm text-slate-600 mb-1">Fim</label><input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg" /></div>
          <div><label className="block text-sm text-slate-600 mb-1">Status</label><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="px-3 py-2 border border-slate-300 rounded-lg"><option value="finalizada">Finalizadas</option><option value="cancelada">Canceladas</option></select></div>
          <button onClick={load} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Filtrar</button>
          <button onClick={exportCsv} disabled={vendas.length === 0} className="px-4 py-2 border border-slate-300 rounded-lg flex items-center gap-2 disabled:opacity-50"><Download className="w-4 h-4" /> Exportar CSV</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4"><div className="flex items-center gap-3"><div className="bg-green-100 p-2 rounded-lg"><DollarSign className="w-5 h-5 text-green-600" /></div><div><p className="text-sm text-slate-500">Faturamento nesta página</p><p className="text-xl font-bold text-green-600">{formatCurrency(fat)}</p></div></div></div>
          <div className="bg-white rounded-xl border p-4"><div className="flex items-center gap-3"><div className="bg-blue-100 p-2 rounded-lg"><ShoppingBag className="w-5 h-5 text-blue-600" /></div><div><p className="text-sm text-slate-500">Vendas nesta página</p><p className="text-xl font-bold">{count}</p></div></div></div>
          <div className="bg-white rounded-xl border p-4"><div className="flex items-center gap-3"><div className="bg-purple-100 p-2 rounded-lg"><TrendingUp className="w-5 h-5 text-purple-600" /></div><div><p className="text-sm text-slate-500">Ticket médio nesta página</p><p className="text-xl font-bold text-purple-600">{formatCurrency(media)}</p></div></div></div>
        </div>
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b"><tr><th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Nº</th><th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Data</th><th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Cliente</th><th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Itens</th><th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Total</th><th className="text-center px-4 py-3 text-sm font-medium text-slate-600"></th></tr></thead>
            <tbody className="divide-y">
              {count === 0 ? <tr><td colSpan={6} className="text-center py-12 text-slate-400"><History className="w-12 h-12 mx-auto mb-2 opacity-50" />Nenhuma venda</td></tr>
              : vendas.map(v => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-mono">#{v.numero_venda.toString().padStart(6, '0')}</td>
                  <td className="px-4 py-3 text-sm">{formatDateTime(v.created_at)}</td>
                  <td className="px-4 py-3 text-sm">{v.cliente?.nome || '-'}</td>
                  <td className="px-4 py-3 text-sm text-right">{v.itens?.length || 0}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">{formatCurrency(Number(v.total))}</td>
                  <td className="px-4 py-3 text-center"><button onClick={() => { setSelected(v); setShow(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Eye className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>{total} venda{total === 1 ? '' : 's'}</span>
          <div className="flex items-center gap-2"><button aria-label="Página anterior" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="p-2 border rounded-lg disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button><span>Página {page} de {Math.max(1, Math.ceil(total / 25))}</span><button aria-label="Próxima página" disabled={page * 25 >= total} onClick={() => setPage((value) => value + 1)} className="p-2 border rounded-lg disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button></div>
        </div>
      </div>
      {show && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b"><h2 className="text-lg font-semibold">Venda #{selected.numero_venda?.toString().padStart(6, '0')}</h2><button onClick={() => setShow(false)}><X className="w-5 h-5" /></button></div>
            <div ref={receiptRef} className="thermal-receipt p-4 space-y-3 text-sm">
              <div className="text-center"><p className="font-bold">{session?.empresa.nome}</p><p className="text-xs">COMPROVANTE NÃO FISCAL</p></div>
              <p><strong>Data:</strong> {formatDateTime(selected.created_at)}</p>
              <p><strong>Cliente:</strong> {selected.cliente?.nome || '-'}</p>
              <div className="border-t pt-3"><p className="font-medium mb-2">Itens:</p>{selected.itens?.map((item, i) => <div key={i} className="flex justify-between py-1"><span>{item.quantidade}x {item.produto_nome}</span><span>{formatCurrency(item.subtotal)}</span></div>)}</div>
              <div className="border-t pt-3"><p className="font-medium mb-2">Pagamentos:</p>{selected.pagamentos?.map((p, i) => <div key={i} className="flex justify-between py-1"><span className="capitalize">{p.metodo.replace('_', ' ')}:</span><span>{formatCurrency(p.valor)}</span></div>)}</div>
              <div className="border-t pt-3 flex justify-between font-bold text-lg"><span>Total:</span><span className="text-green-600">{formatCurrency(selected.total)}</span></div>
            </div>
            <div className="p-4 border-t flex flex-wrap justify-end gap-2">
              {status === 'finalizada' && (session?.usuario.role === 'admin' || session?.usuario.role === 'gerente') && <button onClick={() => cancelSale(selected)} className="px-4 py-2 text-red-700 bg-red-50 rounded-lg flex items-center gap-2"><Ban className="w-4 h-4" /> Cancelar venda</button>}
              <button onClick={printReceipt} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"><Printer className="w-4 h-4" /> Reimprimir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
