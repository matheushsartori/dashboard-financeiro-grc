import { useMemo } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpRight, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

function formatCurrency(cents: number | null | undefined): string {
  if (!cents) return "R$ 0,00";
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

  const { data: uploads } = trpc.financial.listUploads.useQuery();
  const latestUpload = useMemo(() => {
    if (uploadId) return parseInt(uploadId);
    if (uploads && uploads.length > 0) return uploads[0].id;
    return null;
  }, [uploadId, uploads]);

  const { data: summary, isLoading: loadingSummary } = trpc.financial.getContasAReceberSummary.useQuery(
    { uploadId: latestUpload! },
    { enabled: !!latestUpload }
  );

  const { data: receitas, isLoading: loadingReceitas } = trpc.financial.getContasAReceber.useQuery(
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
      </DashboardLayout>
    );
  }

  const topClientes = summary?.topClientes
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
          <h1 className="text-3xl font-bold mb-2">Receitas</h1>
          <p className="text-muted-foreground">
            Análise detalhada de contas a receber
          </p>
        </div>

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary?.summary?.totalValor)}
              </div>
              <p className="text-xs text-muted-foreground">
                Valor original
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {formatCurrency(summary?.summary?.totalRecebido)}
              </div>
              <p className="text-xs text-muted-foreground">
                Valor efetivamente recebido
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
                {summary?.summary?.totalRegistros || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Contas a receber
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Top Clientes */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Top 10 Clientes</CardTitle>
            <CardDescription>Clientes com maior valor recebido</CardDescription>
          </CardHeader>
          <CardContent>
            {topClientes.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topClientes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value * 100)} />
                  <Bar dataKey="valor" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                Sem dados disponíveis
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabela de Receitas */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento de Receitas</CardTitle>
            <CardDescription>Lista completa de contas a receber</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingReceitas ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : receitas && receitas.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data Lançamento</TableHead>
                      <TableHead>Data Vencimento</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Valor Recebido</TableHead>
                      <TableHead>Data Recebimento</TableHead>
                      <TableHead>Histórico</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receitas.slice(0, 50).map((receita) => (
                      <TableRow key={receita.id}>
                        <TableCell className="font-medium">{receita.cliente || "-"}</TableCell>
                        <TableCell>{formatDate(receita.dataLancamento)}</TableCell>
                        <TableCell>{formatDate(receita.dataVencimento)}</TableCell>
                        <TableCell>{formatCurrency(receita.valor)}</TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {formatCurrency(receita.valorRecebido)}
                        </TableCell>
                        <TableCell>{formatDate(receita.dataRecebimento)}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {receita.historico || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {receitas.length > 50 && (
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Mostrando 50 de {receitas.length} registros
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma receita encontrada
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
