import { NextResponse } from 'next/server';
import { ApiError, apiErrorResponse, readJson, requireApiSession } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const requirePlatformAdmin = async () => {
  const session = await requireApiSession(['admin']);
  if (session.empresa.plano !== 'admin') throw new ApiError('Acesso restrito ao administrador da plataforma.', 403);
  return session;
};

export async function GET() {
  try {
    await requirePlatformAdmin();
    const supabase = getSupabaseAdmin();
    const [{ data: companies, error }, { data: sales }] = await Promise.all([
      supabase.from('empresas').select('*').order('created_at', { ascending: false }),
      supabase.from('vendas').select('total').eq('status', 'finalizada'),
    ]);
    if (error) throw error;
    return NextResponse.json({
      companies: companies ?? [],
      stats: {
        totalEmpresas: companies?.length ?? 0,
        empresasAtivas: companies?.filter((company) => company.ativo).length ?? 0,
        totalVendas: sales?.length ?? 0,
        faturamentoTotal: sales?.reduce((sum, sale) => sum + Number(sale.total), 0) ?? 0,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePlatformAdmin();
    const { id, ativo } = await readJson<{ id?: string; ativo?: boolean }>(request);
    if (!id || typeof ativo !== 'boolean') throw new ApiError('Empresa inválida.');
    if (id === session.empresa.id && !ativo) throw new ApiError('A empresa administradora não pode ser desativada.');
    const { error } = await getSupabaseAdmin().from('empresas').update({ ativo }).eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
