# Sistema PDV

Sistema de Ponto de Venda (PDV) completo, sem emissão fiscal, construído com Next.js, Supabase e Tailwind CSS.

## Funcionalidades

- **Dashboard** - Visão geral com vendas do dia, produtos, clientes, crediário e gráfico semanal
- **Vendas** - Frente de caixa com busca de produtos, carrinho, múltiplas formas de pagamento
- **Produtos** - CRUD completo com código, estoque, preço e categoria
- **Clientes** - Cadastro com CPF/CNPJ, telefone, observações e limite de crédito
- **Histórico** - Consulta de vendas com filtros por período e faturamento
- **Crediário** - Controle de crediário/carnê com registro de pagamentos
- **Etiquetas** - Impressão de etiquetas de preço (88mm e 52mm) com código de barras
- **Customização** - Personalização de etiquetas e comprovantes não fiscais
- **Multi-empresa** - Cada empresa tem seus próprios dados isolados
- **Painel Admin** - Administração central para o desenvolvedor

## Tecnologias

- **Frontend:** Next.js 14, React 18, Tailwind CSS
- **Backend:** Next.js API Routes + Supabase
- **Banco de Dados:** PostgreSQL (Supabase)
- **Autenticação:** JWT com jose
- **Gráficos:** Recharts
- **Ícones:** Lucide React
- **Código de Barras:** react-barcode
- **Deploy:** Vercel

## Instalação

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd sistema-pdv
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Execute o SQL de migration localizado em `supabase/migrations/001_initial_schema.sql` no SQL Editor do Supabase
3. Copie a URL e a chave anon do seu projeto

### 4. Configure as variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite o `.env.local` com suas credenciais do Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
JWT_SECRET=sua-chave-secreta
```

### 5. Execute o projeto

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## Deploy na Vercel

1. Faça push do código para um repositório Git
2. Importe o projeto na [Vercel](https://vercel.com)
3. Adicione as variáveis de ambiente (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `JWT_SECRET`)
4. Deploy automático!

## Estrutura do Projeto

```
sistema-pdv/
├── src/
│   ├── app/
│   │   ├── api/           # API Routes (auth)
│   │   ├── dashboard/     # Dashboard principal
│   │   ├── vendas/        # Frente de caixa
│   │   ├── produtos/      # Catálogo de produtos
│   │   ├── clientes/      # Gestão de clientes
│   │   ├── historico/     # Histórico de vendas
│   │   ├── crediario/     # Controle de crediário
│   │   ├── etiquetas/     # Impressão de etiquetas
│   │   ├── customizacao/  # Customização
│   │   ├── admin/         # Painel admin
│   │   └── login/         # Página de login
│   ├── components/        # Componentes reutilizáveis
│   ├── lib/               # Utilitários e config
│   └── store/             # Zustand stores
├── supabase/
│   └── migrations/        # Migrations do banco
└── ...
```

## Licença

MIT