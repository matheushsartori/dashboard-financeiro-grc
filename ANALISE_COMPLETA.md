# Análise Completa da Planilha Excel - Dashboard Financeiro GRC

## 📊 Resumo das Abas

| Aba | Registros | Descrição |
|-----|-----------|-----------|
| GERAL A RECEBER | 7.987 | Contas a Receber |
| GERAL A PAGAR | 3.395 | Contas a Pagar |
| PG - GRC | ? | Plano de Contas |
| CC - GRC | ? | Centros de Custo |
| Fornecedores | ? | Cadastro de Fornecedores |
| CONSULTA FOLHA | ? | Folha de Pagamento |
| DINÂMICA BANCOS | ? | Saldos Bancários |

---

## 🔴 PROBLEMAS IDENTIFICADOS

### 1. **Contas a Receber - Campo "Cliente" não aparece**
   - ✅ Coluna existe na planilha: **NOME**
   - ❌ Não está sendo mapeada no schema
   - ❌ Não está sendo exibida na interface

### 2. **Contas a Receber - Campo "Valor Recebido" não aparece**
   - ✅ Coluna existe na planilha: **VPAGO**
   - ❌ Não está sendo mapeada corretamente
   - ❌ Não está sendo exibida na interface

### 3. **Contas a Pagar - Campo "Valor Pago" existe mas pode ter problemas**
   - ✅ Coluna existe na planilha: **VPAGO**
   - ⚠️ Precisa verificar se está sendo exibido corretamente

---

## 📋 ABA: GERAL A RECEBER (Contas a Receber)

### Total: 7.987 registros

### Colunas (25):

| # | Coluna | Tipo | Descrição | Mapeamento Atual | Status |
|---|--------|------|-----------|------------------|--------|
| 1 | CNPJ | String | CNPJ do cliente | - | ❌ Não mapeado |
| 2 | **NOME** | String | **Nome do cliente** | **cliente** | ⚠️ **PROBLEMA** |
| 3 | HISTÓRICO | String | Histórico da transação | historico | ✅ OK |
| 4 | CIDADE | String | Cidade do cliente | - | ❌ Não mapeado |
| 5 | CODCLI | String | Código do cliente | - | ❌ Não mapeado |
| 6 | PREST | String | Prestação | - | ❌ Não mapeado |
| 7 | DUPLIC | String | Duplicata | - | ❌ Não mapeado |
| 8 | **VALOR** | Number | **Valor da receita** | valor | ✅ OK |
| 9 | **VPAGO** | Number | **Valor recebido** | valorRecebido | ⚠️ **PROBLEMA** |
| 10 | DIFVPAGO | Number | Diferença do valor pago | - | ❌ Não mapeado |
| 11 | **DTPAG** | Date | **Data de recebimento** | dataRecebimento | ✅ OK |
| 12 | MÊS | Number | Mês | mes | ✅ OK |
| 13 | **DTVENC** | Date | **Data de vencimento** | dataVencimento | ✅ OK |
| 14 | DTBAIXA | Date | Data de baixa | - | ❌ Não mapeado |
| 15 | DTFECHA | Date | Data de fechamento | - | ❌ Não mapeado |
| 16 | CODCOB | String | Código de cobrança | - | ❌ Não mapeado |
| 17 | **DTEMISSAO** | Date | **Data de emissão/lançamento** | dataLancamento | ✅ OK |
| 18 | OPERACAO | String | Operação | - | ❌ Não mapeado |
| 19 | CODFILIAL | String | Código da filial | - | ❌ Não mapeado |
| 20 | STATUS | String | Status | - | ❌ Não mapeado |
| 21 | CODUSUR | String | Código do usuário | - | ❌ Não mapeado |
| 22 | NUM BANCO | String | Número do banco | numBanco | ✅ OK |
| 23 | DTVENC ORIG | Date | Data de vencimento original | - | ❌ Não mapeado |
| 24 | COD SUPERVISOR | String | Código do supervisor | - | ❌ Não mapeado |
| 25 | NUMTRANS VENDA | String | Número da transação de venda | - | ❌ Não mapeado |

---

## 📋 ABA: GERAL A PAGAR (Contas a Pagar)

### Total: 3.395 registros

### Colunas (36):

| # | Coluna | Tipo | Descrição | Mapeamento Atual | Status |
|---|--------|------|-----------|------------------|--------|
| 1 | CC Síntético | String | Centro de Custo Sintético | ccSintetico | ✅ OK |
| 2 | Descrição CC SIntético | String | Descrição CC Sintético | descricaoCCSintetico | ✅ OK |
| 3 | CC Analítico | String | Centro de Custo Analítico | ccAnalitico | ✅ OK |
| 4 | Descrição CC Analítico | String | Descrição CC Analítico | descricaoCCAnalitico | ✅ OK |
| 5 | Despesa Sintético | String | Despesa Sintético | despesaSintetico | ✅ OK |
| 6 | Descrição Despesa Sintético | String | Descrição Despesa Sintético | descricaoDespesaSintetico | ✅ OK |
| 7 | Despesa Analítico | String | Despesa Analítico | despesaAnalitico | ✅ OK |
| 8 | Descrição Despesa Analítica | String | Descrição Despesa Analítica | descricaoDespesaAnalitica | ✅ OK |
| 9 | FIXO OU VARIAVÉL | Enum | Fixo ou Variável | fixoVariavel | ✅ OK |
| 10 | **DTLANC** | Date | **Data de lançamento** | dataLancamento | ✅ OK |
| 11 | CODCONTA | String | Código da conta | codConta | ✅ OK |
| 12 | CODFORNEC | String | Código do fornecedor | codFornecedor | ✅ OK |
| 13 | **Fornecedor** | String | **Nome do fornecedor** | fornecedor | ✅ OK |
| 14 | HISTORICO | String | Histórico | historico | ✅ OK |
| 15 | BACKUP | String | Backup | - | ❌ Não mapeado |
| 16 | TIPO DE DOCUMENTO | String | Tipo de Documento | tipoDocumento | ✅ OK |
| 17 | NUMNOTA | String | Número da Nota | numNota | ✅ OK |
| 18 | DUPLIC | String | Duplicata | duplicata | ✅ OK |
| 19 | **VALOR** | Number | **Valor da despesa** | valor | ✅ OK |
| 20 | **DTVENC** | Date/String | **Data de vencimento** | dataVencimento | ✅ OK |
| 21 | **VPAGO** | Number | **Valor pago** | valorPago | ✅ OK |
| 22 | **DTPAGTO** | Date/String | **Data de pagamento** | dataPagamento | ✅ OK |
| 23 | MÊS | Number | Mês | mes | ✅ OK |
| 24 | DIFERENÇA (VL PAGO) | Number | Diferença do valor pago | - | ❌ Não mapeado |
| 25 | NUMNOTADEV | String | Número da nota de devolução | - | ❌ Não mapeado |
| 26 | VALORDEV | Number | Valor de devolução | - | ❌ Não mapeado |
| 27 | CODFILIAL | String | Código da filial | - | ❌ Não mapeado |
| 28 | INDICE | String | Índice | - | ❌ Não mapeado |
| 29 | NUMBANCO | String | Número do banco | numBanco | ✅ OK |
| 30 | BANCO | String | Nome do banco | banco | ✅ OK |
| 31 | AGENCIA | String | Agência | agencia | ✅ OK |
| 32 | C/C | String | Conta Corrente | conta | ✅ OK |
| 33 | TIPOLANC | String | Tipo de lançamento | - | ❌ Não mapeado |
| 34 | DTEMISSAO | Date | Data de emissão | - | ❌ Não mapeado |
| 35 | TIPOPARCEIRO | String | Tipo de parceiro | - | ❌ Não mapeado |
| 36 | NUMTRANSENT | String | Número da transação de entrada | - | ❌ Não mapeado |

---

## ✅ CORREÇÕES NECESSÁRIAS

### 1. **Schema do Banco de Dados**
   - ✅ Adicionar campo `cliente` na tabela `contas_a_receber`
   - ✅ Verificar se `valorRecebido` está no schema
   - ✅ Adicionar campos adicionais úteis (CNPJ, CIDADE, etc.)

### 2. **Processamento de Importação (server/routes/upload.ts)**
   - ✅ Mapear coluna **NOME** → `cliente`
   - ✅ Mapear coluna **VPAGO** → `valorRecebido`
   - ✅ Garantir que todos os campos estão sendo processados

### 3. **Interface (client/src/pages/Receitas.tsx)**
   - ✅ Adicionar coluna "Cliente" na tabela
   - ✅ Exibir "Valor Recebido" corretamente
   - ✅ Formatar valores monetários

### 4. **Gráficos Mensais**
   - ✅ Criar componente de gráficos mensais
   - ✅ Mostrar evolução de receitas por mês
   - ✅ Mostrar evolução de despesas por mês
   - ✅ Mostrar comparativo receitas vs despesas

### 5. **Página de DRE**
   - ✅ Criar nova página DRE
   - ✅ Calcular receitas totais
   - ✅ Calcular despesas totais
   - ✅ Calcular lucro/prejuízo
   - ✅ Mostrar por período (mensal/anual)

---

## 🎯 PRÓXIMAS AÇÕES

1. ✅ Atualizar schema do banco de dados
2. ✅ Corrigir processamento de importação
3. ✅ Atualizar interface de Receitas
4. ✅ Adicionar gráficos mensais no Dashboard
5. ✅ Criar página de DRE
6. ✅ Testar com a planilha fornecida
7. ✅ Fazer deploy das alterações
