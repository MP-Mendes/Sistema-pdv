import { NextResponse } from 'next/server';
import { ApiError, apiErrorResponse, readJson, requireApiSession } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireApiSession(['admin', 'gerente']);
    const { motivo } = await readJson<{ motivo?: string }>(request);
    if (!motivo?.trim()) throw new ApiError('Informe o motivo do cancelamento.');
    const { error } = await getSupabaseAdmin().rpc('cancelar_venda', {
      p_empresa_id: session.empresa.id,
      p_usuario_id: session.usuario.id,
      p_venda_id: id,
      p_motivo: motivo.trim(),
    });
    if (error) throw new ApiError(error.message);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
