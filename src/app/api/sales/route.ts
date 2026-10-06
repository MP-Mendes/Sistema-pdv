import { NextResponse } from 'next/server';
import { ApiError, apiErrorResponse, readJson, requireApiSession } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import type { MetodoPagamento } from '@/lib/types';

interface SaleInput {
  cliente_id?: string | null;
  desconto?: number;
  itens?: Array<{ produto_id: string; quantidade: number }>;
  pagamentos?: Array<{ metodo: MetodoPagamento; valor: number }>;
}

export async function GET(request: Request) {
  try {
    const session = await requireApiSession();
    const params = new URL(request.url).searchParams;
    const requestedPage = Number(params.get('page') || 1);
    const requestedPageSize = Number(params.get('pageSize') || 25);
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const pageSize = Number.isInteger(requestedPageSize) ? Math.min(100, Math.max(10, requestedPageSize)) : 25;
    const from = params.get('from');
    const to = params.get('to');
    const requestedStatus = params.get('status') || 'finalizada';
    const status = ['pendente', 'finalizada', 'cancelada'].includes(requestedStatus) ? requestedStatus : 'finalizada';
    const offset = (page - 1) * pageSize;

    let query = getSupabaseAdmin().from('vendas')
      .select('*, cliente:clientes(nome), itens:itens_venda(*), pagamentos:pagamentos_venda(*)', { count: 'exact' })
      .eq('empresa_id', session.empresa.id)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (from) query = query.gte('created_at', new Date(`${from}T00:00:00`).toISOString());
    if (to) query = query.lte('created_at', new Date(`${to}T23:59:59.999`).toISOString());
    const { data, count, error } = await query;
    if (error) throw error;
    return NextResponse.json({ sales: data ?? [], total: count ?? 0, page, pageSize });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession(['admin', 'gerente', 'operador']);
    const input = await readJson<SaleInput>(request);
    if (!input.itens?.length || !input.pagamentos?.length) throw new ApiError('Informe itens e pagamentos.');
    if (Number(input.desconto || 0) > 0 && session.usuario.role === 'operador') {
      throw new ApiError('Somente gerentes ou administradores podem conceder descontos.', 403);
    }
    const supabase = getSupabaseAdmin();
    const { data: saleId, error: rpcError } = await supabase.rpc('finalizar_venda', {
      p_empresa_id: session.empresa.id,
      p_usuario_id: session.usuario.id,
      p_cliente_id: input.cliente_id || null,
      p_desconto: Number(input.desconto || 0),
      p_itens: input.itens,
      p_pagamentos: input.pagamentos,
    });
    if (rpcError) throw new ApiError(rpcError.message);

    const { data: sale, error } = await supabase.from('vendas')
      .select('*, cliente:clientes(nome), itens:itens_venda(*), pagamentos:pagamentos_venda(*)')
      .eq('id', saleId).eq('empresa_id', session.empresa.id).single();
    if (error) throw error;
    return NextResponse.json({ sale }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
