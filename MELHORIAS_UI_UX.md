# 🎨 Plano de Melhorias UI/UX - Dashboard Financeiro GRC

## 📋 Status Geral
- **Criado em**: 2026-02-10
- **Objetivo**: Modernizar interface, melhorar responsividade e experiência do usuário

---

## ✅ Tarefas Concluídas

### Funcionalidades Implementadas
- [x] Filtro de filial na Folha de Pagamento
- [x] Gráfico de Receitas por Filial
- [x] Melhorias visuais nos gráficos (formatação compacta, sem sobreposição)
- [x] Excluir importação individual
- [x] Baixar planilha original
- [x] Filtro de filial no Dashboard e Despesas

---

## 🎯 Tarefas Prioritárias - UI/UX

### 1. Menu de Navegação
- [ ] **Redesenhar menu lateral/superior**
  - [ ] Adicionar ícones ilustrativos para cada seção
  - [ ] Melhorar hierarquia visual
  - [ ] Adicionar indicador de página ativa
  - [ ] Tornar responsivo (colapsar em mobile)
  - [ ] Adicionar logo/branding

- [ ] **Adicionar Dark/Light Theme**
  - [ ] Toggle de tema no header
  - [ ] Persistir preferência no localStorage
  - [ ] Ajustar cores de todos os componentes
  - [ ] Garantir contraste adequado

### 2. Responsividade
- [ ] **Mobile (< 768px)**
  - [ ] Menu hamburguer
  - [ ] Cards empilhados verticalmente
  - [ ] Gráficos adaptáveis
  - [ ] Tabelas com scroll horizontal
  - [ ] Filtros em dropdown/modal

- [ ] **Tablet (768px - 1024px)**
  - [ ] Layout de 2 colunas
  - [ ] Menu lateral colapsável
  - [ ] Gráficos otimizados

- [ ] **Desktop (> 1024px)**
  - [ ] Layout completo
  - [ ] Sidebar fixa
  - [ ] Múltiplas colunas

### 3. Ícones e Ilustrações
- [ ] **Dashboard**
  - [ ] Ícones nos cards de resumo
  - [ ] Ícones nos títulos de seções
  - [ ] Estados vazios ilustrados

- [ ] **Despesas**
  - [ ] Ícones por categoria
  - [ ] Ícones de status (pago/pendente)
  - [ ] Badges visuais

- [ ] **Receitas**
  - [ ] Ícones de clientes
  - [ ] Indicadores visuais de status
  - [ ] Badges de categorias

- [ ] **Folha de Pagamento**
  - [ ] Ícones por tipo (CLT/PJ)
  - [ ] Ícones de categorias (salário, comissão, etc)
  - [ ] Indicadores visuais

- [ ] **Importação**
  - [ ] Ícones de status de upload
  - [ ] Ilustração de drag & drop
  - [ ] Feedback visual melhorado

### 4. Melhorias de UX
- [ ] **Feedback Visual**
  - [ ] Loading states consistentes
  - [ ] Skeleton loaders
  - [ ] Toasts informativos
  - [ ] Confirmações visuais

- [ ] **Navegação**
  - [ ] Breadcrumbs
  - [ ] Botões de ação rápida
  - [ ] Atalhos de teclado
  - [ ] Busca global

- [ ] **Filtros**
  - [ ] Design consistente
  - [ ] Indicadores visuais de filtros ativos
  - [ ] Limpar filtros facilmente
  - [ ] Salvar filtros favoritos

- [ ] **Tabelas**
  - [ ] Ordenação visual clara
  - [ ] Paginação melhorada
  - [ ] Ações inline
  - [ ] Seleção múltipla

### 5. Design System
- [ ] **Cores**
  - [ ] Paleta de cores consistente
  - [ ] Cores semânticas (sucesso, erro, aviso)
  - [ ] Gradientes modernos
  - [ ] Modo escuro

- [ ] **Tipografia**
  - [ ] Hierarquia clara
  - [ ] Tamanhos consistentes
  - [ ] Espaçamento adequado
  - [ ] Fontes legíveis

- [ ] **Espaçamento**
  - [ ] Grid system consistente
  - [ ] Padding/margin padronizados
  - [ ] Whitespace adequado
  - [ ] Densidade visual balanceada

- [ ] **Componentes**
  - [ ] Botões consistentes
  - [ ] Cards padronizados
  - [ ] Inputs uniformes
  - [ ] Badges e tags

---

## 🚀 Ordem de Execução

### Fase 1: Fundação (Prioridade ALTA)
1. Criar/atualizar Design System base
2. Implementar Dark/Light Theme
3. Redesenhar menu de navegação
4. Adicionar ícones principais

### Fase 2: Responsividade (Prioridade ALTA)
1. Mobile-first layout
2. Breakpoints e media queries
3. Menu responsivo
4. Componentes adaptáveis

### Fase 3: Melhorias Visuais (Prioridade MÉDIA)
1. Ícones em todas as páginas
2. Estados vazios ilustrados
3. Loading states
4. Animações sutis

### Fase 4: UX Avançado (Prioridade MÉDIA)
1. Breadcrumbs
2. Busca global
3. Atalhos de teclado
4. Filtros salvos

---

## 📝 Notas de Implementação

### Tecnologias a Usar
- **Ícones**: Lucide React (já instalado)
- **Tema**: CSS Variables + localStorage
- **Responsividade**: Tailwind CSS breakpoints
- **Animações**: Tailwind CSS animations + Framer Motion (se necessário)

### Padrões de Design
- Material Design 3 (inspiração)
- Shadcn/ui components (já em uso)
- Cores vibrantes mas profissionais
- Micro-interações sutis

### Acessibilidade
- Contraste WCAG AA mínimo
- Navegação por teclado
- ARIA labels
- Focus states visíveis

---

## 🎨 Paleta de Cores Proposta

### Light Mode
- **Primary**: `#3b82f6` (Blue)
- **Success**: `#10b981` (Green)
- **Warning**: `#f59e0b` (Amber)
- **Danger**: `#ef4444` (Red)
- **Background**: `#ffffff`
- **Surface**: `#f9fafb`
- **Text**: `#111827`

### Dark Mode
- **Primary**: `#60a5fa` (Blue Light)
- **Success**: `#34d399` (Green Light)
- **Warning**: `#fbbf24` (Amber Light)
- **Danger**: `#f87171` (Red Light)
- **Background**: `#0f172a`
- **Surface**: `#1e293b`
- **Text**: `#f1f5f9`

---

## ✨ Próximos Passos Imediatos

1. ✅ Criar este arquivo de planejamento
2. 🔄 Implementar Dark/Light Theme
3. 🔄 Redesenhar menu de navegação
4. 🔄 Adicionar ícones nas páginas principais
5. 🔄 Melhorar responsividade mobile

---

**Última atualização**: 2026-02-10 20:10
