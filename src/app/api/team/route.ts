import { NextResponse } from 'next/server';
import { ApiError, apiErrorResponse, readJson, requireApiSession } from '@/lib/api';
import { hashPassword } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

interface TeamInput {
  id?: string;
  nome?: string;
  email?: string;
  senha?: string;
  role?: 'admin' | 'gerente' | 'operador';
  ativo?: boolean;
}

export async function GET() {
  try {
    const session = await requireApiSession(['admin']);
    const { data, error } = await getSupabaseAdmin().from('usuarios')
      .select('id, nome, email, role, ativo, created_at').eq('empresa_id', session.empresa.id).order('nome');
    if (error) throw error;
    return NextResponse.json({ users: data ?? [] });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession(['admin']);
    const input = await readJson<TeamInput>(request);
    const nome = input.nome?.trim();
    const email = input.email?.trim().toLowerCase();
    if (!nome || !email || !input.senha || input.senha.length < 8 || !input.role) {
      throw new ApiError('Informe nome, email, função e uma senha com pelo menos 8 caracteres.');
    }
    const { data, error } = await getSupabaseAdmin().from('usuarios').insert({
      empresa_id: session.empresa.id,
      nome,
      email,
      role: input.role,
      senha_hash: await hashPassword(input.senha),
      ativo: true,
    }).select('id, nome, email, role, ativo, created_at').single();
    if (error) throw new ApiError(error.code === '23505' ? 'Este email já está cadastrado.' : error.message);
    return NextResponse.json({ user: data }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireApiSession(['admin']);
    const input = await readJson<TeamInput>(request);
    if (!input.id) throw new ApiError('Usuário não informado.');
    if (input.id === session.usuario.id && input.ativo === false) throw new ApiError('Você não pode desativar sua própria conta.');
    const update: Record<string, unknown> = {};
    if (input.nome?.trim()) update.nome = input.nome.trim();
    if (input.role) update.role = input.role;
    if (typeof input.ativo === 'boolean') update.ativo = input.ativo;
    if (input.senha) {
      if (input.senha.length < 8) throw new ApiError('A senha deve ter pelo menos 8 caracteres.');
      update.senha_hash = await hashPassword(input.senha);
    }
    const { data, error } = await getSupabaseAdmin().from('usuarios').update(update)
      .eq('id', input.id).eq('empresa_id', session.empresa.id)
      .select('id, nome, email, role, ativo, created_at').single();
    if (error) throw error;
    return NextResponse.json({ user: data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
