# Análise da Planilha Excel - Dashboard Financeiro GRC

## Abas Identificadas

1. **PG - GRC** - Plano de Contas
2. **CC - GRC** - Centros de Custo
3. **Fornecedores** - Cadastro de Fornecedores
4. **CONSULTA FOLHA** - Folha de Pagamento
5. **DINÂMICA BANCOS** - Saldos Bancários
6. **GERAL A PAGAR** - Contas a Pagar
7. **GERAL A RECEBER** - Contas a Receber
8. **Análise PAGO** - Análises
9. **Análise RECEITAS** - Análises
10. **LUCRO** - DRE/Lucro
11. **Relatório** - Relatórios

## Aba: GERAL A RECEBER (Contas a Receber)

### Total de Registros: 7.987 linhas

### Colunas (25):
1. **CNPJ** - CNPJ do cliente
2. **NOME** - Nome do cliente ⚠️ **PROBLEMA IDENTIFICADO: não está sendo exibido**
3. **HISTÓRICO** - Histórico da transação
4. **CIDADE** - Cidade do cliente
5. **CODCLI** - Código do cliente
6. **PREST** - Prestação
7. **DUPLIC** - Duplicata
8. **VALOR** - Valor da receita
9. **VPAGO** - Valor pago/recebido ⚠️ **PROBLEMA IDENTIFICADO: não está sendo exibido**
10. **DIFVPAGO** - Diferença do valor pago
11. **DTPAG** - Data de pagamento/recebimento
12. **MÊS** - Mês
13. **DTVENC** - Data de vencimento
14. **DTBAIXA** - Data de baixa
15. **DTFECHA** - Data de fechamento
16. **CODCOB** - Código de cobrança
17. **DTEMISSAO** - Data de emissão
18. **OPERACAO** - Operação
19. **CODFILIAL** - Código da filial
20. **STATUS** - Status
21. **CODUSUR** - Código do usuário
22. **NUM BANCO** - Número do banco
23. **DTVENC ORIG** - Data de vencimento original
24. **COD SUPERVISOR** - Código do supervisor
25. **NUMTRANS VENDA** - Número da transação de venda

## Problemas Identificados

### 1. Campo "Cliente" não aparece
- A coluna **NOME** existe na planilha mas não está sendo mapeada corretamente
- Precisa ajustar o schema do banco e o processamento de importação

### 2. Campo "Valor Recebido" não aparece
- A coluna **VPAGO** existe na planilha mas não está sendo mapeada
- Precisa adicionar ao schema e exibição

### 3. Data de Lançamento
- Precisa mapear **DTEMISSAO** como data de lançamento

## Próximos Passos

1. ✅ Analisar aba GERAL A PAGAR
2. ✅ Analisar aba CONSULTA FOLHA  
3. ✅ Analisar aba DINÂMICA BANCOS
4. ✅ Corrigir schema do banco de dados
5. ✅ Corrigir processamento de importação
6. ✅ Adicionar gráficos mensais
7. ✅ Implementar página de DRE
