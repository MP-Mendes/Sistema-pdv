# Sistema PDV

Sistema de ponto de venda multiempresa, sem emissão fiscal, construído com Next.js, Supabase e Tailwind CSS.

## Principais recursos

- Login exclusivo para contas existentes, sem cadastro público de empresas
- Frente de caixa com leitor de código de barras, carrinho persistente e múltiplos pagamentos
- Venda e baixa de estoque atômicas no banco de dados
- Cancelamento com estorno de estoque, registro do motivo e auditoria
- Abertura, suprimento, sangria e fechamento de caixa
- Produtos, clientes, crediário, equipe e movimentações de estoque
- Relatórios por produto, categoria, operador e forma de pagamento
- Exportação CSV e backup JSON dos dados da empresa
- Etiquetas de 52/88 mm e comprovantes de 58/80 mm para impressoras térmicas
- PWA com aviso de conexão e preservação local do carrinho
- Isolamento de dados por empresa e permissões por função

## Requisitos

- Node.js 20.9 ou superior
- Projeto no Supabase
- Navegador atual (Chrome ou Edge são recomendados para impressão térmica)

## Instalação

```bash
npm install
cp .env.example .env.local
```

Preencha o `.env.local`:

```dotenv
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
JWT_SECRET=uma-chave-aleatoria-com-pelo-menos-32-caracteres
```

`SUPABASE_SERVICE_ROLE_KEY` e `JWT_SECRET` são segredos de servidor. Nunca use esses valores em variáveis iniciadas por `NEXT_PUBLIC_` nem os envie ao repositório. Instalações antigas que já usam `NEXT_PUBLIC_SUPABASE_URL` continuam compatíveis.

No SQL Editor do Supabase, execute as migrations nesta ordem:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_operational_hardening.sql`

Em instalações existentes, execute somente a migration `002` se a `001` já tiver sido aplicada.

Depois, inicie o sistema:

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000). Como o cadastro público foi removido, entre com um usuário que já exista na tabela `usuarios`. Administradores da empresa podem criar e desativar outras contas em **Equipe**.

## Impressão térmica

O sistema abre o diálogo nativo do navegador, sem depender de extensão ou programa local. Para obter o tamanho correto:

1. Instale a impressora normalmente no sistema operacional.
2. Escolha 58 ou 80 mm para comprovantes, ou 52/88 mm para etiquetas, na tela de customização.
3. No diálogo de impressão, selecione a impressora térmica, escala de 100%, margens “Nenhuma” e desative cabeçalhos e rodapés.
4. Para impressão automática sem diálogo, use o modo quiosque do navegador somente em um computador dedicado e administrado.

## Validação

```bash
npm test
npm run lint
npm run build
```

## Publicação na Vercel

1. Importe o repositório na Vercel.
2. Cadastre as três variáveis do `.env.example` nos ambientes desejados.
3. Aplique as migrations no Supabase antes de disponibilizar a nova versão.
4. Faça o deploy.

O backup disponível no sistema exporta apenas os dados da empresa autenticada e não inclui hashes de senha.

## Tecnologias

- Next.js 16 e React 19
- Supabase/PostgreSQL
- Tailwind CSS
- JWT assinado com `jose`
- Recharts, Lucide e react-barcode

## Licença

MIT
