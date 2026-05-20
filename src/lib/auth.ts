import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import supabase from './supabase';
import type { Usuario, Empresa } from './types';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'sistema-pdv-secret-key-change-in-production'
);

export interface SessionData {
  usuario: {
    id: string;
    nome: string;
    email: string;
    role: string;
    empresa_id: string;
  };
  empresa: {
    id: string;
    nome: string;
    plano: string;
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: SessionData): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionData;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('pdv_session')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setSession(session: SessionData): Promise<void> {
  const token = await createToken(session);
  const cookieStore = await cookies();
  cookieStore.set('pdv_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('pdv_session');
}

export async function login(email: string, senha: string): Promise<{ success: boolean; error?: string; session?: SessionData }> {
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('email', email)
    .eq('ativo', true)
    .single();

  if (!usuario) {
    return { success: false, error: 'Email ou senha incorretos' };
  }

  const validPassword = await verifyPassword(senha, usuario.senha_hash);
  if (!validPassword) {
    return { success: false, error: 'Email ou senha incorretos' };
  }

  const { data: empresa } = await supabase
    .from('empresas')
    .select('*')
    .eq('id', usuario.empresa_id)
    .eq('ativo', true)
    .single();

  if (!empresa) {
    return { success: false, error: 'Empresa inativa ou não encontrada' };
  }

  const session: SessionData = {
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
      empresa_id: usuario.empresa_id,
    },
    empresa: {
      id: empresa.id,
      nome: empresa.nome,
      plano: empresa.plano,
    },
  };

  await setSession(session);
  return { success: true, session };
}

export async function registerEmpresa(data: {
  nomeEmpresa: string;
  cnpj: string;
  nomeUsuario: string;
  email: string;
  senha: string;
}): Promise<{ success: boolean; error?: string }> {
  // Check if email already exists
  const { data: existingUser } = await supabase
    .from('usuarios')
    .select('id')
    .eq('email', data.email)
    .single();

  if (existingUser) {
    return { success: false, error: 'Este email já está cadastrado' };
  }

  // Create empresa
  const { data: empresa, error: empresaError } = await supabase
    .from('empresas')
    .insert({
      nome: data.nomeEmpresa,
      cnpj: data.cnpj || null,
      plano: 'free',
      ativo: true,
    })
    .select()
    .single();

  if (empresaError || !empresa) {
    return { success: false, error: 'Erro ao criar empresa' };
  }

  // Create admin user
  const senhaHash = await hashPassword(data.senha);
  const { error: userError } = await supabase
    .from('usuarios')
    .insert({
      empresa_id: empresa.id,
      nome: data.nomeUsuario,
      email: data.email,
      senha_hash: senhaHash,
      role: 'admin',
      ativo: true,
    });

  if (userError) {
    // Rollback: delete empresa
    await supabase.from('empresas').delete().eq('id', empresa.id);
    return { success: false, error: 'Erro ao criar usuário' };
  }

  return { success: true };
}