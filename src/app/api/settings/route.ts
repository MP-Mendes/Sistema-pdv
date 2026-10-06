import { NextResponse } from 'next/server';
import { ApiError, apiErrorResponse, readJson, requireApiSession } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import {
  DEFAULT_LABEL_PRINT_CONFIG,
  DEFAULT_RECEIPT_PRINT_CONFIG,
  type LabelPrintConfig,
  type ReceiptPrintConfig,
} from '@/lib/thermalPrint';

interface SettingsInput {
  etiqueta?: LabelPrintConfig;
  comprovante?: ReceiptPrintConfig;
}

export async function GET() {
  try {
    const session = await requireApiSession();
    const supabase = getSupabaseAdmin();
    const [{ data: customizations, error }, { data: company }] = await Promise.all([
      supabase.from('customizacoes').select('tipo, configuracao').eq('empresa_id', session.empresa.id),
      supabase.from('empresas').select('nome, cnpj, endereco, logo_url').eq('id', session.empresa.id).single(),
    ]);
    if (error) throw error;
    const label = customizations?.find((item) => item.tipo === 'etiqueta')?.configuracao ?? {};
    const receipt = customizations?.find((item) => item.tipo === 'comprovante')?.configuracao ?? {};
    return NextResponse.json({
      settings: {
        etiqueta: { ...DEFAULT_LABEL_PRINT_CONFIG, ...label },
        comprovante: { ...DEFAULT_RECEIPT_PRINT_CONFIG, ...receipt },
      },
      company,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireApiSession(['admin', 'gerente']);
    const input = await readJson<SettingsInput>(request);
    if (!input.etiqueta || !input.comprovante) throw new ApiError('Configurações incompletas.');
    const rows = [
      { empresa_id: session.empresa.id, tipo: 'etiqueta', configuracao: input.etiqueta },
      { empresa_id: session.empresa.id, tipo: 'comprovante', configuracao: input.comprovante },
    ];
    const { error } = await getSupabaseAdmin().from('customizacoes').upsert(rows, { onConflict: 'empresa_id,tipo' });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
