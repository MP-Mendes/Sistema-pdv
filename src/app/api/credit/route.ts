import { NextResponse } from 'next/server';
import { ApiError, apiErrorResponse, readJson, requireApiSession } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const session = await requireApiSession();
    const { data, error } = await getSupabaseAdmin().from('crediarios')
      .select('*, cliente:clientes(*)').eq('empresa_id', session.empresa.id)
      .neq('status', 'cancelado').order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ credits: data ?? [] });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession(['admin', 'gerente', 'operador']);
    const input = await readJson<{ id?: string; valor?: number; metodo?: string }>(request);
    if (!input.id || !input.metodo || !Number.isFinite(Number(input.valor))) throw new ApiError('Pagamento inválido.');
    const { error } = await getSupabaseAdmin().rpc('registrar_pagamento_crediario', {
      p_empresa_id: session.empresa.id,
      p_usuario_id: session.usuario.id,
      p_crediario_id: input.id,
      p_valor: Number(input.valor),
      p_metodo: input.metodo,
    });
    if (error) throw new ApiError(error.message);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
