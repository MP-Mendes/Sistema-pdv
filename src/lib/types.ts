// ============ DATABASE TYPES ============

export interface Empresa {
  id: string;
  nome: string;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  logo_url: string | null;
  plano: 'free' | 'basic' | 'pro' | 'admin';
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Usuario {
  id: string;
  empresa_id: string;
  nome: string;
  email: string;
  senha_hash: string;
  role: 'admin' | 'gerente' | 'operador';
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Produto {
  id: string;
  empresa_id: string;
  nome: string;
  codigo: string;
  descricao: string | null;
  preco: number;
  preco_custo: number | null;
  estoque: number;
  estoque_minimo: number | null;
  categoria: string | null;
  unidade: string;
  ativo: boolean;
  imagem_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Cliente {
  id: string;
  empresa_id: string;
  nome: string;
  cpf_cnpj: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  observacoes: string | null;
  limite_credito: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Venda {
  id: string;
  empresa_id: string;
  cliente_id: string | null;
  usuario_id: string;
  numero_venda: number;
  subtotal: number;
  desconto: number;
  total: number;
  status: 'pendente' | 'finalizada' | 'cancelada';
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItemVenda {
  id: string;
  venda_id: string;
  produto_id: string;
  produto_nome: string;
  produto_codigo: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  created_at: string;
}

export interface PagamentoVenda {
  id: string;
  venda_id: string;
  metodo: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'crediario' | 'carne' | 'outro';
  valor: number;
  created_at: string;
}

export interface Crediario {
  id: string;
  empresa_id: string;
  cliente_id: string;
  venda_id: string;
  valor_total: number;
  valor_pago: number;
  valor_pendente: number;
  status: 'aberto' | 'parcial' | 'quitado' | 'vencido';
  data_vencimento: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PagamentoCrediario {
  id: string;
  crediario_id: string;
  valor: number;
  metodo: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'outro';
  observacoes: string | null;
  created_at: string;
}

export interface Customizacao {
  id: string;
  empresa_id: string;
  tipo: 'etiqueta' | 'comprovante';
  configuracao: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============ APP TYPES ============

export interface CartItem {
  produto: Produto;
  quantidade: number;
  subtotal: number;
}

export interface PaymentMethod {
  metodo: PagamentoVenda['metodo'];
  valor: number;
}

export interface DashboardStats {
  vendasHoje: number;
  totalProdutos: number;
  totalClientes: number;
  crediarioPendente: number;
  ultimasVendas: Venda[];
  vendasSemana: { dia: string; total: number }[];
}

export type MetodoPagamento = PagamentoVenda['metodo'];

export const METODOS_PAGAMENTO: { value: MetodoPagamento; label: string }[] = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'pix', label: 'PIX' },
  { value: 'crediario', label: 'Crediário' },
  { value: 'carne', label: 'Carnê' },
  { value: 'outro', label: 'Outro' },
];