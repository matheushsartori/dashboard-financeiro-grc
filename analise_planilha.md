# Análise Detalhada da Planilha Financeira GRC

## Estrutura da Planilha

A planilha contém **14 abas** com dados financeiros completos:

### 1. **PG - GRC** (191 linhas × 2 colunas)
Plano de contas gerencial com códigos e descrições de contas contábeis.
- Estrutura: `Conta` (código numérico) e `Descrição`
- Categorias principais:
  - **100**: Pagamentos associados ao CMV (Custo de Mercadoria Vendida)
  - **200**: Outras receitas
  - **500**: Despesas com recursos humanos
  - **600**: Saídas financeiras
  - **700**: Despesas administrativas
  - **800**: Despesas comerciais

### 2. **CC - GRC** (19 linhas × 2 colunas)
Centros de custo da empresa.
- Estrutura: `Código` e `Descrição`
- Centros principais:
  - **1**: Diretoria executiva e conselho
  - **2**: Administrativo e controladoria
  - **3**: Comercial
  - **4**: Marketing
  - **5**: Logística e estoque
  - **6**: Assistência técnica e regulatório

### 3. **Fornecedores** (207 linhas × 2 colunas)
Cadastro de fornecedores.
- Estrutura: `Cód. Fornecedor` e `Nome do Fornecedor`
- Inclui bancos, fornecedores de produtos/serviços e funcionários

### 4. **CONSULTA FOLHA** (39 linhas × 13 colunas)
Folha de pagamento detalhada por funcionário e mês.
- Colunas: `ÁREA`, `CC`, `NOME`, meses (1-8), `TOTAL`
- Tipos de pagamento: Salário, Premiação, Comissão, Retirada
- **Total geral da folha**: Aproximadamente R$ 460.823,38 (8 meses)

### 5. **DINÂMICA BANCOS** (23 linhas × 10 colunas)
Resumo de saldos bancários e movimentações.
- Múltiplas contas bancárias:
  - Banco do Brasil PJ
  - Itaú (PF e PJ)
  - Sicoob (PF e PJ)
- **Total em bancos**: R$ 2.452.860,57
- Controle de recebimentos GRC e BH por mês

### 6. **GERAL A PAGAR** (3.395 linhas × 36 colunas) ⭐ PRINCIPAL
Registro completo de contas a pagar.
- Colunas principais:
  - Centros de custo (sintético e analítico)
  - Despesas (sintético e analítico)
  - Tipo: FIXO ou VARIÁVEL
  - Datas: lançamento, vencimento, pagamento
  - Valores: original e pago
  - Fornecedor, histórico, nota fiscal
  - Banco e conta utilizados

### 7. **Planilha1** (3.394 linhas × 36 colunas)
Aparentemente duplicata ou backup de "GERAL A PAGAR"

### 8. **Análise PAGO** (88 linhas × 49 colunas)
Análise consolidada de pagamentos realizados.

### 9. **GERAL A RECEBER** (7.987 linhas × 25 colunas) ⭐ PRINCIPAL
Registro completo de contas a receber.
- Estrutura similar a "GERAL A PAGAR"
- Colunas principais:
  - Cliente
  - Valores: original e recebido
  - Datas: lançamento, vencimento, recebimento
  - Nota fiscal, histórico

### 10. **Análise RECEITAS** (13 linhas × 12 colunas)
Análise consolidada de receitas.

### 11. **LUCRO** (3 linhas × 11 colunas)
Resumo de lucro/resultado por período.

### 12. **Relatório** (2.406 linhas × 14 colunas)
Relatório consolidado de movimentações.

### 13. **Plan1** (657 linhas × 79 colunas)
Dados adicionais (estrutura não analisada em detalhe).

### 14. **Plan2** (5 linhas × 1 coluna)
Dados mínimos.

## Principais Insights

### Dados Financeiros
- **Contas a Pagar**: 3.395 registros de despesas
- **Contas a Receber**: 7.987 registros de receitas
- **Folha de Pagamento**: ~R$ 460k (8 meses)
- **Saldo Bancário Total**: ~R$ 2,45 milhões

### Estrutura Organizacional
- 6 centros de custo principais
- 207 fornecedores cadastrados
- Múltiplas contas bancárias (Banco do Brasil, Itaú, Sicoob)

### Categorias de Despesas
- Recursos humanos (salários, premiações, comissões)
- Tarifas bancárias
- Compra de mercadorias
- Despesas administrativas e comerciais

## Funcionalidades Necessárias para o Sistema

### 1. Importação de Dados
- Upload de arquivo Excel (.xlsx)
- Parsing de múltiplas abas
- Validação de estrutura de dados
- Mapeamento de colunas

### 2. Visualizações e Gráficos
- **Dashboard Principal**:
  - Resumo financeiro (receitas vs despesas)
  - Saldo bancário consolidado
  - Lucro/prejuízo do período
  
- **Contas a Pagar**:
  - Total a pagar vs pago
  - Top fornecedores
  - Despesas por centro de custo
  - Despesas por categoria
  - Timeline de pagamentos
  
- **Contas a Receber**:
  - Total a receber vs recebido
  - Top clientes
  - Timeline de recebimentos
  
- **Folha de Pagamento**:
  - Custo por área
  - Custo por funcionário
  - Evolução mensal
  
- **Análise Bancária**:
  - Saldos por banco
  - Movimentações consolidadas

### 3. Filtros e Análises
- Filtro por período (mês, trimestre, ano)
- Filtro por centro de custo
- Filtro por fornecedor/cliente
- Filtro por tipo de despesa/receita
- Comparação entre períodos

### 4. Exportação e Relatórios
- Exportação de dados filtrados
- Geração de relatórios PDF
- Dashboards interativos
