import { useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, DollarSign, Users, Building2, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { MonthFilter } from "@/components/MonthFilter";
import { SERIES_COLORS, PIE_CHART_COLORS } from "@/lib/chartColors";
import { Badge } from "@/components/ui/badge";

function formatCurrency(cents: number | null | undefined): string {
  if (!cents || cents === 0) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export default function Dashboard() {
  const searchParams = new URLSearchParams(useSearch());
  const uploadId = searchParams.get("uploadId");
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const { data: uploads } = trpc.financial.listUploads.useQuery();
  const latestUpload = useMemo(() => {
    if (uploadId) return parseInt(uploadId);
    if (uploads && uploads.length > 0) return uploads[0].id;
    return null;
  }, [uploadId, uploads]);

  const { data: summary, isLoading } = trpc.financial.getDashboardSummary.useQuery(
    { uploadId: latestUpload! },
    { enabled: !!latestUpload }
  );

  const { data: contasPagarData } = trpc.financial.getContasAPagarSummary.useQuery(
    { uploadId: latestUpload! },
    { enabled: !!latestUpload }
  );

  const { data: contasReceberData } = trpc.financial.getContasAReceberSummary.useQuery(
    { uploadId: latestUpload! },
    { enabled: !!latestUpload }
  );

  const { data: dadosMensais } = trpc.financial.getDadosMensais.useQuery(
    { uploadId: latestUpload! },
    { enabled: !!latestUpload }
  );

  // Filtrar dados mensais se mês selecionado
  const filteredDadosMensais = useMemo(() => {
    if (!dadosMensais) return [];
    if (!selectedMonth) return dadosMensais;
    return dadosMensais.filter(d => d.mes === selectedMonth);
  }, [dadosMensais, selectedMonth]);

  if (!latestUpload) {
    return (
      <DashboardLayout>
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
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container max-w-7xl py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // CORRIGIDO: Usar totalValor se totalRecebido for 0 ou null
  const totalReceitasValor = summary?.contasReceber?.totalValor || 0;
  const totalReceitasRecebido = summary?.contasReceber?.totalRecebido || 0;
  const totalReceitas = totalReceitasRecebido > 0 ? totalReceitasRecebido : totalReceitasValor;
  
  const totalDespesas = summary?.contasPagar?.totalPago || 0;
  const totalFolha = summary?.folha?.totalFolha || 0;
  const saldoBancario = summary?.saldos?.totalSaldo || 0;
  const resultado = totalReceitas - totalDespesas - totalFolha;

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

  return (
    <DashboardLayout>
      <div className="container max-w-7xl py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard Financeiro</h1>
            <p className="text-muted-foreground">
              Visão geral dos dados financeiros importados
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receitas</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalReceitas)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalReceitasRecebido > 0 ? "Total recebido" : "Total a receber"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalDespesas)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total pago
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Folha de Pagamento</CardTitle>
              <Users className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {formatCurrency(totalFolha)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary?.folha?.totalFuncionarios || 0} funcionários
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
                Receitas - Despesas - Folha
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico Mensal de Progresso */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Evolução Mensal</CardTitle>
            <CardDescription>
              Comparativo de receitas, despesas e resultado por mês {selectedMonth ? `(filtrado: mês ${selectedMonth})` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredDadosMensais && filteredDadosMensais.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={filteredDadosMensais} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="mesNome" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80} 
                    tick={{ fontSize: 11 }}
                    stroke="#6b7280"
                  />
                  <YAxis 
                    tickFormatter={(value) => `R$ ${(value / 100000).toFixed(0)}k`}
                    stroke="#6b7280"
                    fontSize={11}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "6px" }}
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
                  <PieChart>
                    <Pie
                      data={despesasCategoriaChart}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => {
                        const shortName = name.length > 15 ? name.substring(0, 15) + "..." : name;
                        return `${shortName}: ${(percent * 100).toFixed(0)}%`;
                      }}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {despesasCategoriaChart.map((entry, index) => (
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
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Clientes */}
        <Card>
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
      </div>
    </DashboardLayout>
  );
}
