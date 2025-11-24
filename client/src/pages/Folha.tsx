import { useMemo, useState } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Loader2 } from "lucide-react";
// DashboardLayout removido - agora é gerenciado pelo App.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { DataTable } from "@/components/DataTable";
import { SERIES_COLORS, PIE_CHART_COLORS } from "@/lib/chartColors";

function formatCurrency(cents: number | null | undefined): string {
  if (!cents || cents === 0) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export default function Folha() {
  const searchParams = new URLSearchParams(useSearch());
  const uploadId = searchParams.get("uploadId");

  const { data: uploads } = trpc.financial.listUploads.useQuery();
  const latestUpload = useMemo(() => {
    if (uploadId) return parseInt(uploadId);
    if (uploads && uploads.length > 0) return uploads[0].id;
    return null;
  }, [uploadId, uploads]);

  const { data: summary, isLoading: loadingSummary } = trpc.financial.getFolhaPagamentoSummary.useQuery(
    { uploadId: latestUpload! },
    { enabled: !!latestUpload }
  );

  const { data: folha, isLoading: loadingFolha } = trpc.financial.getFolhaPagamento.useQuery(
    { uploadId: latestUpload! },
    { enabled: !!latestUpload }
  );

  if (!latestUpload) {
    return (
      <div className="container max-w-7xl py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Nenhum dado importado</h2>
          <p className="text-muted-foreground mb-6">
            Faça o upload de uma planilha Excel para visualizar a folha de pagamento.
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

  const custoPorAreaChart = summary?.custoPorArea
    ?.filter((item) => item.area && item.totalCusto > 0)
    .map((item) => ({
      name: item.area || "Sem área",
      value: item.totalCusto / 100,
    })) || [];

  // Agrupar folha por funcionário (somar todos os tipos de pagamento)
  const custoPorFuncionario = useMemo(() => {
    if (!folha) return [];

    const funcionarioMap = new Map<string, number>();
    
    folha.forEach((item) => {
      const nome = item.nome;
      const total = item.total || 0;
      
      if (funcionarioMap.has(nome)) {
        funcionarioMap.set(nome, funcionarioMap.get(nome)! + total);
      } else {
        funcionarioMap.set(nome, total);
      }
    });

    return Array.from(funcionarioMap.entries())
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map(item => ({
        name: item.nome,
        valor: item.total / 100,
      }));
  }, [folha]);

  return (
      <div className="container max-w-7xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Folha de Pagamento</h1>
          <p className="text-muted-foreground">
            Análise de custos com pessoal
          </p>
        </div>

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custo Total da Folha</CardTitle>
              <Users className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {formatCurrency(summary?.summary?.totalFolha)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total de custos com pessoal
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Funcionários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary?.summary?.totalFuncionarios || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Funcionários únicos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custo Médio por Funcionário</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(() => {
                  const total = summary?.summary?.totalFolha || 0;
                  const funcionarios = summary?.summary?.totalFuncionarios || 0;
                  if (!funcionarios) return formatCurrency(0);
                  return formatCurrency(Math.round(total / funcionarios));
                })()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Média por funcionário
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Custo por Área */}
          <Card>
            <CardHeader>
              <CardTitle>Custo por Área</CardTitle>
              <CardDescription>Distribuição de custos por departamento</CardDescription>
            </CardHeader>
            <CardContent>
              {custoPorAreaChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={custoPorAreaChart}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => {
                        const shortName = name.length > 20 ? name.substring(0, 20) + "..." : name;
                        return `${shortName}: ${(percent * 100).toFixed(0)}%`;
                      }}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {custoPorAreaChart.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value * 100)}
                      contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "6px" }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top 10 Funcionários */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Funcionários</CardTitle>
              <CardDescription>Maiores custos por funcionário</CardDescription>
            </CardHeader>
            <CardContent>
              {custoPorFuncionario.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={custoPorFuncionario} layout="vertical">
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
                      contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "6px" }}
                    />
                    <Bar 
                      dataKey="valor" 
                      fill={SERIES_COLORS.folha}
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

        {/* Tabela de Folha de Pagamento */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento da Folha</CardTitle>
            <CardDescription>Lista completa de pagamentos</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingFolha ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <DataTable
                data={folha || []}
                columns={[
                  {
                    key: "nome",
                    label: "Nome",
                    render: (value) => <span className="font-medium">{value || "-"}</span>,
                  },
                  {
                    key: "area",
                    label: "Área",
                    render: (value) => value || "-",
                  },
                  {
                    key: "tipoPagamento",
                    label: "Tipo",
                    render: (value) => (
                      <span className="text-xs px-2 py-1 bg-muted rounded">
                        {value || "-"}
                      </span>
                    ),
                  },
                  {
                    key: "mes1",
                    label: "Mês 1",
                    render: (value) => formatCurrency(value),
                    className: "text-right text-xs",
                  },
                  {
                    key: "mes2",
                    label: "Mês 2",
                    render: (value) => formatCurrency(value),
                    className: "text-right text-xs",
                  },
                  {
                    key: "mes3",
                    label: "Mês 3",
                    render: (value) => formatCurrency(value),
                    className: "text-right text-xs",
                  },
                  {
                    key: "mes4",
                    label: "Mês 4",
                    render: (value) => formatCurrency(value),
                    className: "text-right text-xs",
                  },
                  {
                    key: "mes5",
                    label: "Mês 5",
                    render: (value) => formatCurrency(value),
                    className: "text-right text-xs",
                  },
                  {
                    key: "mes6",
                    label: "Mês 6",
                    render: (value) => formatCurrency(value),
                    className: "text-right text-xs",
                  },
                  {
                    key: "mes7",
                    label: "Mês 7",
                    render: (value) => formatCurrency(value),
                    className: "text-right text-xs",
                  },
                  {
                    key: "mes8",
                    label: "Mês 8",
                    render: (value) => formatCurrency(value),
                    className: "text-right text-xs",
                  },
                  {
                    key: "total",
                    label: "Total",
                    render: (value) => (
                      <span className="font-bold text-amber-600">
                        {formatCurrency(value)}
                      </span>
                    ),
                    className: "text-right font-bold",
                  },
                ]}
                searchable={true}
                searchPlaceholder="Buscar por nome, área..."
                searchKeys={["nome", "area", "tipoPagamento"]}
                pageSize={15}
                emptyMessage="Nenhum dado de folha encontrado"
              />
            )}
          </CardContent>
        </Card>
      </div>
  );
}
