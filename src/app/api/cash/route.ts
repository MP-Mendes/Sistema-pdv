import { NextResponse } from 'next/server';
import { ApiError, apiErrorResponse, readJson, requireApiSession } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { calculateCashBalance, type CashMovementValue } from '@/lib/business';

type CashAction =
  | { action: 'open'; valor: number; observacoes?: string }
  | { action: 'movement'; tipo: 'suprimento' | 'sangria'; valor: number; observacoes: string }
  | { action: 'close'; valor: number; observacoes?: string };

interface CashWithMovements {
  valor_abertura: number | string;
  movimentacoes?: CashMovementValue[] | null;
}

const calculateCash = (cash: CashWithMovements) => calculateCashBalance(cash.valor_abertura, cash.movimentacoes ?? []);

export async function GET() {
  try {
    const session = await requireApiSession();
    const supabase = getSupabaseAdmin();
    const [{ data: current, error }, { data: history }] = await Promise.all([
      supabase.from('caixas').select('*, movimentacoes:movimentacoes_caixa(*)')
        .eq('empresa_id', session.empresa.id).eq('usuario_abertura_id', session.usuario.id)
        .eq('status', 'aberto').maybeSingle(),
      supabase.from('caixas').select('*').eq('empresa_id', session.empresa.id)
        .order('opened_at', { ascending: false }).limit(20),
    ]);
    if (error) throw error;
    return NextResponse.json({
      current: current ? { ...current, valor_calculado: calculateCash(current) } : null,
      history: history ?? [],
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession();
    const input = await readJson<CashAction>(request);
    const value = Number(input.valor);
    if (!Number.isFinite(value) || value < 0) throw new ApiError('Valor inválido.');
    const supabase = getSupabaseAdmin();

    const { data: current } = await supabase.from('caixas')
      .select('*, movimentacoes:movimentacoes_caixa(*)')
      .eq('empresa_id', session.empresa.id).eq('usuario_abertura_id', session.usuario.id)
      .eq('status', 'aberto').maybeSingle();

    if (input.action === 'open') {
      if (current) throw new ApiError('Você já possui um caixa aberto.');
      const { data, error } = await supabase.from('caixas').insert({
        empresa_id: session.empresa.id,
        usuario_abertura_id: session.usuario.id,
        valor_abertura: value,
        observacoes: input.observacoes?.trim() || null,
      }).select().single();
      if (error) throw error;
      await supabase.from('auditoria').insert({ empresa_id: session.empresa.id, usuario_id: session.usuario.id, acao: 'caixa_aberto', entidade: 'caixas', entidade_id: data.id, dados: { valor: value } });
      return NextResponse.json({ cash: data }, { status: 201 });
    }

    if (!current) throw new ApiError('Abra o caixa antes de continuar.');

    if (input.action === 'movement') {
      if (!input.observacoes?.trim()) throw new ApiError('Informe o motivo da movimentação.');
      if (value <= 0) throw new ApiError('Informe um valor maior que zero.');
      if (input.tipo === 'sangria' && value > calculateCash(current)) throw new ApiError('A sangria é maior que o saldo do caixa.');
      const { error } = await supabase.from('movimentacoes_caixa').insert({
        caixa_id: current.id,
        empresa_id: session.empresa.id,
        usuario_id: session.usuario.id,
        tipo: input.tipo,
        valor: value,
        observacoes: input.observacoes.trim(),
      });
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    const calculated = calculateCash(current);
    const { data, error } = await supabase.from('caixas').update({
      usuario_fechamento_id: session.usuario.id,
      valor_fechamento_informado: value,
      valor_fechamento_calculado: calculated,
      status: 'fechado',
      closed_at: new Date().toISOString(),
      observacoes: input.observacoes?.trim() || current.observacoes,
    }).eq('id', current.id).eq('empresa_id', session.empresa.id).select().single();
    if (error) throw error;
    await supabase.from('auditoria').insert({ empresa_id: session.empresa.id, usuario_id: session.usuario.id, acao: 'caixa_fechado', entidade: 'caixas', entidade_id: current.id, dados: { calculado: calculated, informado: value, diferenca: value - calculated } });
    return NextResponse.json({ cash: data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
