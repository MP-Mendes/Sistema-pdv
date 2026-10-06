import { NextResponse } from 'next/server';
import { ApiError, apiErrorResponse, readJson, requireApiSession } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

interface ProductInput {
  id?: string;
  nome?: string;
  codigo?: string;
  descricao?: string | null;
  preco?: number;
  preco_custo?: number | null;
  estoque?: number;
  estoque_minimo?: number | null;
  categoria?: string | null;
  unidade?: string;
}

const normalizeProduct = (input: ProductInput) => {
  const nome = input.nome?.trim();
  const codigo = input.codigo?.trim();
  const preco = Number(input.preco);
  const estoque = Number(input.estoque ?? 0);
  const precoCusto = input.preco_custo == null ? null : Number(input.preco_custo);
  const estoqueMinimo = input.estoque_minimo == null ? null : Number(input.estoque_minimo);
  const unidades = ['un', 'kg', 'g', 'l', 'ml', 'cx', 'pc'];

  if (!nome || !codigo || !Number.isFinite(preco) || preco < 0) {
    throw new ApiError('Informe nome, código e um preço válido.');
  }
  if (!Number.isFinite(estoque) || estoque < 0) throw new ApiError('Estoque inválido.');
  if (precoCusto !== null && (!Number.isFinite(precoCusto) || precoCusto < 0)) throw new ApiError('Preço de custo inválido.');
  if (estoqueMinimo !== null && (!Number.isFinite(estoqueMinimo) || estoqueMinimo < 0)) throw new ApiError('Estoque mínimo inválido.');
  if (input.unidade && !unidades.includes(input.unidade)) throw new ApiError('Unidade inválida.');

  return {
    nome,
    codigo,
    descricao: input.descricao?.trim() || null,
    preco,
    preco_custo: precoCusto,
    estoque,
    estoque_minimo: estoqueMinimo,
    categoria: input.categoria?.trim() || null,
    unidade: input.unidade || 'un',
    ativo: true,
  };
};

export async function GET(request: Request) {
  try {
    const session = await requireApiSession();
    const includeInactive = new URL(request.url).searchParams.get('includeInactive') === 'true';
    let query = getSupabaseAdmin().from('produtos').select('*')
      .eq('empresa_id', session.empresa.id).order('nome');
    if (!includeInactive) query = query.eq('ativo', true);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ products: data ?? [] });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession(['admin', 'gerente']);
    const input = await readJson<ProductInput>(request);
    const product = normalizeProduct(input);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('produtos')
      .insert({ ...product, empresa_id: session.empresa.id }).select().single();
    if (error) throw new ApiError(error.code === '23505' ? 'Já existe um produto com esse código.' : error.message);

    if (product.estoque > 0) {
      await supabase.from('movimentacoes_estoque').insert({
        empresa_id: session.empresa.id,
        produto_id: data.id,
        usuario_id: session.usuario.id,
        tipo: 'entrada',
        quantidade: product.estoque,
        estoque_anterior: 0,
        estoque_posterior: product.estoque,
        observacoes: 'Estoque inicial',
      });
    }
    return NextResponse.json({ product: data }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireApiSession(['admin', 'gerente']);
    const input = await readJson<ProductInput>(request);
    if (!input.id) throw new ApiError('Produto não informado.');
    const product = normalizeProduct(input);
    const supabase = getSupabaseAdmin();
    const { data: current } = await supabase.from('produtos').select('*')
      .eq('id', input.id).eq('empresa_id', session.empresa.id).single();
    if (!current) throw new ApiError('Produto não encontrado.', 404);

    const { data, error } = await supabase.from('produtos').update(product)
      .eq('id', input.id).eq('empresa_id', session.empresa.id).select().single();
    if (error) throw new ApiError(error.code === '23505' ? 'Já existe um produto com esse código.' : error.message);

    if (Number(current.estoque) !== product.estoque) {
      await supabase.from('movimentacoes_estoque').insert({
        empresa_id: session.empresa.id,
        produto_id: input.id,
        usuario_id: session.usuario.id,
        tipo: 'ajuste',
        quantidade: product.estoque - Number(current.estoque),
        estoque_anterior: current.estoque,
        estoque_posterior: product.estoque,
        observacoes: 'Ajuste no cadastro do produto',
      });
    }
    return NextResponse.json({ product: data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireApiSession(['admin', 'gerente']);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new ApiError('Produto não informado.');
    const { error } = await getSupabaseAdmin().from('produtos').update({ ativo: false })
      .eq('id', id).eq('empresa_id', session.empresa.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
