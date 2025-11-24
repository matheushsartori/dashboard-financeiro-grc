# Dashboard Financeiro GRC - TODO

## Fase 1: Estrutura de Dados e Backend
- [x] Criar schema do banco de dados para armazenar dados importados
- [x] Implementar tabela de uploads (histórico de importações)
- [x] Implementar tabela de contas_a_pagar
- [x] Implementar tabela de contas_a_receber
- [x] Implementar tabela de folha_pagamento
- [x] Implementar tabela de saldos_bancarios
- [x] Implementar tabela de plano_contas
- [x] Implementar tabela de centros_custo
- [x] Implementar tabela de fornecedores

## Fase 2: Funcionalidade de Importação
- [x] Criar procedimento tRPC para upload de arquivo Excel
- [x] Implementar parser de arquivo Excel (múltiplas abas)
- [x] Implementar validação de estrutura de dados
- [x] Implementar lógica de inserção no banco de dados
- [x] Criar interface de upload de arquivo
- [x] Adicionar feedback de progresso de importação
- [x] Implementar tratamento de erros de importação

## Fase 3: Dashboard Principal
- [x] Criar layout do dashboard com DashboardLayout
- [x] Implementar card de resumo financeiro (receitas vs despesas)
- [x] Implementar card de saldo bancário consolidado
- [x] Implementar card de lucro/prejuízo do período
- [ ] Adicionar filtro de período (mês, trimestre, ano)
- [x] Criar gráfico de evolução mensal (receitas vs despesas)

## Fase 4: Visualização de Contas a Pagar
- [x] Criar página de Contas a Pagar
- [x] Implementar resumo: total a pagar vs pago
- [x] Criar gráfico de pizza: despesas por categoria
- [x] Criar gráfico de barras: top 10 fornecedores
- [x] Criar gráfico de barras: despesas por centro de custo
- [ ] Criar timeline de pagamentos (gráfico de linha)
- [x] Implementar tabela detalhada com paginação
- [ ] Adicionar filtros: período, fornecedor, centro de custo, tipo

## Fase 5: Visualização de Contas a Receber
- [x] Criar página de Contas a Receber
- [x] Implementar resumo: total a receber vs recebido
- [ ] Criar gráfico de pizza: receitas por categoria
- [x] Criar gráfico de barras: top 10 clientes
- [ ] Criar timeline de recebimentos (gráfico de linha)
- [x] Implementar tabela detalhada com paginação
- [ ] Adicionar filtros: período, cliente, tipo

## Fase 6: Visualização de Folha de Pagamento
- [x] Criar página de Folha de Pagamento
- [x] Implementar resumo: custo total da folha
- [x] Criar gráfico de pizza: custo por área
- [x] Criar gráfico de barras: custo por funcionário
- [ ] Criar gráfico de linha: evolução mensal da folha
- [x] Implementar tabela detalhada por funcionário
- [ ] Adicionar filtros: período, área, funcionário

## Fase 7: Análise Bancária
- [ ] Criar página de Análise Bancária
- [ ] Implementar cards de saldo por banco
- [ ] Criar gráfico de pizza: distribuição de saldos
- [ ] Criar gráfico de linha: evolução de saldos
- [ ] Implementar tabela de movimentações consolidadas

## Fase 8: Testes e Validação
- [x] Escrever testes unitários para procedimentos tRPC
- [ ] Testar importação de arquivo Excel completo
- [ ] Validar cálculos e agregações
- [ ] Testar filtros e navegação
- [ ] Verificar responsividade em diferentes dispositivos

## Fase 9: Melhorias e Sugestões
- [ ] Documentar sugestões de melhoria para o processo financeiro
- [ ] Implementar exportação de dados filtrados
- [ ] Adicionar comparação entre períodos
- [ ] Criar alertas para vencimentos próximos
- [ ] Implementar previsão de fluxo de caixa


## Itens Concluídos na Implementação Atual

- [x] Schema do banco de dados criado com 9 tabelas
- [x] Parser de Excel implementado para todas as abas
- [x] API tRPC completa com endpoints de upload e consultas
- [x] Página de importação com drag-and-drop
- [x] Página Home com design moderno
- [x] Layout do dashboard implementado
- [x] Página Dashboard com resumos e gráficos
- [x] Página Receitas com análise de clientes
- [x] Página Despesas com análise de fornecedores
- [x] Página Folha de Pagamento com análise por área


## Correções e Melhorias Solicitadas

### Importação de Arquivos
- [ ] Testar importação com arquivo Excel real da empresa
- [ ] Corrigir timeout no upload de arquivos grandes
- [ ] Implementar lógica para lidar com importações semanais sem duplicação
- [ ] Adicionar opção de substituir dados ou manter histórico
- [ ] Melhorar feedback visual durante processamento de arquivo grande
- [ ] Validar que múltiplas importações funcionam corretamente


### Correções de UI e Autenticação
- [x] Corrigir nomes do menu lateral (Dashboard, Receitas, Despesas, Folha, Importação)
- [x] Remover autenticação Manus e implementar acesso direto
- [x] Remover "Made with Manus" do rodapé
- [x] Ajustar ícones do menu para corresponder às funcionalidades


### Deploy e Banco de Dados
- [x] Atualizar DATABASE_URL para o PostgreSQL fornecido
- [x] Aplicar migrations no novo banco de dados
- [x] Fazer commit das alterações
- [x] Push para o GitHub
- [x] Validar conexão com o banco de dados
