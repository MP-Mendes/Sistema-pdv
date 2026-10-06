import { NextResponse } from 'next/server';
import { apiErrorResponse, requireApiSession } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const session = await requireApiSession(['admin']);
    const supabase = getSupabaseAdmin();
    const empresaId = session.empresa.id;
    const [company, products, clients, sales, credits, stock, cash, users, settings] = await Promise.all([
      supabase.from('empresas').select('id, nome, cnpj, endereco, telefone, email, plano, ativo, created_at, updated_at').eq('id', empresaId).single(),
      supabase.from('produtos').select('*').eq('empresa_id', empresaId),
      supabase.from('clientes').select('*').eq('empresa_id', empresaId),
      supabase.from('vendas').select('*, itens:itens_venda(*), pagamentos:pagamentos_venda(*)').eq('empresa_id', empresaId),
      supabase.from('crediarios').select('*, pagamentos:pagamentos_crediario(*)').eq('empresa_id', empresaId),
      supabase.from('movimentacoes_estoque').select('*').eq('empresa_id', empresaId),
      supabase.from('caixas').select('*, movimentacoes:movimentacoes_caixa(*)').eq('empresa_id', empresaId),
      supabase.from('usuarios').select('id, empresa_id, nome, email, role, ativo, created_at, updated_at').eq('empresa_id', empresaId),
      supabase.from('customizacoes').select('*').eq('empresa_id', empresaId),
    ]);
    const failed = [company, products, clients, sales, credits, stock, cash, users, settings].find((result) => result.error);
    if (failed?.error) throw failed.error;
    return NextResponse.json({
      exported_at: new Date().toISOString(),
      version: 1,
      empresa: company.data,
      produtos: products.data,
      clientes: clients.data,
      vendas: sales.data,
      crediarios: credits.data,
      movimentacoes_estoque: stock.data,
      caixas: cash.data,
      usuarios: users.data,
      customizacoes: settings.data,
    }, {
      headers: { 'Content-Disposition': `attachment; filename="backup-pdv-${new Date().toISOString().slice(0, 10)}.json"` },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
