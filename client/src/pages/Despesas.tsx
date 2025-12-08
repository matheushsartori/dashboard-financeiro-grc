import { useMemo, useState } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownRight, Loader2, TrendingDown } from "lucide-react";
// DashboardLayout removido - agora é gerenciado pelo App.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { Skeleton } from "@/components/Skeleton";
import { DataTable } from "@/components/DataTable";
import { MonthFilter } from "@/components/MonthFilter";
import { SERIES_COLORS } from "@/lib/chartColors";
import { Badge } from "@/components/ui/badge";

function formatCurrency(cents: number | null | undefined): string {
  if (!cents || cents === 0) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("pt-BR");
}

export default function Despesas() {
  const searchParams = new URLSearchParams(useSearch());
  const uploadId = searchParams.get("uploadId");
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const { data: uploads, isLoading: loadingUploads } = trpc.financial.listUploads.useQuery();
  const latestUpload = useMemo(() => {
    if (uploadId) return parseInt(uploadId);
    if (uploads && uploads.length > 0) return uploads[0].id;
    return null;
  }, [uploadId, uploads]);

  // Priorizar: carregar summary primeiro (dados essenciais)
  const { data: summary, isLoading: loadingSummary } = trpc.financial.getContasAPagarSummary.useQuery(
    { uploadId: latestUpload! },
    { 
      enabled: !!latestUpload,
      staleTime: 2 * 60 * 1000, // 2 minutos
    }
  );

  // Carregar despesas detalhadas em paralelo
  const { data: despesas, isLoading: loadingDespesas } = trpc.financial.getContasAPagar.useQuery(
    { uploadId: latestUpload! },
    { 
      enabled: !!latestUpload,
      staleTime: 3 * 60 * 1000,
    }
  );

  // Buscar despesas por fornecedor - carregar após summary estar pronto
  const { data: despesasPorFornecedor, isLoading: loadingDespesasPorFornecedor } = trpc.financial.getDespesasPorFornecedor.useQuery(
    { uploadId: latestUpload!, mes: selectedMonth ?? undefined },
    { 
      enabled: !!latestUpload && !!summary, // Só carrega após summary estar pronto
      staleTime: 3 * 60 * 1000,
    }
  );

  // Buscar despesas mensais para gráfico de evolução (apenas quando não há filtro de mês)
  const { data: despesasMensais, isLoading: loadingDespesasMensais } = trpc.financial.getDespesasMensais.useQuery(
    { uploadId: latestUpload! },
    { 
      enabled: !!latestUpload && !selectedMonth && !!summary, // Só carrega quando não há filtro de mês e summary pronto
      staleTime: 5 * 60 * 1000, // Dados mensais mudam menos
    }
  );

  // Combinar todos os estados de loading
  const isLoading = loadingUploads || (!!latestUpload && (loadingSummary || loadingDespesas || loadingDespesasPorFornecedor || loadingDespesasMensais));

  // Filtrar despesas por mês se selecionado
  const filteredDespesas = useMemo(() => {
    if (!despesas) return [];
    if (!selectedMonth) return despesas;
    return despesas.filter(d => d.mes === selectedMonth);
  }, [despesas, selectedMonth]);

  // Calcular totais filtrados
  const filteredSummary = useMemo(() => {
    if (!filteredDespesas.length) return { totalValor: 0, totalPago: 0, totalRegistros: 0 };
    
    const totalValor = filteredDespesas.reduce((sum, d) => sum + (d.valor || 0), 0);
    const totalPago = filteredDespesas.reduce((sum, d) => sum + (d.valorPago || 0), 0);
    
    return {
      totalValor,
      totalPago,
      totalRegistros: filteredDespesas.length,
    };
  }, [filteredDespesas]);

  if (!latestUpload) {
    return (
      <div className="container max-w-7xl py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Nenhum dado importado</h2>
          <p className="text-muted-foreground mb-6">
            Faça o upload de uma planilha Excel para visualizar suas despesas.
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

  const despesasCategoriaChart = summary?.despesasCategoria
    ?.filter((item) => item.categoria && item.totalPago > 0)
    .slice(0, 8)
    .map((item) => ({
      name: item.categoria || "Sem categoria",
      value: item.totalPago / 100,
    })) || [];

  const topFornecedoresChart = summary?.topFornecedores
    ?.filter((item) => item.fornecedor && item.totalPago > 0)
    .slice(0, 10)
    .map((item) => ({
      name: item.fornecedor || "Sem nome",
      valor: item.totalPago / 100,
    })) || [];

  const despesasCentroCustoChart = summary?.despesasCentroCusto
    ?.filter((item) => item.centroCusto && item.totalPago > 0)
    .slice(0, 10)
    .map((item) => ({
      name: item.centroCusto || "Sem centro de custo",
      valor: item.totalPago / 100,
    })) || [];

  const totalValor = summary?.summary?.totalValor || 0;
  const totalPago = summary?.summary?.totalPago || 0;

  return (
    <div className="container max-w-7xl py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Despesas</h1>
            <p className="text-muted-foreground">
              Análise detalhada de contas a pagar
            </p>
          </div>
          <MonthFilter value={selectedMonth} onChange={setSelectedMonth} />
        </div>

        {selectedMonth && (
          <div className="mb-4">
            <Badge variant="outline" className="text-sm">
              Visualizando dados do mês {selectedMonth}
            </Badge>
          </div>
        )}

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          {loadingSummary ? (
            <>
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
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total a Pagar</CardTitle>
                  <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(selectedMonth ? filteredSummary.totalValor : totalValor)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Valor original {selectedMonth ? "do mês" : "geral"}
                  </p>
                </CardContent>
              </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(selectedMonth ? filteredSummary.totalPago : totalPago)}
              </div>
              <p className="text-xs text-muted-foreground">
                Valor efetivamente pago {selectedMonth ? "do mês" : "geral"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Pagamento</CardTitle>
              <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(() => {
                  const valor = selectedMonth ? filteredSummary.totalValor : totalValor;
                  const pago = selectedMonth ? filteredSummary.totalPago : totalPago;
                  if (!valor) return "0%";
                  return `${((pago / valor) * 100).toFixed(1)}%`;
                })()}
              </div>
              <p className="text-xs text-muted-foreground">
                Percentual pago
              </p>
            </CardContent>
          </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Registros</CardTitle>
                  <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {selectedMonth ? filteredSummary.totalRegistros : (summary?.summary?.totalRegistros || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Contas a pagar {selectedMonth ? "do mês" : "geral"}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Gráfico de Evolução Mensal - apenas quando não há filtro */}
        {!selectedMonth && despesasMensais && despesasMensais.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Evolução Mensal de Despesas</CardTitle>
              <CardDescription>
                Comparação de despesas pagas por mês (todos os 12 meses)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={despesasMensais} margin={{ top: 10, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(229, 231, 235, 0.3)" />
                  <XAxis 
                    dataKey="mesNome" 
                    stroke="#6b7280"
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fill: "#9ca3af" }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    stroke="#6b7280"
                    fontSize={12}
                    tick={{ fill: "#9ca3af" }}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: "#fff", 
                      border: "1px solid #e5e7eb", 
                      borderRadius: "6px",
                      color: "#1f2937",
                      fontWeight: 500,
                      padding: "8px 12px"
                    }}
                  />
                  <Bar 
                    dataKey="totalPago" 
                    fill={SERIES_COLORS.despesas}
                    radius={[4, 4, 0, 0]}
                  >
                    <LabelList 
                      dataKey="totalPago" 
                      position="top"
                      formatter={(value: number) => {
                        if (value === 0) return "";
                        const formatted = formatCurrency(value);
                        return formatted.replace("R$ ", "");
                      }}
                      style={{ fill: "#f3f4f6", fontSize: "10px", fontWeight: 600 }}
                      offset={5}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Gráficos */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Despesas por Categoria */}
          <Card>
            <CardHeader>
              <CardTitle>Despesas por Categoria</CardTitle>
              <CardDescription>Distribuição das principais categorias</CardDescription>
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
                        backgroundColor: "#fff", 
                        border: "1px solid #e5e7eb", 
                        borderRadius: "6px",
                        color: "#1f2937",
                        fontWeight: 500
                      }}
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

          {/* Despesas por Centro de Custo */}
          <Card>
            <CardHeader>
              <CardTitle>Despesas por Centro de Custo</CardTitle>
              <CardDescription>Distribuição por área</CardDescription>
            </CardHeader>
            <CardContent>
              {despesasCentroCustoChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={despesasCentroCustoChart} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
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
                        backgroundColor: "#fff", 
                        border: "1px solid #e5e7eb", 
                        borderRadius: "6px",
                        color: "#1f2937",
                        fontWeight: 500
                      }}
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

        {/* Top Fornecedores */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Top 10 Fornecedores</CardTitle>
            <CardDescription>Fornecedores com maior valor pago {selectedMonth ? `no mês ${selectedMonth}` : "geral"}</CardDescription>
          </CardHeader>
          <CardContent>
            {topFornecedoresChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
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
                    fill={SERIES_COLORS.despesas}
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

        {/* Tabela de Despesas por Fornecedor */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Despesas por Fornecedor</CardTitle>
            <CardDescription>
              Resumo de despesas agrupadas por fornecedor {selectedMonth ? `do mês ${selectedMonth}` : "geral"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDespesasPorFornecedor ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : despesasPorFornecedor && despesasPorFornecedor.length > 0 ? (
              <DataTable
                data={despesasPorFornecedor}
                columns={[
                  {
                    key: "fornecedor",
                    label: "Fornecedor",
                    render: (value) => <span className="font-medium">{value || "-"}</span>,
                  },
                  {
                    key: "quantidadePagamentos",
                    label: "Qtd. Pagamentos",
                    render: (value) => <span className="text-center">{value || 0}</span>,
                    className: "text-center",
                  },
                  {
                    key: "totalPagamentos",
                    label: "Total de Pagamentos",
                    render: (value) => (
                      <span className="text-red-600 font-semibold">
                        {formatCurrency(value)}
                      </span>
                    ),
                    className: "text-right",
                  },
                  {
                    key: "mediaPagamentos",
                    label: "Média de Pagamentos",
                    render: (value) => formatCurrency(value),
                    className: "text-right",
                  },
                  {
                    key: "ultimoPagamento",
                    label: "Último Pagamento",
                    render: (value) => (
                      <span className={value ? "" : "text-muted-foreground"}>
                        {value ? formatDate(value) : "N/A"}
                      </span>
                    ),
                  },
                ]}
                searchable={true}
                searchPlaceholder="Buscar por fornecedor..."
                searchKeys={["fornecedor"]}
                pageSize={15}
                emptyMessage="Nenhuma despesa por fornecedor encontrada"
                onRowClick={(row) => {
                  const fornecedor = encodeURIComponent(row.fornecedor);
                  window.location.href = `/despesas/fornecedor?fornecedor=${fornecedor}&uploadId=${latestUpload}${selectedMonth ? `&mes=${selectedMonth}` : ""}`;
                }}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma despesa por fornecedor encontrada
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabela de Despesas */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento de Despesas</CardTitle>
            <CardDescription>
              Lista completa de contas a pagar {selectedMonth ? `do mês ${selectedMonth}` : "geral"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDespesas ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <DataTable
                data={filteredDespesas}
                columns={[
                  {
                    key: "fornecedor",
                    label: "Fornecedor",
                    render: (value) => <span className="font-medium">{value || "-"}</span>,
                  },
                  {
                    key: "dataLancamento",
                    label: "Data Lançamento",
                    render: (value) => formatDate(value),
                  },
                  {
                    key: "dataVencimento",
                    label: "Data Vencimento",
                    render: (value) => formatDate(value),
                  },
                  {
                    key: "valor",
                    label: "Valor",
                    render: (value) => formatCurrency(value),
                    className: "text-right",
                  },
                  {
                    key: "valorPago",
                    label: "Valor Pago",
                    render: (value) => (
                      <span className="text-red-600 font-semibold">
                        {formatCurrency(value)}
                      </span>
                    ),
                    className: "text-right",
                  },
                  {
                    key: "dataPagamento",
                    label: "Data Pagamento",
                    render: (value) => formatDate(value),
                  },
                  {
                    key: "mes",
                    label: "Mês",
                    render: (value) => value ? `Mês ${value}` : "-",
                  },
                  {
                    key: "historico",
                    label: "Histórico",
                    render: (value) => (
                      <span className="max-w-xs truncate block" title={value || ""}>
                        {value || "-"}
                      </span>
                    ),
                  },
                ]}
                searchable={true}
                searchPlaceholder="Buscar por fornecedor, histórico..."
                searchKeys={["fornecedor", "historico"]}
                pageSize={15}
                emptyMessage="Nenhuma despesa encontrada"
              />
            )}
          </CardContent>
        </Card>
      </div>
  );
}
