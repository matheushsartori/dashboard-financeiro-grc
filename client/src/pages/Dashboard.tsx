import { useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, DollarSign, Users, Building2, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

function formatCurrency(cents: number | null | undefined): string {
  if (!cents) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export default function Dashboard() {
  const searchParams = new URLSearchParams(useSearch());
  const uploadId = searchParams.get("uploadId");

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

  const totalReceitas = summary?.contasReceber?.totalRecebido || 0;
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
    ?.filter((item) => item.cliente && item.totalRecebido > 0)
    .slice(0, 10)
    .map((item) => ({
      name: item.cliente || "Sem nome",
      valor: item.totalRecebido / 100,
    })) || [];

  return (
    <DashboardLayout>
      <div className="container max-w-7xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard Financeiro</h1>
          <p className="text-muted-foreground">
            Visão geral dos dados financeiros importados
          </p>
        </div>

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receitas</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {formatCurrency(totalReceitas)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total recebido
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas</CardTitle>
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {formatCurrency(totalDespesas)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total pago
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Folha de Pagamento</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totalFolha)}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary?.folha?.totalFuncionarios || 0} funcionários
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resultado</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${resultado >= 0 ? "text-green-500" : "text-red-500"}`}>
                {formatCurrency(resultado)}
              </div>
              <p className="text-xs text-muted-foreground">
                Receitas - Despesas - Folha
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico Mensal de Progresso */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Evolução Mensal</CardTitle>
            <CardDescription>Comparativo de receitas, despesas e resultado por mês</CardDescription>
          </CardHeader>
          <CardContent>
            {dadosMensais && dadosMensais.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={dadosMensais}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mesNome" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(value) => `R$ ${(value / 100000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="receitas" stroke="#10b981" name="Receitas" strokeWidth={2} />
                  <Line type="monotone" dataKey="despesas" stroke="#ef4444" name="Despesas" strokeWidth={2} />
                  <Line type="monotone" dataKey="resultado" stroke="#3b82f6" name="Resultado" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">
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
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={despesasCategoriaChart}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name.substring(0, 20)}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {despesasCategoriaChart.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value * 100)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
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
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topFornecedoresChart} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => formatCurrency(value * 100)} />
                    <Bar dataKey="valor" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
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
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topClientesChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value * 100)} />
                  <Bar dataKey="valor" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados disponíveis
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
