-- Segurança, consistência de estoque, auditoria e operação de caixa.
-- A aplicação passa a acessar estas tabelas somente por rotas autenticadas no servidor.

BEGIN;

ALTER TABLE vendas ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE itens_venda ALTER COLUMN produto_id DROP NOT NULL;
ALTER TABLE produtos ALTER COLUMN estoque TYPE NUMERIC(12,3) USING estoque::NUMERIC;
ALTER TABLE produtos ALTER COLUMN estoque_minimo TYPE NUMERIC(12,3) USING estoque_minimo::NUMERIC;
ALTER TABLE itens_venda ALTER COLUMN quantidade TYPE NUMERIC(12,3) USING quantidade::NUMERIC;

ALTER TABLE crediarios DROP CONSTRAINT IF EXISTS crediarios_status_check;
ALTER TABLE crediarios ADD CONSTRAINT crediarios_status_check
  CHECK (status IN ('aberto', 'parcial', 'quitado', 'vencido', 'cancelado'));

CREATE TABLE IF NOT EXISTS caixas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_abertura_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_fechamento_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  valor_abertura DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (valor_abertura >= 0),
  valor_fechamento_informado DECIMAL(12,2),
  valor_fechamento_calculado DECIMAL(12,2),
  status VARCHAR(20) NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
  observacoes TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

ALTER TABLE vendas ADD COLUMN IF NOT EXISTS caixa_id UUID REFERENCES caixas(id) ON DELETE SET NULL;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS cancelada_at TIMESTAMPTZ;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS cancelada_por UUID REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT;

CREATE TABLE IF NOT EXISTS movimentacoes_caixa (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  caixa_id UUID NOT NULL REFERENCES caixas(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('venda', 'suprimento', 'sangria', 'estorno')),
  valor DECIMAL(12,2) NOT NULL CHECK (valor > 0),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('venda', 'cancelamento', 'entrada', 'saida', 'ajuste')),
  quantidade DECIMAL(12,3) NOT NULL,
  estoque_anterior DECIMAL(12,3) NOT NULL,
  estoque_posterior DECIMAL(12,3) NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auditoria (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  acao VARCHAR(80) NOT NULL,
  entidade VARCHAR(80) NOT NULL,
  entidade_id UUID,
  dados JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_caixa_aberto_usuario
  ON caixas(empresa_id, usuario_abertura_id) WHERE status = 'aberto';
CREATE INDEX IF NOT EXISTS idx_caixas_empresa_data ON caixas(empresa_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_mov_caixa_caixa ON movimentacoes_caixa(caixa_id, created_at);
CREATE INDEX IF NOT EXISTS idx_mov_estoque_produto ON movimentacoes_estoque(produto_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_empresa_data ON auditoria(empresa_id, created_at DESC);

ALTER TABLE caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_all_empresas ON empresas;
DROP POLICY IF EXISTS allow_all_usuarios ON usuarios;
DROP POLICY IF EXISTS allow_all_produtos ON produtos;
DROP POLICY IF EXISTS allow_all_clientes ON clientes;
DROP POLICY IF EXISTS allow_all_vendas ON vendas;
DROP POLICY IF EXISTS allow_all_itens_venda ON itens_venda;
DROP POLICY IF EXISTS allow_all_pagamentos_venda ON pagamentos_venda;
DROP POLICY IF EXISTS allow_all_crediarios ON crediarios;
DROP POLICY IF EXISTS allow_all_pagamentos_crediario ON pagamentos_crediario;
DROP POLICY IF EXISTS allow_all_customizacoes ON customizacoes;

CREATE OR REPLACE FUNCTION finalizar_venda(
  p_empresa_id UUID,
  p_usuario_id UUID,
  p_cliente_id UUID,
  p_desconto NUMERIC,
  p_itens JSONB,
  p_pagamentos JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venda_id UUID;
  v_numero INTEGER;
  v_subtotal NUMERIC(12,2) := 0;
  v_total NUMERIC(12,2);
  v_total_pagamentos NUMERIC(12,2);
  v_credito NUMERIC(12,2);
  v_dinheiro NUMERIC(12,2);
  v_limite_disponivel NUMERIC(12,2);
  v_caixa_id UUID;
  v_item JSONB;
  v_pagamento JSONB;
  v_produto produtos%ROWTYPE;
  v_quantidade NUMERIC(12,3);
  v_estoque_anterior NUMERIC(12,3);
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = p_usuario_id AND empresa_id = p_empresa_id AND ativo = true
  ) THEN
    RAISE EXCEPTION 'Usuário inválido para esta empresa';
  END IF;

  IF p_cliente_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM clientes
    WHERE id = p_cliente_id AND empresa_id = p_empresa_id AND ativo = true
  ) THEN
    RAISE EXCEPTION 'Cliente inválido para esta empresa';
  END IF;

  IF jsonb_array_length(COALESCE(p_itens, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'A venda precisa ter ao menos um item';
  END IF;
  IF jsonb_array_length(COALESCE(p_pagamentos, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'A venda precisa ter ao menos um pagamento';
  END IF;
  IF (SELECT COUNT(*) FROM jsonb_array_elements(p_itens)) <>
     (SELECT COUNT(DISTINCT value->>'produto_id') FROM jsonb_array_elements(p_itens)) THEN
    RAISE EXCEPTION 'O mesmo produto não pode aparecer mais de uma vez na venda';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_pagamentos)
    WHERE (value->>'valor')::NUMERIC <= 0
       OR value->>'metodo' NOT IN ('dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'crediario', 'carne', 'outro')
  ) THEN
    RAISE EXCEPTION 'Forma ou valor de pagamento inválido';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_empresa_id::TEXT, 0));

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    v_quantidade := (v_item->>'quantidade')::NUMERIC;
    IF v_quantidade <= 0 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;

    SELECT * INTO v_produto FROM produtos
    WHERE id = (v_item->>'produto_id')::UUID
      AND empresa_id = p_empresa_id AND ativo = true
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado'; END IF;
    IF v_produto.estoque < v_quantidade THEN
      RAISE EXCEPTION 'Estoque insuficiente para %', v_produto.nome;
    END IF;

    v_subtotal := v_subtotal + ROUND(v_produto.preco * v_quantidade, 2);
  END LOOP;

  IF COALESCE(p_desconto, 0) < 0 OR COALESCE(p_desconto, 0) > v_subtotal THEN
    RAISE EXCEPTION 'Desconto inválido';
  END IF;

  v_total := v_subtotal - COALESCE(p_desconto, 0);
  SELECT COALESCE(SUM((value->>'valor')::NUMERIC), 0)
    INTO v_total_pagamentos FROM jsonb_array_elements(COALESCE(p_pagamentos, '[]'::jsonb));
  IF ABS(v_total_pagamentos - v_total) > 0.01 THEN
    RAISE EXCEPTION 'O total dos pagamentos não corresponde ao total da venda';
  END IF;

  SELECT id INTO v_caixa_id FROM caixas
  WHERE empresa_id = p_empresa_id AND usuario_abertura_id = p_usuario_id AND status = 'aberto'
  ORDER BY opened_at DESC LIMIT 1;

  SELECT COALESCE(MAX(numero_venda), 0) + 1 INTO v_numero
    FROM vendas WHERE empresa_id = p_empresa_id;

  INSERT INTO vendas (empresa_id, cliente_id, usuario_id, caixa_id, numero_venda, subtotal, desconto, total, status)
  VALUES (p_empresa_id, p_cliente_id, p_usuario_id, v_caixa_id, v_numero, v_subtotal, COALESCE(p_desconto, 0), v_total, 'finalizada')
  RETURNING id INTO v_venda_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    v_quantidade := (v_item->>'quantidade')::NUMERIC;
    SELECT * INTO v_produto FROM produtos WHERE id = (v_item->>'produto_id')::UUID FOR UPDATE;
    v_estoque_anterior := v_produto.estoque;

    INSERT INTO itens_venda (venda_id, produto_id, produto_nome, produto_codigo, quantidade, preco_unitario, subtotal)
    VALUES (v_venda_id, v_produto.id, v_produto.nome, v_produto.codigo, v_quantidade, v_produto.preco, ROUND(v_produto.preco * v_quantidade, 2));

    UPDATE produtos SET estoque = estoque - v_quantidade WHERE id = v_produto.id;
    INSERT INTO movimentacoes_estoque (empresa_id, produto_id, usuario_id, venda_id, tipo, quantidade, estoque_anterior, estoque_posterior)
    VALUES (p_empresa_id, v_produto.id, p_usuario_id, v_venda_id, 'venda', -v_quantidade, v_estoque_anterior, v_estoque_anterior - v_quantidade);
  END LOOP;

  FOR v_pagamento IN SELECT * FROM jsonb_array_elements(p_pagamentos)
  LOOP
    INSERT INTO pagamentos_venda (venda_id, metodo, valor)
    VALUES (v_venda_id, v_pagamento->>'metodo', (v_pagamento->>'valor')::NUMERIC);
  END LOOP;

  SELECT COALESCE(SUM((value->>'valor')::NUMERIC), 0) INTO v_credito
    FROM jsonb_array_elements(p_pagamentos)
    WHERE value->>'metodo' IN ('crediario', 'carne');
  IF v_credito > 0 THEN
    IF p_cliente_id IS NULL THEN RAISE EXCEPTION 'Crediário exige um cliente'; END IF;
    SELECT limite_credito - COALESCE((
      SELECT SUM(valor_pendente) FROM crediarios
      WHERE cliente_id = p_cliente_id AND empresa_id = p_empresa_id
        AND status IN ('aberto', 'parcial', 'vencido')
    ), 0) INTO v_limite_disponivel
    FROM clientes WHERE id = p_cliente_id AND empresa_id = p_empresa_id;
    IF v_credito > v_limite_disponivel THEN RAISE EXCEPTION 'Limite de crédito insuficiente'; END IF;
    INSERT INTO crediarios (empresa_id, cliente_id, venda_id, valor_total, valor_pago, valor_pendente, status)
    VALUES (p_empresa_id, p_cliente_id, v_venda_id, v_credito, 0, v_credito, 'aberto');
  END IF;

  SELECT COALESCE(SUM((value->>'valor')::NUMERIC), 0) INTO v_dinheiro
    FROM jsonb_array_elements(p_pagamentos) WHERE value->>'metodo' = 'dinheiro';
  IF v_caixa_id IS NOT NULL AND v_dinheiro > 0 THEN
    INSERT INTO movimentacoes_caixa (caixa_id, empresa_id, usuario_id, venda_id, tipo, valor)
    VALUES (v_caixa_id, p_empresa_id, p_usuario_id, v_venda_id, 'venda', v_dinheiro);
  END IF;

  INSERT INTO auditoria (empresa_id, usuario_id, acao, entidade, entidade_id, dados)
  VALUES (p_empresa_id, p_usuario_id, 'venda_finalizada', 'vendas', v_venda_id, jsonb_build_object('total', v_total, 'numero', v_numero));

  RETURN v_venda_id;
END;
$$;

CREATE OR REPLACE FUNCTION cancelar_venda(
  p_empresa_id UUID,
  p_usuario_id UUID,
  p_venda_id UUID,
  p_motivo TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venda vendas%ROWTYPE;
  v_item RECORD;
  v_role VARCHAR(20);
  v_dinheiro NUMERIC(12,2);
BEGIN
  SELECT role INTO v_role FROM usuarios
  WHERE id = p_usuario_id AND empresa_id = p_empresa_id AND ativo = true;
  IF v_role NOT IN ('admin', 'gerente') THEN RAISE EXCEPTION 'Sem permissão para cancelar vendas'; END IF;

  SELECT * INTO v_venda FROM vendas
  WHERE id = p_venda_id AND empresa_id = p_empresa_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venda não encontrada'; END IF;
  IF v_venda.status <> 'finalizada' THEN RAISE EXCEPTION 'A venda não pode mais ser cancelada'; END IF;
  IF LENGTH(TRIM(COALESCE(p_motivo, ''))) < 3 THEN RAISE EXCEPTION 'Informe o motivo do cancelamento'; END IF;
  IF EXISTS (SELECT 1 FROM crediarios WHERE venda_id = p_venda_id AND valor_pago > 0) THEN
    RAISE EXCEPTION 'Não é possível cancelar uma venda com parcelas já recebidas';
  END IF;

  FOR v_item IN SELECT * FROM itens_venda WHERE venda_id = p_venda_id
  LOOP
    IF v_item.produto_id IS NOT NULL THEN
      UPDATE produtos SET estoque = estoque + v_item.quantidade WHERE id = v_item.produto_id;
      INSERT INTO movimentacoes_estoque (empresa_id, produto_id, usuario_id, venda_id, tipo, quantidade, estoque_anterior, estoque_posterior, observacoes)
      SELECT p_empresa_id, p.id, p_usuario_id, p_venda_id, 'cancelamento', v_item.quantidade,
        p.estoque - v_item.quantidade, p.estoque, p_motivo
      FROM produtos p WHERE p.id = v_item.produto_id;
    END IF;
  END LOOP;

  UPDATE vendas SET status = 'cancelada', cancelada_at = NOW(), cancelada_por = p_usuario_id, motivo_cancelamento = TRIM(p_motivo)
  WHERE id = p_venda_id;
  UPDATE crediarios SET status = 'cancelado', valor_pendente = 0 WHERE venda_id = p_venda_id AND status <> 'quitado';

  SELECT COALESCE(SUM(valor), 0) INTO v_dinheiro FROM pagamentos_venda
  WHERE venda_id = p_venda_id AND metodo = 'dinheiro';
  IF v_venda.caixa_id IS NOT NULL AND v_dinheiro > 0 THEN
    INSERT INTO movimentacoes_caixa (caixa_id, empresa_id, usuario_id, venda_id, tipo, valor, observacoes)
    VALUES (v_venda.caixa_id, p_empresa_id, p_usuario_id, p_venda_id, 'estorno', v_dinheiro, p_motivo);
  END IF;

  INSERT INTO auditoria (empresa_id, usuario_id, acao, entidade, entidade_id, dados)
  VALUES (p_empresa_id, p_usuario_id, 'venda_cancelada', 'vendas', p_venda_id, jsonb_build_object('motivo', TRIM(p_motivo), 'total', v_venda.total));
END;
$$;

CREATE OR REPLACE FUNCTION registrar_pagamento_crediario(
  p_empresa_id UUID,
  p_usuario_id UUID,
  p_crediario_id UUID,
  p_valor NUMERIC,
  p_metodo VARCHAR
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_crediario crediarios%ROWTYPE;
  v_novo_pago NUMERIC(12,2);
  v_novo_pendente NUMERIC(12,2);
  v_caixa_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = p_usuario_id AND empresa_id = p_empresa_id AND ativo = true) THEN
    RAISE EXCEPTION 'Usuário inválido';
  END IF;
  SELECT * INTO v_crediario FROM crediarios
  WHERE id = p_crediario_id AND empresa_id = p_empresa_id FOR UPDATE;
  IF NOT FOUND OR v_crediario.status IN ('quitado', 'cancelado') THEN RAISE EXCEPTION 'Crediário indisponível'; END IF;
  IF p_valor <= 0 OR p_valor > v_crediario.valor_pendente THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  IF p_metodo NOT IN ('dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'outro') THEN RAISE EXCEPTION 'Método de pagamento inválido'; END IF;

  INSERT INTO pagamentos_crediario (crediario_id, valor, metodo) VALUES (p_crediario_id, p_valor, p_metodo);
  v_novo_pago := v_crediario.valor_pago + p_valor;
  v_novo_pendente := GREATEST(0, v_crediario.valor_total - v_novo_pago);
  UPDATE crediarios SET valor_pago = v_novo_pago, valor_pendente = v_novo_pendente,
    status = CASE WHEN v_novo_pendente <= 0.01 THEN 'quitado' ELSE 'parcial' END
  WHERE id = p_crediario_id;

  IF p_metodo = 'dinheiro' THEN
    SELECT id INTO v_caixa_id FROM caixas
    WHERE empresa_id = p_empresa_id AND usuario_abertura_id = p_usuario_id AND status = 'aberto'
    ORDER BY opened_at DESC LIMIT 1;
    IF v_caixa_id IS NOT NULL THEN
      INSERT INTO movimentacoes_caixa (caixa_id, empresa_id, usuario_id, venda_id, tipo, valor, observacoes)
      VALUES (v_caixa_id, p_empresa_id, p_usuario_id, v_crediario.venda_id, 'venda', p_valor, 'Recebimento de crediário');
    END IF;
  END IF;

  INSERT INTO auditoria (empresa_id, usuario_id, acao, entidade, entidade_id, dados)
  VALUES (p_empresa_id, p_usuario_id, 'pagamento_crediario', 'crediarios', p_crediario_id, jsonb_build_object('valor', p_valor, 'metodo', p_metodo));
END;
$$;

CREATE OR REPLACE FUNCTION movimentar_estoque(
  p_empresa_id UUID,
  p_usuario_id UUID,
  p_produto_id UUID,
  p_tipo VARCHAR,
  p_quantidade NUMERIC,
  p_observacoes TEXT
) RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_produto produtos%ROWTYPE;
  v_role VARCHAR(20);
  v_delta NUMERIC(12,3);
  v_novo_estoque NUMERIC(12,3);
BEGIN
  SELECT role INTO v_role FROM usuarios WHERE id = p_usuario_id AND empresa_id = p_empresa_id AND ativo = true;
  IF v_role NOT IN ('admin', 'gerente') THEN RAISE EXCEPTION 'Sem permissão para movimentar estoque'; END IF;
  IF p_tipo NOT IN ('entrada', 'saida', 'ajuste') OR p_quantidade = 0 THEN RAISE EXCEPTION 'Movimentação inválida'; END IF;
  IF LENGTH(TRIM(COALESCE(p_observacoes, ''))) < 3 THEN RAISE EXCEPTION 'Informe o motivo da movimentação'; END IF;

  SELECT * INTO v_produto FROM produtos WHERE id = p_produto_id AND empresa_id = p_empresa_id AND ativo = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado'; END IF;
  v_delta := CASE WHEN p_tipo = 'entrada' THEN ABS(p_quantidade) WHEN p_tipo = 'saida' THEN -ABS(p_quantidade) ELSE p_quantidade END;
  v_novo_estoque := v_produto.estoque + v_delta;
  IF v_novo_estoque < 0 THEN RAISE EXCEPTION 'A saída deixaria o estoque negativo'; END IF;

  UPDATE produtos SET estoque = v_novo_estoque WHERE id = p_produto_id;
  INSERT INTO movimentacoes_estoque (empresa_id, produto_id, usuario_id, tipo, quantidade, estoque_anterior, estoque_posterior, observacoes)
  VALUES (p_empresa_id, p_produto_id, p_usuario_id, p_tipo, v_delta, v_produto.estoque, v_novo_estoque, TRIM(p_observacoes));
  INSERT INTO auditoria (empresa_id, usuario_id, acao, entidade, entidade_id, dados)
  VALUES (p_empresa_id, p_usuario_id, 'estoque_' || p_tipo, 'produtos', p_produto_id, jsonb_build_object('quantidade', v_delta, 'anterior', v_produto.estoque, 'posterior', v_novo_estoque));
  RETURN v_novo_estoque;
END;
$$;

REVOKE ALL ON FUNCTION finalizar_venda(UUID, UUID, UUID, NUMERIC, JSONB, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION cancelar_venda(UUID, UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION registrar_pagamento_crediario(UUID, UUID, UUID, NUMERIC, VARCHAR) FROM PUBLIC;
REVOKE ALL ON FUNCTION movimentar_estoque(UUID, UUID, UUID, VARCHAR, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finalizar_venda(UUID, UUID, UUID, NUMERIC, JSONB, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION cancelar_venda(UUID, UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION registrar_pagamento_crediario(UUID, UUID, UUID, NUMERIC, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION movimentar_estoque(UUID, UUID, UUID, VARCHAR, NUMERIC, TEXT) TO service_role;

COMMIT;
