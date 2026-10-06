import { NextResponse } from 'next/server';
import { ApiError, apiErrorResponse, readJson, requireApiSession } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const session = await requireApiSession(['admin', 'gerente']);
    const { data, error } = await getSupabaseAdmin().from('movimentacoes_estoque')
      .select('*, produto:produtos(nome, codigo, unidade)')
      .eq('empresa_id', session.empresa.id).order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    return NextResponse.json({ movements: data ?? [] });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession(['admin', 'gerente']);
    const input = await readJson<{ produto_id?: string; tipo?: string; quantidade?: number; observacoes?: string }>(request);
    if (!input.produto_id || !input.tipo || !Number.isFinite(Number(input.quantidade))) throw new ApiError('Movimentação inválida.');
    const { data, error } = await getSupabaseAdmin().rpc('movimentar_estoque', {
      p_empresa_id: session.empresa.id,
      p_usuario_id: session.usuario.id,
      p_produto_id: input.produto_id,
      p_tipo: input.tipo,
      p_quantidade: Number(input.quantidade),
      p_observacoes: input.observacoes || '',
    });
    if (error) throw new ApiError(error.message);
    return NextResponse.json({ estoque: data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
