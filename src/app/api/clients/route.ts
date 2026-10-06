import { NextResponse } from 'next/server';
import { ApiError, apiErrorResponse, readJson, requireApiSession } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

interface ClientInput {
  id?: string;
  nome?: string;
  cpf_cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  observacoes?: string | null;
  limite_credito?: number;
}

const normalizeClient = (input: ClientInput) => {
  const nome = input.nome?.trim();
  if (!nome) throw new ApiError('Informe o nome do cliente.');
  const limite = Number(input.limite_credito ?? 0);
  if (!Number.isFinite(limite) || limite < 0) throw new ApiError('Limite de crédito inválido.');
  return {
    nome,
    cpf_cnpj: input.cpf_cnpj?.trim() || null,
    email: input.email?.trim().toLowerCase() || null,
    telefone: input.telefone?.trim() || null,
    endereco: input.endereco?.trim() || null,
    observacoes: input.observacoes?.trim() || null,
    limite_credito: limite,
    ativo: true,
  };
};

export async function GET() {
  try {
    const session = await requireApiSession();
    const { data, error } = await getSupabaseAdmin().from('clientes').select('*')
      .eq('empresa_id', session.empresa.id).eq('ativo', true).order('nome');
    if (error) throw error;
    return NextResponse.json({ clients: data ?? [] });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession(['admin', 'gerente', 'operador']);
    const client = normalizeClient(await readJson<ClientInput>(request));
    const { data, error } = await getSupabaseAdmin().from('clientes')
      .insert({ ...client, empresa_id: session.empresa.id }).select().single();
    if (error) throw error;
    return NextResponse.json({ client: data }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireApiSession(['admin', 'gerente']);
    const input = await readJson<ClientInput>(request);
    if (!input.id) throw new ApiError('Cliente não informado.');
    const { data, error } = await getSupabaseAdmin().from('clientes').update(normalizeClient(input))
      .eq('id', input.id).eq('empresa_id', session.empresa.id).select().single();
    if (error) throw error;
    if (!data) throw new ApiError('Cliente não encontrado.', 404);
    return NextResponse.json({ client: data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireApiSession(['admin', 'gerente']);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new ApiError('Cliente não informado.');
    const { error } = await getSupabaseAdmin().from('clientes').update({ ativo: false })
      .eq('id', id).eq('empresa_id', session.empresa.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
