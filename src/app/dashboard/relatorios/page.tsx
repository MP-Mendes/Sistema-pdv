'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { apiFetch } from '@/lib/http';
import { formatCurrency } from '@/lib/utils';
import { BarChart3, Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReportRow { nome: string; total: number }
interface ReportData {
  summary: { faturamento: number; vendas: number; ticketMedio: number };
  products: ReportRow[];
  categories: ReportRow[];
  operators: ReportRow[];
  payments: ReportRow[];
}

const today = new Date().toISOString().slice(0, 10);
const thirtyDaysAgo = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
const paymentLabels: Record<string, string> = { dinheiro: 'Dinheiro', cartao_credito: 'Cartão de crédito', cartao_debito: 'Cartão de débito', pix: 'PIX', crediario: 'Crediário', carne: 'Carnê', outro: 'Outro' };

export default function RelatoriosPage() {
  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<ReportData | null>(null);

  const load = async () => {
    try {
      setData(await apiFetch<ReportData>(`/api/reports?from=${from}&to=${to}`));
    } catch (error) { toast.error((error as Error).message); }
  };
  useEffect(() => { load(); }, []);

  const exportCsv = () => {
    if (!data) return;
    const sections = [
      ['Produtos', data.products], ['Categorias', data.categories], ['Operadores', data.operators], ['Pagamentos', data.payments],
    ];
    const lines = sections.flatMap(([title, rows]) => [[String(title), 'Total'], ...(rows as ReportRow[]).map((row) => [row.nome, row.total.toFixed(2)]), ['', '']]);
    const csv = lines.map((row) => row.map((cell) => `"${cell}"`).join(';')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `relatorio-${from}-${to}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const table = (title: string, rows: ReportRow[], mapName?: (name: string) => string) => <section className="bg-white border border-slate-200 rounded-xl overflow-hidden"><div className="p-4 border-b"><h2 className="font-semibold text-slate-900">{title}</h2></div><div className="max-h-80 overflow-y-auto"><table className="w-full"><thead className="bg-slate-50 sticky top-0"><tr><th className="text-left px-4 py-3 text-sm">Descrição</th><th className="text-right px-4 py-3 text-sm">Total</th></tr></thead><tbody className="divide-y">{rows.length ? rows.map((row) => <tr key={row.nome}><td className="px-4 py-3 text-sm">{mapName ? mapName(row.nome) : row.nome}</td><td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(row.total)}</td></tr>) : <tr><td colSpan={2} className="p-8 text-center text-sm text-slate-500">Sem dados no período.</td></tr>}</tbody></table></div></section>;

  return <div><Header title="Relatórios" subtitle="Desempenho por período" /><div className="p-6 space-y-6"><div className="flex flex-wrap items-end gap-4"><div><label className="block text-sm text-slate-600 mb-1">Início</label><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="px-3 py-2 border rounded-lg" /></div><div><label className="block text-sm text-slate-600 mb-1">Fim</label><input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="px-3 py-2 border rounded-lg" /></div><button onClick={load} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Atualizar</button><button onClick={exportCsv} disabled={!data} className="px-4 py-2 border rounded-lg flex items-center gap-2 disabled:opacity-50"><Download className="w-4 h-4" /> Exportar CSV</button></div>{data ? <><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="bg-white border rounded-xl p-5"><p className="text-sm text-slate-500">Faturamento</p><p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(data.summary.faturamento)}</p></div><div className="bg-white border rounded-xl p-5"><p className="text-sm text-slate-500">Vendas</p><p className="text-2xl font-bold mt-1">{data.summary.vendas}</p></div><div className="bg-white border rounded-xl p-5"><p className="text-sm text-slate-500">Ticket médio</p><p className="text-2xl font-bold text-blue-700 mt-1">{formatCurrency(data.summary.ticketMedio)}</p></div></div><div className="grid grid-cols-1 xl:grid-cols-2 gap-6">{table('Produtos', data.products)}{table('Categorias', data.categories)}{table('Operadores', data.operators)}{table('Formas de pagamento', data.payments, (name) => paymentLabels[name] || name)}</div></> : <div className="py-20 text-center text-slate-500"><BarChart3 className="w-12 h-12 mx-auto mb-3" />Carregando relatório...</div>}</div></div>;
}
