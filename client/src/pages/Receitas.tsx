import { useMemo, useState } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, Loader2, TrendingUp } from "lucide-react";
// DashboardLayout removido - agora é gerenciado pelo App.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { DataTable } from "@/components/DataTable";
import { MonthFilter } from "@/components/MonthFilter";
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

function formatDate(date: Date | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("pt-BR");
}

export default function Receitas() {
  const searchParams = new URLSearchParams(useSearch());
  const uploadId = searchParams.get("uploadId");
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const { data: uploads } = trpc.financial.listUploads.useQuery();
  const latestUpload = useMemo(() => {
    if (uploadId) return parseInt(uploadId);
    if (uploads && uploads.length > 0) return uploads[0].id;
    return null;
  }, [uploadId, uploads]);

  const { data: summary, isLoading: loadingSummary } = trpc.financial.getContasAReceberSummary.useQuery(
    { uploadId: latestUpload!, mes: selectedMonth ?? undefined },
    { enabled: !!latestUpload }
  );

  const { data: receitas, isLoading: loadingReceitas } = trpc.financial.getContasAReceber.useQuery(
    { uploadId: latestUpload!, mes: selectedMonth ?? undefined },
    { enabled: !!latestUpload }
  );

  // Buscar receitas mensais para gráfico de evolução (apenas quando não há filtro de mês)
  const { data: receitasMensais } = trpc.financial.getReceitasMensais.useQuery(
    { uploadId: latestUpload! },
    { enabled: !!latestUpload && !selectedMonth }
  );

  // Buscar receitas por empresa
  const { data: receitasPorEmpresa, isLoading: loadingReceitasPorEmpresa } = trpc.financial.getReceitasPorEmpresa.useQuery(
    { uploadId: latestUpload!, mes: selectedMonth ?? undefined },
    { enabled: !!latestUpload }
  );

  // Receitas já vêm filtradas do backend
  const filteredReceitas = receitas || [];

  // Top clientes filtrados (calculado do frontend pois já vem filtrado)
  const topClientes = useMemo(() => {
    if (!filteredReceitas.length) return [];
    
    const clienteMap = new Map<string, number>();
    filteredReceitas.forEach(r => {
      const cliente = r.cliente || "Sem nome";
      // Apenas valores realmente recebidos (valorRecebido > 0)
      const valor = r.valorRecebido || 0;
      if (valor > 0) {
        clienteMap.set(cliente, (clienteMap.get(cliente) || 0) + valor);
      }
    });

    return Array.from(clienteMap.entries())
      .map(([cliente, total]) => ({ cliente, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map(item => ({
        // Truncar mais agressivamente para garantir uma linha só (máximo 35 caracteres)
        name: item.cliente.length > 35 ? item.cliente.substring(0, 32) + "..." : item.cliente,
        nameFull: item.cliente, // Nome completo para o tooltip
        valor: item.total / 100,
      }));
  }, [filteredReceitas]);

  if (!latestUpload) {
    return (
      <div className="container max-w-7xl py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Nenhum dado importado</h2>
          <p className="text-muted-foreground mb-6">
            Faça o upload de uma planilha Excel para visualizar suas receitas.
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

  // Usar dados do summary que já vem filtrado do backend
  // IMPORTANTE: totalRecebido deve ser apenas valores realmente recebidos (valorRecebido > 0)
  const totalValor = summary?.summary?.totalValor || 0;
  const totalRecebido = summary?.summary?.totalRecebido || 0; // Apenas valores recebidos, sem fallback
  const totalRegistros = summary?.summary?.totalRegistros || 0;

  return (
    <div className="container max-w-7xl py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Receitas</h1>
            <p className="text-muted-foreground">
              Análise detalhada de contas a receber
            </p>
          </div>
          <MonthFilter value={selectedMonth} onChange={setSelectedMonth} />
        </div>

        {selectedMonth && (
          <div className="mb-4 flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              Visualizando dados do mês {selectedMonth}
            </Badge>
            <span className="text-sm text-muted-foreground">
              ({filteredReceitas.length} de {receitas?.length || 0} registros)
            </span>
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
                  <CardTitle className="text-sm font-medium">Valor Emitido</CardTitle>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(totalValor)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total de notas emitidas {selectedMonth ? "do mês" : "geral"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalRecebido)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Valor efetivamente recebido {selectedMonth ? "do mês" : "geral"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taxa de Recebimento</CardTitle>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {totalValor > 0 ? `${Math.min(((totalRecebido / totalValor) * 100), 100).toFixed(1)}%` : "0%"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Percentual recebido (apenas valores recebidos)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Registros</CardTitle>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {totalRegistros}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Contas a receber {selectedMonth ? "do mês" : "geral"}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Gráfico de Evolução Mensal - apenas quando não há filtro */}
        {!selectedMonth && receitasMensais && receitasMensais.length > 1 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Evolução Mensal de Receitas</CardTitle>
              <CardDescription>
                Comparação de receitas recebidas por mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={receitasMensais} margin={{ top: 10, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(229, 231, 235, 0.3)" />
                  <XAxis 
                    dataKey="mesNome" 
                    stroke="#6b7280"
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    stroke="#6b7280"
                    fontSize={12}
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
                    dataKey="totalRecebido" 
                    fill={SERIES_COLORS.receitas}
                    radius={[4, 4, 0, 0]}
                  >
                    <LabelList 
                      dataKey="totalRecebido" 
                      position="top"
                      formatter={(value: number) => {
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

        {/* Gráfico de Top Clientes */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Top 10 Clientes</CardTitle>
            <CardDescription>
              Clientes com maior valor recebido {selectedMonth ? `no mês ${selectedMonth}` : "geral"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topClientes.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topClientes} layout="vertical" margin={{ left: 150, right: 80, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(229, 231, 235, 0.3)" />
                  <XAxis 
                    type="number" 
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    stroke="#6b7280"
                    fontSize={12}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={150}
                    tick={{ fontSize: 10, fill: "#9ca3af", fontWeight: 500 }}
                    stroke="#6b7280"
                    interval={0}
                    tickLine={false}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value * 100)}
                    labelFormatter={(label: string, payload: any[]) => {
                      // Usar o nome completo do payload se disponível
                      const fullName = payload?.[0]?.payload?.nameFull || label || "";
                      return (
                        <span style={{ color: "#1f2937", fontWeight: 600, fontSize: "14px" }}>
                          {fullName}
                        </span>
                      );
                    }}
                    contentStyle={{ 
                      backgroundColor: "#fff", 
                      border: "1px solid #e5e7eb", 
                      borderRadius: "6px",
                      color: "#1f2937",
                      fontWeight: 500,
                      padding: "8px 12px"
                    }}
                    labelStyle={{ color: "#1f2937", fontWeight: 600, marginBottom: "4px" }}
                  />
                  <Bar 
                    dataKey="valor" 
                    fill={SERIES_COLORS.receitas}
                    radius={[0, 4, 4, 0]}
                  >
                    <LabelList 
                      dataKey="valor" 
                      position="right"
                      formatter={(value: number) => {
                        const formatted = formatCurrency(value * 100);
                        return formatted.replace("R$ ", ""); // Remover R$ para economizar espaço
                      }}
                      style={{ fill: "#f3f4f6", fontSize: "11px", fontWeight: 600 }}
                      offset={5}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                Sem dados disponíveis
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabela de Receitas por Empresa */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Receitas por Empresa</CardTitle>
            <CardDescription>
              Resumo de receitas agrupadas por empresa {selectedMonth ? `do mês ${selectedMonth}` : "geral"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingReceitasPorEmpresa ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : receitasPorEmpresa && receitasPorEmpresa.length > 0 ? (
              <DataTable
                data={receitasPorEmpresa}
                columns={[
                  {
                    key: "cliente",
                    label: "Empresa",
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
                      <span className="text-green-600 font-semibold">
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
                searchPlaceholder="Buscar por empresa..."
                searchKeys={["cliente"]}
                pageSize={15}
                emptyMessage="Nenhuma receita por empresa encontrada"
                onRowClick={(row) => {
                  const cliente = encodeURIComponent(row.cliente);
                  window.location.href = `/receitas/empresa?cliente=${cliente}&uploadId=${latestUpload}${selectedMonth ? `&mes=${selectedMonth}` : ""}`;
                }}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma receita por empresa encontrada
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabela de Receitas */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento de Receitas</CardTitle>
            <CardDescription>
              Lista completa de contas a receber {selectedMonth ? `do mês ${selectedMonth}` : "geral"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingReceitas ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <DataTable
                data={filteredReceitas}
                columns={[
                  {
                    key: "cliente",
                    label: "Cliente",
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
                    key: "valorRecebido",
                    label: "Valor Recebido",
                    render: (value, row) => (
                      <span className="text-green-600 font-semibold">
                        {formatCurrency(value || row.valor || 0)}
                      </span>
                    ),
                    className: "text-right",
                  },
                  {
                    key: "dataRecebimento",
                    label: "Data Recebimento",
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
                searchPlaceholder="Buscar por cliente, histórico..."
                searchKeys={["cliente", "historico"]}
                pageSize={15}
                emptyMessage="Nenhuma receita encontrada"
              />
            )}
          </CardContent>
        </Card>
      </div>
  );
}
