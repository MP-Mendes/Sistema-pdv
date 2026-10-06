import { NextResponse } from 'next/server';
import { getActiveSession, type SessionData } from './auth';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message);
  }
}

export async function requireApiSession(
  roles?: Array<SessionData['usuario']['role']>
): Promise<SessionData> {
  const session = await getActiveSession();

  if (!session) throw new ApiError('Sessão expirada. Entre novamente.', 401);
  if (roles && !roles.includes(session.usuario.role)) {
    throw new ApiError('Você não tem permissão para realizar esta ação.', 403);
  }

  return session;
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(error);
  return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return await request.json() as T;
  } catch {
    throw new ApiError('Corpo da requisição inválido.', 400);
  }
}
