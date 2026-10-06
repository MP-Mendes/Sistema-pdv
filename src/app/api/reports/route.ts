import { NextResponse } from 'next/server';
import { apiErrorResponse, requireApiSession } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const add = (map: Map<string, number>, key: string, value: number) => map.set(key, (map.get(key) || 0) + value);
const toRows = (map: Map<string, number>) => Array.from(map, ([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total);

interface ReportItem {
  produto_nome: string;
  subtotal: number | string;
  produto: { categoria: string | null } | null;
}

export async function GET(request: Request) {
  try {
    const session = await requireApiSession(['admin', 'gerente']);
    const params = new URL(request.url).searchParams;
    const end = params.get('to') ? new Date(`${params.get('to')}T23:59:59.999`) : new Date();
    const start = params.get('from') ? new Date(`${params.get('from')}T00:00:00`) : new Date(end.getTime() - 29 * 86400000);
    const supabase = getSupabaseAdmin();
    const { data: sales, error } = await supabase.from('vendas')
      .select('id, total, usuario_id, created_at')
      .eq('empresa_id', session.empresa.id).eq('status', 'finalizada')
      .gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
    if (error) throw error;
    const saleIds = sales?.map((sale) => sale.id) ?? [];
    if (saleIds.length === 0) return NextResponse.json({ summary: { faturamento: 0, vendas: 0, ticketMedio: 0 }, products: [], categories: [], operators: [], payments: [] });

    const [{ data: items }, { data: payments }, { data: users }] = await Promise.all([
      supabase.from('itens_venda').select('produto_nome, subtotal, produto:produtos(categoria)').in('venda_id', saleIds),
      supabase.from('pagamentos_venda').select('metodo, valor').in('venda_id', saleIds),
      supabase.from('usuarios').select('id, nome').eq('empresa_id', session.empresa.id),
    ]);
    const productMap = new Map<string, number>();
    const categoryMap = new Map<string, number>();
    const operatorMap = new Map<string, number>();
    const paymentMap = new Map<string, number>();
    (items as ReportItem[] | null)?.forEach((item) => {
      add(productMap, item.produto_nome, Number(item.subtotal));
      add(categoryMap, item.produto?.categoria || 'Sem categoria', Number(item.subtotal));
    });
    const userNames = new Map(users?.map((user) => [user.id, user.nome]));
    sales?.forEach((sale) => add(operatorMap, userNames.get(sale.usuario_id) || 'Usuário removido', Number(sale.total)));
    payments?.forEach((payment) => add(paymentMap, payment.metodo, Number(payment.valor)));
    const revenue = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
    return NextResponse.json({
      summary: { faturamento: revenue, vendas: sales.length, ticketMedio: revenue / sales.length },
      products: toRows(productMap),
      categories: toRows(categoryMap),
      operators: toRows(operatorMap),
      payments: toRows(paymentMap),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
