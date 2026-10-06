import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/auth';

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const { email, senha } = await request.json();

    if (typeof email !== 'string' || typeof senha !== 'string' || !email || !senha || email.length > 254 || senha.length > 200) {
      return NextResponse.json(
        { success: false, error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    const key = `${ip}:${email.trim().toLowerCase()}`;
    const now = Date.now();
    const current = attempts.get(key);
    if (current && current.resetAt > now && current.count >= MAX_ATTEMPTS) {
      return NextResponse.json({ success: false, error: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 });
    }
    if (current && current.resetAt <= now) attempts.delete(key);

    const result = await login(email, senha);

    if (result.success) {
      attempts.delete(key);
      return NextResponse.json({ success: true, session: result.session });
    } else {
      const previous = attempts.get(key);
      attempts.set(key, { count: (previous?.count || 0) + 1, resetAt: previous?.resetAt || now + WINDOW_MS });
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
