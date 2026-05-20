-- =============================================
-- SISTEMA PDV - Migration Inicial
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- EMPRESAS
-- =============================================
CREATE TABLE IF NOT EXISTS empresas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18),
  endereco TEXT,
  telefone VARCHAR(20),
  email VARCHAR(255),
  logo_url TEXT,
  plano VARCHAR(20) DEFAULT 'free' CHECK (plano IN ('free', 'basic', 'pro', 'admin')),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USUARIOS
-- =============================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'operador' CHECK (role IN ('admin', 'gerente', 'operador')),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PRODUTOS
-- =============================================
CREATE TABLE IF NOT EXISTS produtos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  codigo VARCHAR(50) NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2) NOT NULL DEFAULT 0,
  preco_custo DECIMAL(10,2),
  estoque INTEGER NOT NULL DEFAULT 0,
  estoque_minimo INTEGER,
  categoria VARCHAR(100),
  unidade VARCHAR(10) DEFAULT 'un' CHECK (unidade IN ('un', 'kg', 'g', 'l', 'ml', 'cx', 'pc')),
  ativo BOOLEAN DEFAULT true,
  imagem_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, codigo)
);

-- =============================================
-- CLIENTES
-- =============================================
CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  cpf_cnpj VARCHAR(18),
  email VARCHAR(255),
  telefone VARCHAR(20),
  endereco TEXT,
  observacoes TEXT,
  limite_credito DECIMAL(10,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- VENDAS
-- =============================================
CREATE TABLE IF NOT EXISTS vendas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE SET NULL,
  numero_venda INTEGER NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  desconto DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'finalizada', 'cancelada')),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, numero_venda)
);

-- =============================================
-- ITENS DA VENDA
-- =============================================
CREATE TABLE IF NOT EXISTS itens_venda (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE SET NULL,
  produto_nome VARCHAR(255) NOT NULL,
  produto_codigo VARCHAR(50) NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PAGAMENTOS DA VENDA
-- =============================================
CREATE TABLE IF NOT EXISTS pagamentos_venda (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  metodo VARCHAR(30) NOT NULL CHECK (metodo IN ('dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'crediario', 'carne', 'outro')),
  valor DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CREDIÁRIO
-- =============================================
CREATE TABLE IF NOT EXISTS crediarios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  valor_total DECIMAL(10,2) NOT NULL,
  valor_pago DECIMAL(10,2) NOT NULL DEFAULT 0,
  valor_pendente DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'aberto' CHECK (status IN ('aberto', 'parcial', 'quitado', 'vencido')),
  data_vencimento DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PAGAMENTOS DO CREDIÁRIO
-- =============================================
CREATE TABLE IF NOT EXISTS pagamentos_crediario (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  crediario_id UUID NOT NULL REFERENCES crediarios(id) ON DELETE CASCADE,
  valor DECIMAL(10,2) NOT NULL,
  metodo VARCHAR(30) NOT NULL CHECK (metodo IN ('dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'outro')),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CUSTOMIZAÇÕES
-- =============================================
CREATE TABLE IF NOT EXISTS customizacoes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('etiqueta', 'comprovante')),
  configuracao JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, tipo)
);

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa ON usuarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_produtos_empresa ON produtos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON produtos(empresa_id, codigo);
CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_vendas_empresa ON vendas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_vendas_created ON vendas(empresa_id, created_at);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente ON vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_itens_venda ON itens_venda(venda_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_venda ON pagamentos_venda(venda_id);
CREATE INDEX IF NOT EXISTS idx_crediarios_empresa ON crediarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_crediarios_cliente ON crediarios(cliente_id);
CREATE INDEX IF NOT EXISTS idx_crediarios_status ON crediarios(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_crediario ON pagamentos_crediario(crediario_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE crediarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos_crediario ENABLE ROW LEVEL SECURITY;
ALTER TABLE customizacoes ENABLE ROW LEVEL SECURITY;

-- Políticas para empresas (acesso via service role no backend)
CREATE POLICY "allow_all_empresas" ON empresas FOR ALL USING (true);
CREATE POLICY "allow_all_usuarios" ON usuarios FOR ALL USING (true);
CREATE POLICY "allow_all_produtos" ON produtos FOR ALL USING (true);
CREATE POLICY "allow_all_clientes" ON clientes FOR ALL USING (true);
CREATE POLICY "allow_all_vendas" ON vendas FOR ALL USING (true);
CREATE POLICY "allow_all_itens_venda" ON itens_venda FOR ALL USING (true);
CREATE POLICY "allow_all_pagamentos_venda" ON pagamentos_venda FOR ALL USING (true);
CREATE POLICY "allow_all_crediarios" ON crediarios FOR ALL USING (true);
CREATE POLICY "allow_all_pagamentos_crediario" ON pagamentos_crediario FOR ALL USING (true);
CREATE POLICY "allow_all_customizacoes" ON customizacoes FOR ALL USING (true);

-- =============================================
-- FUNÇÕES
-- =============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_empresas_updated_at ON empresas;
CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON empresas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_produtos_updated_at ON produtos;
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON produtos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendas_updated_at ON vendas;
CREATE TRIGGER update_vendas_updated_at BEFORE UPDATE ON vendas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crediarios_updated_at ON crediarios;
CREATE TRIGGER update_crediarios_updated_at BEFORE UPDATE ON crediarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customizacoes_updated_at ON customizacoes;
CREATE TRIGGER update_customizacoes_updated_at BEFORE UPDATE ON customizacoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();