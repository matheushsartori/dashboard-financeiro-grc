# Dashboard Financeiro GRC

Sistema web completo para visualização e análise de dados financeiros com importação automática de planilhas Excel.

## 🚀 Funcionalidades

- **Importação Automática**: Upload de planilhas Excel (14 abas) com processamento automático
- **Dashboard Interativo**: Visualização de receitas, despesas e folha de pagamento
- **Gráficos Dinâmicos**: Gráficos de pizza, barras e resumos financeiros
- **Análise Detalhada**: Tabelas com paginação e filtros
- **Banco PostgreSQL**: Armazenamento seguro e escalável

## 📋 Pré-requisitos

- Node.js 18+ 
- pnpm
- PostgreSQL (ou Prisma PostgreSQL)

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/matheushsartori/dashboard-financeiro-grc.git
cd dashboard-financeiro-grc
```

2. Instale as dependências:
```bash
pnpm install
```

3. Configure as variáveis de ambiente:

Crie um arquivo `.env` na raiz do projeto:

```env
# Banco de Dados PostgreSQL
DATABASE_URL="postgres://user:password@host:5432/database?sslmode=require"

# Configurações do Servidor
NODE_ENV=development
PORT=3000
JWT_SECRET="sua_chave_secreta_aqui"
```

4. Execute as migrations:

**Opção 1 - Script manual (recomendado):**
```bash
node apply-migrations-pg.mjs
```

**Opção 2 - Comando padrão (pode falhar em alguns ambientes):**
```bash
pnpm db:push
```

5. Inicie o servidor de desenvolvimento:
```bash
pnpm dev
```

6. Acesse o sistema:
```
http://localhost:3000
```

## 📊 Estrutura do Banco de Dados

O sistema cria automaticamente 9 tabelas PostgreSQL:

- `users` - Usuários do sistema
- `uploads` - Histórico de importações
- `plano_contas` - Plano de contas
- `centros_custo` - Centros de custo
- `fornecedores` - Cadastro de fornecedores
- `contas_a_pagar` - Contas a pagar
- `contas_a_receber` - Contas a receber
- `folha_pagamento` - Folha de pagamento
- `saldos_bancarios` - Saldos bancários

## 📁 Estrutura do Projeto

```
├── client/                 # Frontend React
│   ├── src/
│   │   ├── pages/         # Páginas do sistema
│   │   ├── components/    # Componentes reutilizáveis
│   │   └── lib/           # Configurações (tRPC)
├── server/                # Backend Node.js
│   ├── routers.ts         # Rotas tRPC
│   ├── db.ts              # Conexão com banco
│   ├── db-financial.ts    # Queries financeiras
│   └── excel-parser.ts    # Parser de Excel
├── drizzle/               # Schema e migrations
│   └── schema.ts          # Definição das tabelas (PostgreSQL)
└── apply-migrations-pg.mjs # Script de migration manual
```

## 🎯 Como Usar

### 1. Importar Planilha

1. Acesse a página "Importar Dados"
2. Faça upload do arquivo Excel (.xlsx)
3. Aguarde o processamento automático
4. Os dados aparecerão nos dashboards

### 2. Visualizar Dados

- **Dashboard**: Visão geral com resumos e gráficos
- **Receitas**: Análise detalhada de contas a receber
- **Despesas**: Análise detalhada de contas a pagar
- **Folha de Pagamento**: Custos por área e funcionário

## 🛠️ Tecnologias

- **Frontend**: React 19, TailwindCSS 4, Recharts, shadcn/ui
- **Backend**: Node.js, Express, tRPC 11
- **Banco de Dados**: PostgreSQL, Drizzle ORM
- **Processamento**: xlsx (leitura de Excel)

## 📝 Scripts Disponíveis

```bash
# Desenvolvimento
pnpm dev              # Inicia servidor de desenvolvimento

# Banco de Dados
pnpm db:push          # Aplica migrations (pode falhar em alguns ambientes)
node apply-migrations-pg.mjs  # Aplica migrations manualmente (recomendado)

# Testes
pnpm test             # Executa testes unitários

# Build
pnpm build            # Gera build de produção
```

## 🔒 Segurança

- Conexões SSL/TLS com banco de dados PostgreSQL
- Validação de dados no backend
- Sanitização de inputs
- Sem autenticação externa (sistema interno)

## 🐛 Troubleshooting

### Erro de conexão SSL
Se encontrar erro de SSL ao rodar migrations, use o script manual:
```bash
node apply-migrations-pg.mjs
```

### Timeout no upload
Para arquivos grandes (>3MB), o processamento pode demorar. Aguarde a conclusão.

### Erro "already exists"
Se as tabelas já existirem, o script de migration irá ignorar automaticamente.

## 📄 Licença

© 2025 Dashboard Financeiro GRC. Todos os direitos reservados.

## 🤝 Suporte

Para dúvidas ou problemas, abra uma issue no GitHub:
https://github.com/matheushsartori/dashboard-financeiro-grc/issues
