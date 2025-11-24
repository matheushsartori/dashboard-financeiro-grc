import { useMemo } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function formatCurrency(cents: number | null | undefined): string {
  if (!cents) return "R$ 0,00";
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
      <DashboardLayout>
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
      </DashboardLayout>
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
      .slice(0, 10);
  }, [folha]);

  return (
    <DashboardLayout>
      <div className="container max-w-7xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Folha de Pagamento</h1>
          <p className="text-muted-foreground">
            Análise de custos com pessoal
          </p>
        </div>

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custo Total da Folha</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary?.summary?.totalFolha)}
              </div>
              <p className="text-xs text-muted-foreground">
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
              <p className="text-xs text-muted-foreground">
                Funcionários únicos
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
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={custoPorAreaChart}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name.substring(0, 20)}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {custoPorAreaChart.map((entry, index) => (
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

          {/* Top 10 Funcionários */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Funcionários</CardTitle>
              <CardDescription>Maiores custos por funcionário</CardDescription>
            </CardHeader>
            <CardContent>
              {custoPorFuncionario.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={custoPorFuncionario} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => `R$ ${(value / 100 / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="total" fill="#8b5cf6" />
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
            ) : folha && folha.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Mês 1</TableHead>
                      <TableHead>Mês 2</TableHead>
                      <TableHead>Mês 3</TableHead>
                      <TableHead>Mês 4</TableHead>
                      <TableHead>Mês 5</TableHead>
                      <TableHead>Mês 6</TableHead>
                      <TableHead>Mês 7</TableHead>
                      <TableHead>Mês 8</TableHead>
                      <TableHead className="font-bold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {folha.slice(0, 50).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.nome}</TableCell>
                        <TableCell>{item.area || "-"}</TableCell>
                        <TableCell className="text-xs">{item.tipoPagamento || "-"}</TableCell>
                        <TableCell className="text-xs">{formatCurrency(item.mes1)}</TableCell>
                        <TableCell className="text-xs">{formatCurrency(item.mes2)}</TableCell>
                        <TableCell className="text-xs">{formatCurrency(item.mes3)}</TableCell>
                        <TableCell className="text-xs">{formatCurrency(item.mes4)}</TableCell>
                        <TableCell className="text-xs">{formatCurrency(item.mes5)}</TableCell>
                        <TableCell className="text-xs">{formatCurrency(item.mes6)}</TableCell>
                        <TableCell className="text-xs">{formatCurrency(item.mes7)}</TableCell>
                        <TableCell className="text-xs">{formatCurrency(item.mes8)}</TableCell>
                        <TableCell className="font-bold">{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {folha.length > 50 && (
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Mostrando 50 de {folha.length} registros
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum dado de folha encontrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
