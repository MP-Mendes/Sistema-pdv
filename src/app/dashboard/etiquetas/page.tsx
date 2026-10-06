'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/Header';
import supabase from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import type { Produto } from '@/lib/types';
import { Tag, Search, Printer, Package } from 'lucide-react';
import Barcode from 'react-barcode';
import toast from 'react-hot-toast';
import {
  DEFAULT_LABEL_PRINT_CONFIG,
  printThermalElement,
  type LabelPaperSize,
  type LabelPrintConfig,
} from '@/lib/thermalPrint';

export default function EtiquetasPage() {
  const { session } = useAuthStore();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [size, setSize] = useState<LabelPaperSize>('88mm');
  const [printConfig, setPrintConfig] = useState<LabelPrintConfig>(DEFAULT_LABEL_PRINT_CONFIG);
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { load(); }, [session]);
  const load = async () => {
    if (!session) return;
    const [{ data: productData }, { data: customizationData }] = await Promise.all([
      supabase.from('produtos').select('*').eq('empresa_id', session.empresa.id).eq('ativo', true).order('nome'),
      supabase.from('customizacoes').select('configuracao').eq('empresa_id', session.empresa.id).eq('tipo', 'etiqueta').maybeSingle(),
    ]);

    if (productData) setProdutos(productData);
    if (customizationData?.configuracao) {
      setPrintConfig({ ...DEFAULT_LABEL_PRINT_CONFIG, ...customizationData.configuracao });
    }
  };

  const filtered = produtos.filter(p => p.nome.toLowerCase().includes(search.toLowerCase()) || p.codigo.toLowerCase().includes(search.toLowerCase()));
  const toggle = (id: string) => { const s = new Set(selected); if (s.has(id)) s.delete(id); else s.add(id); setSelected(s); };
  const selectAll = () => { if (selected.size === filtered.length) setSelected(new Set()); else setSelected(new Set(filtered.map(p => p.id))); };
  const selectedProdutos = produtos.filter(p => selected.has(p.id));

  const handlePrint = async () => {
    const printContent = printRef.current;
    if (!printContent) return;
    setIsPrinting(true);

    try {
      await printThermalElement(printContent, {
        title: `Etiquetas ${size}`,
        widthMm: Number.parseInt(size, 10),
      });
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível abrir a impressão. Tente novamente.');
    } finally {
      setIsPrinting(false);
    }
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
                <button type="button" aria-pressed={size === '52mm'} onClick={() => setSize('52mm')} className={`px-3 py-2 rounded-lg text-sm font-medium ${size === '52mm' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>52mm</button>
                <button type="button" aria-pressed={size === '88mm'} onClick={() => setSize('88mm')} className={`px-3 py-2 rounded-lg text-sm font-medium ${size === '88mm' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>88mm</button>
              </div>
            </div>
            <div className="flex justify-between">
              <button onClick={selectAll} className="text-sm text-blue-600 hover:underline">{selected.size === filtered.length ? 'Desmarcar todos' : 'Selecionar todos'}</button>
              <span className="text-sm text-slate-500">{selected.size} selecionados</span>
            </div>
            <div className="bg-white rounded-xl border max-h-[60vh] overflow-y-auto">
              {filtered.length === 0 ? <p className="p-8 text-center text-slate-400"><Package className="w-12 h-12 mx-auto mb-2 opacity-50" />Nenhum produto</p>
              : filtered.map(p => (
                <button key={p.id} onClick={() => toggle(p.id)} className={`w-full flex items-center justify-between p-4 border-b last:border-0 text-left ${selected.has(p.id) ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' : 'hover:bg-slate-50'}`}>
                  <div><p className="font-medium">{p.nome}</p><p className="text-sm text-slate-500">Cód: {p.codigo}</p></div>
                  <p className="font-bold text-green-600">{formatCurrency(p.preco)}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between">
              <h3 className="font-semibold">Pré-visualização</h3>
              <button onClick={handlePrint} disabled={selectedProdutos.length === 0 || isPrinting} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"><Printer className="w-5 h-5" /> {isPrinting ? 'Preparando...' : 'Imprimir'}</button>
            </div>
            <div className="bg-white rounded-xl border p-4">
              {selectedProdutos.length === 0 ? (
                <p className="text-center text-slate-400 py-12"><Tag className="w-12 h-12 mx-auto mb-2 opacity-50" />Selecione produtos</p>
              ) : (
                <div ref={printRef} className={`thermal-label-sheet grid gap-2 ${size === '88mm' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {selectedProdutos.map(p => (
                    <div key={p.id} className={`label label-${size} label-font-${printConfig.fonte_tamanho}`}>
                      <div className="product-name">{p.nome}</div>
                      {printConfig.mostrar_codigo && p.codigo && <div className="product-code">Cód: {p.codigo}</div>}
                      <div className="product-price" style={{ color: printConfig.cor_primaria }}>{formatCurrency(p.preco)}</div>
                      {printConfig.mostrar_preco_custo && p.preco_custo != null && (
                        <div className="product-cost">Custo: {formatCurrency(p.preco_custo)}</div>
                      )}
                      {printConfig.mostrar_codigo_barras && p.codigo && (
                        <div className="barcode">
                          <Barcode value={p.codigo} width={size === '88mm' ? 1.5 : 1} height={30} fontSize={10} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500">No diálogo de impressão, use o mesmo tamanho de papel, escala 100% e margens “Nenhuma”.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
