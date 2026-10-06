import { NextResponse } from 'next/server';
import { apiErrorResponse, requireApiSession } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const session = await requireApiSession(['admin']);
    const { data, error } = await getSupabaseAdmin().from('auditoria')
      .select('*, usuario:usuarios(nome)').eq('empresa_id', session.empresa.id)
      .order('created_at', { ascending: false }).limit(500);
    if (error) throw error;
    return NextResponse.json({ events: data ?? [] });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
