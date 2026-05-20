import { NextRequest, NextResponse } from 'next/server';
import { registerEmpresa } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { nomeEmpresa, cnpj, nomeUsuario, email, senha } = await request.json();

    if (!nomeEmpresa || !nomeUsuario || !email || !senha) {
      return NextResponse.json(
        { success: false, error: 'Preencha todos os campos obrigatórios' },
        { status: 400 }
      );
    }

    const result = await registerEmpresa({
      nomeEmpresa,
      cnpj,
      nomeUsuario,
      email,
      senha,
    });

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}