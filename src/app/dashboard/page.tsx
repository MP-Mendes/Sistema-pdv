import { getSession } from '@/lib/auth';
import supabase from '@/lib/supabase';
import Header from '@/components/Header';
import DashboardContent from './DashboardContent';
import { getStartOfDay, getEndOfDay, getStartOfWeek } from '@/lib/utils';
import type { Venda, Produto, Cliente, Crediario } from '@/lib/types';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const empresaId = session.empresa.id;
  const startOfDay = getStartOfDay();
  const endOfDay = getEndOfDay();
  const startOfWeek = getStartOfWeek();

  // Vendas do dia
  const { data: vendasHoje } = await supabase
    .from('vendas')
    .select('total')
    .eq('empresa_id', empresaId)
    .eq('status', 'finalizada')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay);

  const totalVendasHoje = vendasHoje?.reduce((sum, v) => sum + Number(v.total), 0) || 0;

  // Total de produtos
  const { count: totalProdutos } = await supabase
    .from('produtos')
    .select('*', { count: 'exact', head: true })
    .eq('empresa_id', empresaId)
    .eq('ativo', true);

  // Total de clientes
  const { count: totalClientes } = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true })
    .eq('empresa_id', empresaId)
    .eq('ativo', true);

  // Crediário pendente
  const { data: crediarios } = await supabase
    .from('crediarios')
    .select('valor_pendente')
    .eq('empresa_id', empresaId)
    .in('status', ['aberto', 'parcial']);

  const crediarioPendente = crediarios?.reduce((sum, c) => sum + Number(c.valor_pendente), 0) || 0;

  // Últimas vendas
  const { data: ultimasVendas } = await supabase
    .from('vendas')
    .select(`
      *,
      cliente:clientes(nome),
      itens:itens_venda(*)
    `)
    .eq('empresa_id', empresaId)
    .eq('status', 'finalizada')
    .order('created_at', { ascending: false })
    .limit(10);

  // Vendas da semana
  const { data: vendasSemana } = await supabase
    .from('vendas')
    .select('total, created_at')
    .eq('empresa_id', empresaId)
    .eq('status', 'finalizada')
    .gte('created_at', startOfWeek)
    .lte('created_at', endOfDay);

  // Processar vendas da semana por dia
  const diasSemana: Record<string, number> = {
    'Dom': 0, 'Seg': 0, 'Ter': 0, 'Qua': 0, 'Qui': 0, 'Sex': 0, 'Sáb': 0,
  };

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  vendasSemana?.forEach((venda) => {
    const day = dayNames[new Date(venda.created_at).getDay()];
    diasSemana[day] += Number(venda.total);
  });

  const vendasSemanaData = Object.entries(diasSemana).map(([dia, total]) => ({
    dia,
    total,
  }));

  return (
    <div>
      <Header title="Dashboard" subtitle="Visão geral do seu negócio" />
      <div className="p-6">
        <DashboardContent
          vendasHoje={totalVendasHoje}
          totalProdutos={totalProdutos || 0}
          totalClientes={totalClientes || 0}
          crediarioPendente={crediarioPendente}
          ultimasVendas={ultimasVendas || []}
          vendasSemana={vendasSemanaData}
        />
      </div>
    </div>
  );
}