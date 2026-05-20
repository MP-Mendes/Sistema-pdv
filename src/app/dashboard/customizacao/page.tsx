'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/Header';
import supabase from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { Settings, Save, Printer, Tag, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import Barcode from 'react-barcode';

interface CustomConfig {
  etiqueta: {
    mostrar_codigo: boolean;
    mostrar_codigo_barras: boolean;
    mostrar_preco_custo: boolean;
    fonte_tamanho: 'pequeno' | 'medio' | 'grande';
    cor_primaria: string;
  };
  comprovante: {
    mostrar_logo: boolean;
    mostrar_cnpj: boolean;
    mostrar_endereco: boolean;
    mensagem_rodape: string;
    mostrar_codigo_barras: boolean;
  };
}

const defaultConfig: CustomConfig = {
  etiqueta: {
    mostrar_codigo: true,
    mostrar_codigo_barras: true,
    mostrar_preco_custo: false,
    fonte_tamanho: 'medio',
    cor_primaria: '#16a34a',
  },
  comprovante: {
    mostrar_logo: false,
    mostrar_cnpj: true,
    mostrar_endereco: true,
    mensagem_rodape: 'Obrigado pela preferência!',
    mostrar_codigo_barras: false,
  },
};

export default function CustomizacaoPage() {
  const { session } = useAuthStore();
  const [config, setConfig] = useState<CustomConfig>(defaultConfig);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'etiqueta' | 'comprovante'>('etiqueta');

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    if (!session) return;
    const { data } = await supabase.from('customizacoes')
      .select('*').eq('empresa_id', session.empresa.id);
    if (data && data.length > 0) {
      const etiquetaConfig = data.find(d => d.tipo === 'etiqueta');
      const comprovanteConfig = data.find(d => d.tipo === 'comprovante');
      setConfig({
        etiqueta: { ...defaultConfig.etiqueta, ...(etiquetaConfig?.configuracao || {}) },
        comprovante: { ...defaultConfig.comprovante, ...(comprovanteConfig?.configuracao || {}) },
      });
    }
  };

  const handleSave = async () => {
    if (!session) return;
    setLoading(true);
    try {
      // Upsert etiqueta config
      await supabase.from('customizacoes').upsert({
        empresa_id: session.empresa.id, tipo: 'etiqueta', configuracao: config.etiqueta,
      }, { onConflict: 'empresa_id,tipo' });

      // Upsert comprovante config
      await supabase.from('customizacoes').upsert({
        empresa_id: session.empresa.id, tipo: 'comprovante', configuracao: config.comprovante,
      }, { onConflict: 'empresa_id,tipo' });

      toast.success('Configurações salvas!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const updateEtiquetaConfig = (key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      etiqueta: { ...prev.etiqueta, [key]: value },
    }));
  };

  const updateComprovanteConfig = (key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      comprovante: { ...prev.comprovante, [key]: value },
    }));
  };

  return (
    <div>
      <Header title="Customização" subtitle="Personalize etiquetas e comprovantes" />
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Settings */}
          <div className="space-y-4">
            <div className="flex gap-2 mb-4">
              <button onClick={() => setActiveTab('etiqueta')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'etiqueta' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>
                <Tag className="w-4 h-4" /> Etiquetas
              </button>
              <button onClick={() => setActiveTab('comprovante')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'comprovante' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>
                <Receipt className="w-4 h-4" /> Comprovante
              </button>
            </div>

            {activeTab === 'etiqueta' && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h3 className="font-semibold text-slate-900">Configurações da Etiqueta</h3>

                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={config.etiqueta.mostrar_codigo}
                    onChange={(e) => updateEtiquetaConfig('mostrar_codigo', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                  <span className="text-sm">Mostrar código do produto</span>
                </label>

                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={config.etiqueta.mostrar_codigo_barras}
                    onChange={(e) => updateEtiquetaConfig('mostrar_codigo_barras', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                  <span className="text-sm">Mostrar código de barras</span>
                </label>

                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={config.etiqueta.mostrar_preco_custo}
                    onChange={(e) => updateEtiquetaConfig('mostrar_preco_custo', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                  <span className="text-sm">Mostrar preço de custo</span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tamanho da Fonte</label>
                  <select value={config.etiqueta.fonte_tamanho}
                    onChange={(e) => updateEtiquetaConfig('fonte_tamanho', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                    <option value="pequeno">Pequeno</option>
                    <option value="medio">Médio</option>
                    <option value="grande">Grande</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cor do Preço</label>
                  <input type="color" value={config.etiqueta.cor_primaria}
                    onChange={(e) => updateEtiquetaConfig('cor_primaria', e.target.value)}
                    className="w-12 h-10 rounded-lg border border-slate-300 cursor-pointer" />
                </div>
              </div>
            )}

            {activeTab === 'comprovante' && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h3 className="font-semibold text-slate-900">Configurações do Comprovante</h3>

                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={config.comprovante.mostrar_cnpj}
                    onChange={(e) => updateComprovanteConfig('mostrar_cnpj', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                  <span className="text-sm">Mostrar CNPJ</span>
                </label>

                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={config.comprovante.mostrar_endereco}
                    onChange={(e) => updateComprovanteConfig('mostrar_endereco', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                  <span className="text-sm">Mostrar endereço</span>
                </label>

                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={config.comprovante.mostrar_codigo_barras}
                    onChange={(e) => updateComprovanteConfig('mostrar_codigo_barras', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                  <span className="text-sm">Mostrar código de barras da venda</span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mensagem do Rodapé</label>
                  <input type="text" value={config.comprovante.mensagem_rodape}
                    onChange={(e) => updateComprovanteConfig('mensagem_rodape', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="Obrigado pela preferência!" />
                </div>
              </div>
            )}

            <button onClick={handleSave} disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              <Save className="w-5 h-5" /> {loading ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Pré-visualização</h3>

            {activeTab === 'etiqueta' && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <p className="text-xs text-slate-400 mb-3 text-center">Etiqueta de exemplo</p>
                <div className="label-88mm bg-white border border-dashed border-slate-300">
                  <p className={`font-bold text-slate-900 ${
                    config.etiqueta.fonte_tamanho === 'pequeno' ? 'text-xs' :
                    config.etiqueta.fonte_tamanho === 'grande' ? 'text-base' : 'text-sm'
                  }`}>
                    Produto Exemplo
                  </p>
                  {config.etiqueta.mostrar_codigo && (
                    <p className="text-xs text-slate-500">COD: EX001</p>
                  )}
                  <p className={`font-bold mt-1 ${
                    config.etiqueta.fonte_tamanho === 'pequeno' ? 'text-lg' :
                    config.etiqueta.fonte_tamanho === 'grande' ? 'text-2xl' : 'text-xl'
                  }`} style={{ color: config.etiqueta.cor_primaria }}>
                    {formatCurrency(29.90)}
                  </p>
                  {config.etiqueta.mostrar_codigo_barras && (
                    <div className="mt-1 flex justify-center">
                      <Barcode value="EX001" width={1.5} height={30} fontSize={10} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'comprovante' && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <p className="text-xs text-slate-400 mb-3 text-center">Comprovante de exemplo</p>
                <div className="receipt-container border border-dashed border-slate-300 p-4 text-xs font-mono">
                  <div className="text-center mb-2">
                    <p className="font-bold">{session?.empresa?.nome || 'Empresa'}</p>
                    {config.comprovante.mostrar_cnpj && <p>CNPJ: 00.000.000/0001-00</p>}
                    {config.comprovante.mostrar_endereco && <p>Rua Exemplo, 123</p>}
                    <p>COMPROVANTE NÃO FISCAL</p>
                  </div>
                  <div className="border-t border-dashed border-slate-300 pt-2">
                    <p>Venda #000001</p>
                    <p>Data: {new Date().toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="border-t border-dashed border-slate-300 mt-2 pt-2">
                    <div className="flex justify-between"><span>2x Produto Exemplo</span><span>R$ 59,80</span></div>
                  </div>
                  <div className="border-t border-dashed border-slate-300 mt-2 pt-2">
                    <div className="flex justify-between font-bold"><span>TOTAL:</span><span>R$ 59,80</span></div>
                  </div>
                  <div className="border-t border-dashed border-slate-300 mt-2 pt-2">
                    <p>Dinheiro: R$ 59,80</p>
                  </div>
                  {config.comprovante.mostrar_codigo_barras && (
                    <div className="mt-2 flex justify-center">
                      <Barcode value="000001" width={1} height={20} fontSize={8} />
                    </div>
                  )}
                  {config.comprovante.mensagem_rodape && (
                    <p className="text-center mt-2">{config.comprovante.mensagem_rodape}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}