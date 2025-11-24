# Configuração Local - Dashboard Financeiro GRC

## 📝 Passo a Passo para Rodar Localmente

### 1. Clone o Repositório

```bash
git clone https://github.com/matheushsartori/dashboard-financeiro-grc.git
cd dashboard-financeiro-grc
```

### 2. Instale as Dependências

```bash
pnpm install
```

Se não tiver o pnpm instalado:
```bash
npm install -g pnpm
```

### 3. Configure o Banco de Dados

Crie um arquivo `.env` na raiz do projeto com a seguinte configuração:

```env
DATABASE_URL="postgres://9cf28c34e048704614c47f64c97a99624e427315da0314f6c8c6c876281ad906:sk_4lbmojwfHzXxND-NVM5Nv@db.prisma.io:5432/postgres?sslmode=require"
NODE_ENV=development
PORT=3000
JWT_SECRET="seu_jwt_secret_qualquer_string_aleatoria"
```

**Importante:** O arquivo `.env` não está no repositório por segurança. Você precisa criá-lo manualmente.

### 4. Execute as Migrations

```bash
pnpm db:push
```

Este comando irá criar todas as tabelas necessárias no banco de dados PostgreSQL:
- `users` - Usuários do sistema
- `uploads` - Histórico de importações
- `plano_contas` - Plano de contas
- `centros_custo` - Centros de custo
- `fornecedores` - Cadastro de fornecedores
- `contas_a_pagar` - Contas a pagar
- `contas_a_receber` - Contas a receber
- `folha_pagamento` - Folha de pagamento
- `saldos_bancarios` - Saldos bancários

### 5. Inicie o Servidor

```bash
pnpm dev
```

O sistema estará disponível em: **http://localhost:3000**

## 🎯 Testando o Sistema

1. Acesse **http://localhost:3000**
2. Clique em **"Importar Dados"**
3. Faça upload da sua planilha Excel
4. Aguarde o processamento (pode levar alguns minutos para arquivos grandes)
5. Acesse o **Dashboard** para visualizar os dados

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
pnpm dev              # Inicia servidor de desenvolvimento

# Build
pnpm build            # Cria build de produção
pnpm start            # Inicia servidor de produção

# Banco de Dados
pnpm db:push          # Aplica schema no banco
pnpm db:studio        # Abre interface visual do banco (se disponível)

# Testes
pnpm test             # Executa testes unitários
pnpm test:watch       # Executa testes em modo watch
```

## 🐛 Troubleshooting

### Erro: "Cannot connect to database"
- Verifique se a string `DATABASE_URL` no `.env` está correta
- Teste a conexão com o banco usando um cliente PostgreSQL

### Erro: "Port 3000 already in use"
- Altere a porta no arquivo `.env`: `PORT=3001`
- Ou mate o processo que está usando a porta 3000

### Erro ao importar planilha
- Verifique se a planilha tem todas as abas necessárias
- Certifique-se de que o arquivo é .xlsx ou .xls
- Tamanho máximo recomendado: 10MB

### Timeout no upload
- Para arquivos muito grandes, edite `server/upload-endpoint.ts`
- Aumente o limite em `limits.fileSize`

## 📊 Estrutura da Planilha Esperada

O sistema espera uma planilha Excel com as seguintes abas:

1. **PG - GRC** - Plano de contas
2. **CC - GRC** - Centros de custo
3. **Fornecedores** - Cadastro de fornecedores
4. **GERAL A PAGAR** - Contas a pagar
5. **GERAL A RECEBER** - Contas a receber
6. **CONSULTA FOLHA** - Folha de pagamento
7. **DINÂMICA BANCOS** - Saldos bancários

## 🚀 Deploy em Produção

Para fazer deploy em produção (Vercel, Railway, etc.):

1. Configure as variáveis de ambiente no painel do serviço
2. Execute o build: `pnpm build`
3. Inicie o servidor: `pnpm start`

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no GitHub:
https://github.com/matheushsartori/dashboard-financeiro-grc/issues
