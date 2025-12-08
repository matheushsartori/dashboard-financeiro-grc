import { useMemo, useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, DollarSign, Users, Building2, Loader2, TrendingUp, TrendingDown, XCircle } from "lucide-react";
// DashboardLayout removido - agora é gerenciado pelo App.tsx
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Legend } from "recharts";
import { MonthFilter } from "@/components/MonthFilter";
import { RealizadoProjetadoFilter, TipoVisualizacao } from "@/components/RealizadoProjetadoFilter";
import { FilialFilter, TipoEscopoFilial, getCodFilialFilter } from "@/components/FilialFilter";
import { SERIES_COLORS } from "@/lib/chartColors";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/Skeleton";

function formatCurrency(cents: number | null | undefined): string {
  if (!cents || cents === 0) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const uploadId = searchParams.get("uploadId");
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [tipoVisualizacao, setTipoVisualizacao] = useState<TipoVisualizacao>("realizado");
  
  // Buscar filial selecionada do localStorage
  const [escopoFilial, setEscopoFilial] = useState<TipoEscopoFilial>(() => {
    const saved = localStorage.getItem("selectedFilial");
    return saved || "consolidado";
  });

  const { data: uploads, isLoading: loadingUploads } = trpc.financial.listUploads.useQuery(undefined, {
    refetchInterval: (query) => {
      // Se houver upload com status "processing", refetch a cada 3 segundos
      const hasProcessing = query.state.data?.some((u: any) => u.status === "processing");
      return hasProcessing ? 3000 : false;
    },
  });
  
  const latestUpload = useMemo(() => {
    if (uploadId) return parseInt(uploadId);
    if (uploads && uploads.length > 0) return uploads[0].id;
    return null;
  }, [uploadId, uploads]);

  // Verificar status do upload atual
  const currentUpload = useMemo(() => {
    if (!latestUpload || !uploads) return null;
    return uploads.find(u => u.id === latestUpload);
  }, [latestUpload, uploads]);

  // Buscar filiais disponíveis para o filtro dinâmico
  const { data: filiaisDisponiveis } = trpc.financial.getFiliaisDisponiveis.useQuery(
    { uploadId: latestUpload! },
    { enabled: !!latestUpload }
  );

  // Utils do tRPC para invalidar queries
  const utils = trpc.useUtils();

  // Converter escopo de filial para array de códigos
  const codFilialFilter = useMemo(() => 
    getCodFilialFilter(escopoFilial, filiaisDisponiveis), 
    [escopoFilial, filiaisDisponiveis]
  );

  // Atualizar escopo quando mudar no localStorage (de outros componentes ou header)
  useEffect(() => {
    const handleFilialChanged = () => {
      const saved = localStorage.getItem("selectedFilial");
      if (saved && saved !== escopoFilial) {
        setEscopoFilial(saved);
        // Invalidar queries para forçar refetch com nova filial
        utils.invalidate();
      }
    };

    window.addEventListener("filialChanged", handleFilialChanged);
    window.addEventListener("storage", handleFilialChanged);
    
    return () => {
      window.removeEventListener("filialChanged", handleFilialChanged);
      window.removeEventListener("storage", handleFilialChanged);
    };
  }, [escopoFilial, utils]);

  // Handler para mudança de filial (usado apenas no filtro dentro do dashboard)
  const handleFilialChange = (value: TipoEscopoFilial) => {
    localStorage.setItem("selectedFilial", value);
    setEscopoFilial(value);
    // Disparar evento para atualizar header
    window.dispatchEvent(new Event("filialChanged"));
    // Invalidar queries para forçar refetch imediato com nova filial
    utils.invalidate();
  };

  // Priorizar: carregar summary primeiro (dados essenciais)
  const { data: summary, isLoading: loadingSummary } = trpc.financial.getDashboardSummary.useQuery(
    { uploadId: latestUpload!, tipoVisualizacao, codFilial: codFilialFilter },
    { 
      enabled: !!latestUpload,
      staleTime: 2 * 60 * 1000, // 2 minutos para dados críticos
    }
  );

  // Carregar dados secundários em paralelo (mas só após summary estar disponível)
  const { data: contasPagarData, isLoading: loadingContasPagar } = trpc.financial.getContasAPagarSummary.useQuery(
    { uploadId: latestUpload!, tipoVisualizacao, codFilial: codFilialFilter },
    { 
      enabled: !!latestUpload && !!summary, // Só carrega após summary estar pronto
      staleTime: 3 * 60 * 1000,
    }
  );

  const { data: contasReceberData, isLoading: loadingContasReceber } = trpc.financial.getContasAReceberSummary.useQuery(
    { uploadId: latestUpload!, tipoVisualizacao, codFilial: codFilialFilter },
    { 
      enabled: !!latestUpload && !!summary, // Só carrega após summary estar pronto
      staleTime: 3 * 60 * 1000,
    }
  );

  const { data: dadosMensais, isLoading: loadingDadosMensais } = trpc.financial.getDadosMensais.useQuery(
    { uploadId: latestUpload!, codFilial: codFilialFilter },
    { 
      enabled: !!latestUpload && !!summary, // Só carrega após summary estar pronto
      staleTime: 5 * 60 * 1000, // Dados mensais mudam menos, cache maior
    }
  );

  // Combinar todos os estados de loading
  const isLoading = loadingUploads || (!!latestUpload && (loadingSummary || loadingContasPagar || loadingContasReceber || loadingDadosMensais));

  // Filtrar dados mensais se mês selecionado
  const filteredDadosMensais = useMemo(() => {
    if (!dadosMensais) return [];
    if (!selectedMonth) return dadosMensais;
    return dadosMensais.filter(d => d.mes === selectedMonth);
  }, [dadosMensais, selectedMonth]);

  // Verificar se há filial selecionada - se não houver, redirecionar para seleção
  useEffect(() => {
    const selectedFilial = localStorage.getItem("selectedFilial");
    if (!selectedFilial && latestUpload) {
      // Se não houver filial selecionada e houver upload, redirecionar para seleção
      const params = new URLSearchParams();
      if (uploadId) params.set("uploadId", uploadId);
      setLocation(`/selecao-filial?${params.toString()}`);
    }
  }, [latestUpload, uploadId, setLocation]);

  if (!latestUpload) {
    return (
      <div className="container max-w-7xl py-8">
        <div className="text-center py-12">
          <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-2xl font-bold mb-2">Nenhum dado importado</h2>
          <p className="text-muted-foreground mb-6">
            Faça o upload de uma planilha Excel para visualizar seus dados financeiros.
          </p>
          <a
            href="/importacao"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Importar Dados
          </a>
        </div>
      </div>
    );
  }

  // Mostrar mensagem de processamento se o upload estiver sendo processado
  if (currentUpload?.status === "processing") {
    return (
      <div className="container max-w-7xl py-8">
        <div className="text-center py-12">
          <Loader2 className="h-16 w-16 mx-auto mb-4 text-primary animate-spin" />
          <h2 className="text-2xl font-bold mb-2">Processando planilha...</h2>
          <p className="text-muted-foreground mb-4">
            A planilha <strong>{currentUpload.fileName}</strong> está sendo processada.
          </p>
          <p className="text-sm text-muted-foreground">
            Isso pode levar alguns minutos para arquivos grandes. Os dados aparecerão automaticamente quando o processamento for concluído.
          </p>
        </div>
      </div>
    );
  }

  // Mostrar erro se o upload falhou
  if (currentUpload?.status === "failed") {
    return (
      <div className="container max-w-7xl py-8">
        <div className="text-center py-12">
          <XCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-2">Erro ao processar planilha</h2>
          <p className="text-muted-foreground mb-4">
            A planilha <strong>{currentUpload.fileName}</strong> falhou ao ser processada.
          </p>
          {currentUpload.errorMessage && (
            <p className="text-sm text-red-500 mb-4">{currentUpload.errorMessage}</p>
          )}
          <a
            href="/importacao"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Tentar Novamente
          </a>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container max-w-7xl py-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Apenas valores realmente recebidos (valorRecebido > 0)
  const totalReceitasValor = summary?.contasReceber?.totalValor || 0;
  const totalReceitasRecebido = summary?.contasReceber?.totalRecebido || 0;
  const totalReceitas = totalReceitasRecebido; // Sempre usar apenas valores recebidos
  
  const totalDespesas = summary?.contasPagar?.totalPago || 0;
  const totalFolha = summary?.folha?.totalFolha || 0;
  const saldoBancario = summary?.saldos?.totalSaldo || 0;
  
  // Resultado conforme especificação: Receita Total - Despesa Total (sem folha para KPI principal)
  const resultado = totalReceitas - totalDespesas;
  const resultadoComFolha = totalReceitas - totalDespesas - totalFolha;
  
  // Margem Bruta conforme especificação: (Receita Total - Despesa Total) / Receita Total
  const margemBruta = totalReceitas > 0 ? ((resultado / totalReceitas) * 100) : 0;

  // Dados para gráfico de pizza de despesas por categoria
  const despesasCategoriaChart = contasPagarData?.despesasCategoria
    ?.filter((item) => item.categoria && item.totalPago > 0)
    .slice(0, 8)
    .map((item) => ({
      name: item.categoria || "Sem categoria",
      value: item.totalPago / 100,
    })) || [];

  // Dados para gráfico de barras de top fornecedores
  const topFornecedoresChart = contasPagarData?.topFornecedores
    ?.filter((item) => item.fornecedor && item.totalPago > 0)
    .slice(0, 10)
    .map((item) => ({
      name: item.fornecedor || "Sem nome",
      valor: item.totalPago / 100,
    })) || [];

  // Dados para gráfico de barras de top clientes
  const topClientesChart = contasReceberData?.topClientes
    ?.filter((item) => item.cliente && (item.totalRecebido > 0 || item.totalRecebido === null))
    .slice(0, 10)
    .map((item) => ({
      name: item.cliente || "Sem nome",
      valor: (item.totalRecebido || 0) / 100,
    })) || [];

  // Dados para gráfico de composição da receita por HISTÓRICO
  const receitasPorHistoricoChart = contasReceberData?.receitasPorHistorico
    ?.filter((item) => item.historico && item.totalRecebido > 0)
    .slice(0, 10)
    .map((item) => ({
      name: item.historico || "Sem histórico",
      valor: item.totalRecebido / 100,
    })) || [];

  // Dados para gráfico de despesas por centro de custo
  const despesasPorCentroCustoChart = contasPagarData?.despesasCentroCusto
    ?.filter((item) => item.centroCusto && item.totalPago > 0)
    .slice(0, 10)
    .map((item) => ({
      name: item.centroCusto || "Sem centro de custo",
      valor: item.totalPago / 100,
    })) || [];

  return (
    <div className="container max-w-7xl py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Dashboard Financeiro</h1>
              <p className="text-muted-foreground">
                Visão geral dos dados financeiros importados
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <MonthFilter value={selectedMonth} onChange={setSelectedMonth} />
            <RealizadoProjetadoFilter value={tipoVisualizacao} onChange={setTipoVisualizacao} />
          </div>
        </div>

        {selectedMonth && (
          <div className="mb-4">
            <Badge variant="outline" className="text-sm">
              Visualizando dados do mês {selectedMonth}
            </Badge>
          </div>
        )}

        {/* Cards de Resumo - KPIs conforme especificação */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalReceitas)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Soma de VPAGO (GERAL A RECEBER)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesa Total</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalDespesas)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Soma de VPAGO (GERAL A PAGAR)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resultado</CardTitle>
              {resultado >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${resultado >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(resultado)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Receita Total - Despesa Total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Margem Bruta</CardTitle>
              <DollarSign className={`h-4 w-4 ${margemBruta >= 0 ? "text-green-500" : "text-red-500"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${margemBruta >= 0 ? "text-green-600" : "text-red-600"}`}>
                {margemBruta.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                (Resultado / Receita Total) × 100
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico Mensal de Progresso */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Evolução Mensal</CardTitle>
            <CardDescription>
              Comparativo de receitas, despesas e resultado por mês {selectedMonth ? `(filtrado: mês ${selectedMonth})` : "(todos os meses)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredDadosMensais && filteredDadosMensais.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={filteredDadosMensais} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(229, 231, 235, 0.3)" />
                  <XAxis 
                    dataKey="mesNome" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80} 
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    stroke="#6b7280"
                  />
                  <YAxis 
                    tickFormatter={(value) => `R$ ${(value / 100000).toFixed(0)}k`}
                    stroke="#6b7280"
                    fontSize={11}
                    tick={{ fill: "#9ca3af" }}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #4b5563",
                      borderRadius: "6px",
                      color: "#f3f4f6",
                    }}
                    labelStyle={{ color: "#f3f4f6", fontWeight: 600, marginBottom: "4px" }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="receitas" 
                    stroke={SERIES_COLORS.receitas} 
                    name="Receitas" 
                    strokeWidth={3}
                    dot={{ fill: SERIES_COLORS.receitas, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="despesas" 
                    stroke={SERIES_COLORS.despesas} 
                    name="Despesas" 
                    strokeWidth={3}
                    dot={{ fill: SERIES_COLORS.despesas, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="resultado" 
                    stroke={SERIES_COLORS.resultado} 
                    name="Resultado" 
                    strokeWidth={3}
                    dot={{ fill: SERIES_COLORS.resultado, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                Sem dados disponíveis
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráficos */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Despesas por Categoria */}
          <Card>
            <CardHeader>
              <CardTitle>Despesas por Categoria</CardTitle>
              <CardDescription>Distribuição das principais categorias de despesas</CardDescription>
            </CardHeader>
            <CardContent>
              {despesasCategoriaChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={despesasCategoriaChart} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(229, 231, 235, 0.3)" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100} 
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      stroke="#6b7280"
                    />
                    <YAxis 
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                      stroke="#6b7280"
                      fontSize={11}
                      tick={{ fill: "#9ca3af" }}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value * 100)}
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #4b5563",
                        borderRadius: "6px",
                        color: "#f3f4f6",
                      }}
                      labelStyle={{ color: "#f3f4f6", fontWeight: 600, marginBottom: "4px" }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill={SERIES_COLORS.despesas}
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList 
                        dataKey="value" 
                        position="top"
                        formatter={(value: number) => {
                          if (value === 0) return "";
                          const formatted = formatCurrency(value * 100);
                          return formatted.replace("R$ ", "");
                        }}
                        style={{ fill: "#f3f4f6", fontSize: "10px", fontWeight: 600 }}
                        offset={5}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Fornecedores */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Fornecedores</CardTitle>
              <CardDescription>Fornecedores com maior valor pago</CardDescription>
            </CardHeader>
            <CardContent>
              {topFornecedoresChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={topFornecedoresChart} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      type="number" 
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                      stroke="#6b7280"
                      fontSize={11}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={120} 
                      tick={{ fontSize: 11 }}
                      stroke="#6b7280"
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value * 100)}
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #4b5563",
                        borderRadius: "6px",
                        color: "#f3f4f6",
                      }}
                      labelStyle={{ color: "#f3f4f6", fontWeight: 600, marginBottom: "4px" }}
                    />
                    <Bar 
                      dataKey="valor" 
                      fill={SERIES_COLORS.despesas}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Clientes */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Top 10 Clientes</CardTitle>
            <CardDescription>Clientes com maior valor recebido</CardDescription>
          </CardHeader>
          <CardContent>
            {topClientesChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topClientesChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    type="number" 
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    stroke="#6b7280"
                    fontSize={11}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={150} 
                    tick={{ fontSize: 11 }}
                    stroke="#6b7280"
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value * 100)}
                    contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "6px" }}
                  />
                  <Bar 
                    dataKey="valor" 
                    fill={SERIES_COLORS.receitas}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                Sem dados disponíveis
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráficos de Composição */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Composição da Receita por HISTÓRICO */}
          <Card>
            <CardHeader>
              <CardTitle>Composição da Receita</CardTitle>
              <CardDescription>Distribuição da receita total por HISTÓRICO</CardDescription>
            </CardHeader>
            <CardContent>
              {receitasPorHistoricoChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={receitasPorHistoricoChart} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(229, 231, 235, 0.3)" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100} 
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      stroke="#6b7280"
                    />
                    <YAxis 
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                      stroke="#6b7280"
                      fontSize={11}
                      tick={{ fill: "#9ca3af" }}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value * 100)}
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #4b5563",
                        borderRadius: "6px",
                        color: "#f3f4f6",
                      }}
                      labelStyle={{ color: "#f3f4f6", fontWeight: 600, marginBottom: "4px" }}
                    />
                    <Bar 
                      dataKey="valor" 
                      fill={SERIES_COLORS.receitas}
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList 
                        dataKey="valor" 
                        position="top"
                        formatter={(value: number) => {
                          if (value === 0) return "";
                          const formatted = formatCurrency(value * 100);
                          return formatted.replace("R$ ", "");
                        }}
                        style={{ fill: "#f3f4f6", fontSize: "10px", fontWeight: 600 }}
                        offset={5}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>

          {/* Análise de Centro de Custo */}
          <Card>
            <CardHeader>
              <CardTitle>Análise de Centro de Custo</CardTitle>
              <CardDescription>Despesa por Descrição CC Analítico</CardDescription>
            </CardHeader>
            <CardContent>
              {despesasPorCentroCustoChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={despesasPorCentroCustoChart} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(229, 231, 235, 0.3)" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100} 
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      stroke="#6b7280"
                    />
                    <YAxis 
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                      stroke="#6b7280"
                      fontSize={11}
                      tick={{ fill: "#9ca3af" }}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value * 100)}
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #4b5563",
                        borderRadius: "6px",
                        color: "#f3f4f6",
                      }}
                      labelStyle={{ color: "#f3f4f6", fontWeight: 600, marginBottom: "4px" }}
                    />
                    <Bar 
                      dataKey="valor" 
                      fill={SERIES_COLORS.despesas}
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList 
                        dataKey="valor" 
                        position="top"
                        formatter={(value: number) => {
                          if (value === 0) return "";
                          const formatted = formatCurrency(value * 100);
                          return formatted.replace("R$ ", "");
                        }}
                        style={{ fill: "#f3f4f6", fontSize: "10px", fontWeight: 600 }}
                        offset={5}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
