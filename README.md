# Dashboard Financeiro GRC

Sistema web completo para visualização e análise de dados financeiros com importação automática de planilhas Excel.

## 🚀 Funcionalidades

- **Importação Rápida**: Upload de planilhas Excel com processamento automático de 14 abas
- **Dashboard Interativo**: Visualização de receitas, despesas e folha de pagamento
- **Gráficos Dinâmicos**: Análises por categoria, fornecedor, centro de custo e período
- **Relatórios Detalhados**: Tabelas completas com todos os dados financeiros
- **Histórico de Importações**: Controle de todas as planilhas importadas

## 📋 Pré-requisitos

- Node.js 18+ 
- PostgreSQL 14+
- pnpm (ou npm/yarn)

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone <seu-repositorio>
cd financial_dashboard
```

2. Instale as dependências:
```bash
pnpm install
```

3. Configure as variáveis de ambiente:

Crie um arquivo `.env` na raiz do projeto com:

```env
DATABASE_URL="postgres://user:password@host:5432/database?sslmode=require"
NODE_ENV=development
PORT=3000
JWT_SECRET="seu_jwt_secret_aqui"
```

4. Execute as migrations do banco de dados:
```bash
pnpm db:push
```

5. Inicie o servidor de desenvolvimento:
```bash
pnpm dev
```

O sistema estará disponível em `http://localhost:3000`

## 📊 Estrutura da Planilha Excel

O sistema espera uma planilha Excel com as seguintes abas:

- **PG - GRC**: Plano de contas
- **CC - GRC**: Centros de custo  
- **Fornecedores**: Cadastro de fornecedores
- **GERAL A PAGAR**: Contas a pagar
- **GERAL A RECEBER**: Contas a receber
- **CONSULTA FOLHA**: Folha de pagamento
- **DINÂMICA BANCOS**: Saldos bancários

## 🏗️ Tecnologias Utilizadas

### Backend
- **Node.js** + **Express**: Servidor HTTP
- **tRPC**: API type-safe end-to-end
- **Drizzle ORM**: Gerenciamento de banco de dados
- **PostgreSQL**: Banco de dados relacional
- **xlsx**: Processamento de arquivos Excel
- **multer**: Upload de arquivos

### Frontend
- **React 19**: Framework UI
- **Tailwind CSS 4**: Estilização
- **shadcn/ui**: Componentes de UI
- **Recharts**: Gráficos interativos
- **Wouter**: Roteamento
- **TanStack Query**: Gerenciamento de estado

## 📁 Estrutura do Projeto

```
financial_dashboard/
├── client/              # Frontend React
│   ├── src/
│   │   ├── components/  # Componentes reutilizáveis
│   │   ├── pages/       # Páginas da aplicação
│   │   └── lib/         # Utilitários e configurações
├── server/              # Backend Node.js
│   ├── routers.ts       # Definição de rotas tRPC
│   ├── db.ts            # Queries do banco de dados
│   ├── excel-parser.ts  # Parser de arquivos Excel
│   └── upload-endpoint.ts # Endpoint de upload
├── drizzle/             # Schemas e migrations
└── shared/              # Código compartilhado
```

## 🔐 Segurança

- Autenticação removida para uso interno
- Validação de tipos de arquivo no upload
- Sanitização de dados importados
- Conexão SSL com banco de dados

## 📝 Scripts Disponíveis

- `pnpm dev` - Inicia servidor de desenvolvimento
- `pnpm build` - Build para produção
- `pnpm start` - Inicia servidor de produção
- `pnpm test` - Executa testes
- `pnpm db:push` - Aplica migrations no banco

## 🐛 Troubleshooting

### Erro de conexão com banco de dados
Verifique se a string `DATABASE_URL` está correta e se o PostgreSQL está acessível.

### Erro ao importar planilha
Certifique-se de que a planilha segue o formato esperado com todas as abas necessárias.

### Timeout no upload
Para arquivos muito grandes (>5MB), considere aumentar o limite em `server/upload-endpoint.ts`.

## 📄 Licença

© 2025 Dashboard Financeiro GRC. Todos os direitos reservados.
