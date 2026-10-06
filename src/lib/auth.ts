import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from './supabaseAdmin';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET deve existir e ter pelo menos 32 caracteres.');
  }
  return new TextEncoder().encode(secret);
};

export interface SessionData {
  usuario: {
    id: string;
    nome: string;
    email: string;
    role: 'admin' | 'gerente' | 'operador';
    empresa_id: string;
  };
  empresa: {
    id: string;
    nome: string;
    plano: 'free' | 'basic' | 'pro' | 'admin';
    cnpj: string | null;
    endereco: string | null;
    logo_url: string | null;
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
    .setIssuedAt()
    .setIssuer('sistema-pdv')
    .setAudience('sistema-pdv-web')
    .setExpirationTime('12h')
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: 'sistema-pdv',
      audience: 'sistema-pdv-web',
    });
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

export async function getActiveSession(): Promise<SessionData | null> {
  const session = await getSession();
  if (!session) return null;

  const { data: usuario } = await getSupabaseAdmin()
    .from('usuarios')
    .select('id, empresa_id, nome, email, role, ativo, empresa:empresas(id, nome, plano, cnpj, endereco, logo_url, ativo)')
    .eq('id', session.usuario.id)
    .eq('empresa_id', session.empresa.id)
    .maybeSingle();
  const empresa = Array.isArray(usuario?.empresa) ? usuario.empresa[0] : usuario?.empresa;

  if (!usuario?.ativo || !empresa?.ativo) return null;

  return {
    usuario: {
      id: usuario.id,
      empresa_id: usuario.empresa_id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
    },
    empresa: {
      id: empresa.id,
      nome: empresa.nome,
      plano: empresa.plano,
      cnpj: empresa.cnpj,
      endereco: empresa.endereco,
      logo_url: empresa.logo_url,
    },
  };
}

export async function setSession(session: SessionData): Promise<void> {
  const token = await createToken(session);
  const cookieStore = await cookies();
  cookieStore.set('pdv_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 12,
    path: '/',
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('pdv_session');
}

export async function login(email: string, senha: string): Promise<{ success: boolean; error?: string; session?: SessionData }> {
  const supabase = getSupabaseAdmin();
  const normalizedEmail = email.trim().toLowerCase();
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, empresa_id, nome, email, senha_hash, role, ativo')
    .eq('email', normalizedEmail)
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
    .select('id, nome, plano, cnpj, endereco, logo_url, ativo')
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
      cnpj: empresa.cnpj,
      endereco: empresa.endereco,
      logo_url: empresa.logo_url,
    },
  };

  await setSession(session);
  return { success: true, session };
}
