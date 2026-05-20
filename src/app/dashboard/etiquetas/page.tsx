'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/Header';
import supabase from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import type { Produto } from '@/lib/types';
import { Tag, Search, Printer, Package } from 'lucide-react';
import Barcode from 'react-barcode';

export default function EtiquetasPage() {
  const { session } = useAuthStore();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [size, setSize] = useState<'88mm' | '52mm'>('88mm');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { load(); }, []);
  const load = async () => {
    if (!session) return;
    const { data } = await supabase.from('produtos').select('*').eq('empresa_id', session.empresa.id).eq('ativo', true).order('nome');
    if (data) setProdutos(data);
  };

  const filtered = produtos.filter(p => p.nome.toLowerCase().includes(search.toLowerCase()) || p.codigo.toLowerCase().includes(search.toLowerCase()));
  const toggle = (id: string) => { const s = new Set(selected); if (s.has(id)) s.delete(id); else s.add(id); setSelected(s); };
  const selectAll = () => { if (selected.size === filtered.length) setSelected(new Set()); else setSelected(new Set(filtered.map(p => p.id))); };
  const selectedProdutos = produtos.filter(p => selected.has(p.id));

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    printWindow.document.write('<!DOCTYPE html><html><head><title>Etiquetas</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:5mm}.label{border:1px dashed #ccc;padding:3mm;margin-bottom:2mm;page-break-inside:avoid}.label-88mm{width:88mm}.label-52mm{width:52mm}.product-name{font-weight:bold;font-size:12px;margin-bottom:2mm}.product-price{font-size:18px;font-weight:bold;color:#16a34a;margin-bottom:2mm}.barcode{text-align:center;margin-top:2mm}@media print{body{padding:0}.label{border:none}}</style></head><body>' + printContent.innerHTML + '</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  return (
    <div>
      <Header title="Etiquetas" subtitle="Impressão de etiquetas de preço" />
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl" placeholder="Buscar produto..." />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSize('52mm')} className={`px-3 py-2 rounded-lg text-sm font-medium ${size === '52mm' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>52mm</button>
                <button onClick={() => setSize('88mm')} className={`px-3 py-2 rounded-lg text-sm font-medium ${size === '88mm' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>88mm</button>
              </div>
            </div>
            <div className="flex justify-between">
              <button onClick={selectAll} className="text-sm text-blue-600 hover:underline">{selected.size === filtered.length ? 'Desmarcar todos' : 'Selecionar todos'}</button>
              <span className="text-sm text-slate-500">{selected.size} selecionados</span>
            </div>
            <div className="bg-white rounded-xl border max-h-[60vh] overflow-y-auto">
              {filtered.length === 0 ? <p className="p-8 text-center text-slate-400"><Package className="w-12 h-12 mx-auto mb-2 opacity-50" />Nenhum produto</p>
              : filtered.map(p => (
                <button key={p.id} onClick={() => toggle(p.id)} className={`w-full flex items-center justify-between p-4 border-b last:border-0 text-left ${selected.has(p.id) ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-slate-50'}`}>
                  <div><p className="font-medium">{p.nome}</p><p className="text-sm text-slate-500">Cód: {p.codigo}</p></div>
                  <p className="font-bold text-green-600">{formatCurrency(p.preco)}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between">
              <h3 className="font-semibold">Pré-visualização</h3>
              <button onClick={handlePrint} disabled={selectedProdutos.length === 0} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl disabled:opacity-50"><Printer className="w-5 h-5" /> Imprimir</button>
            </div>
            <div className="bg-white rounded-xl border p-4">
              {selectedProdutos.length === 0 ? (
                <p className="text-center text-slate-400 py-12"><Tag className="w-12 h-12 mx-auto mb-2 opacity-50" />Selecione produtos</p>
              ) : (
                <div ref={printRef} className={`grid gap-2 ${size === '88mm' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {selectedProdutos.map(p => (
                    <div key={p.id} className={`label label-${size}`}>
                      <div className="product-name">{p.nome}</div>
                      <div className="product-price">{formatCurrency(p.preco)}</div>
                      {p.codigo && (
                        <div className="barcode">
                          <Barcode value={p.codigo} width={size === '88mm' ? 1.5 : 1} height={30} fontSize={10} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}