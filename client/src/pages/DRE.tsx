import { useMemo } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, DollarSign, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";

function formatCurrency(cents: number | null | undefined): string {
  if (!cents) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export default function DRE() {
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

  const { data: dadosMensais } = trpc.financial.getDadosMensais.useQuery(
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
              Faça o upload de uma planilha Excel para visualizar o DRE.
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
  const lucroOperacional = totalReceitas - totalDespesas;
  const lucroLiquido = totalReceitas - totalDespesas - totalFolha;
  const margemOperacional = totalReceitas > 0 ? (lucroOperacional / totalReceitas) * 100 : 0;
  const margemLiquida = totalReceitas > 0 ? (lucroLiquido / totalReceitas) * 100 : 0;

  // Dados para gráfico de DRE
  const dreData = [
    {
      categoria: "Receitas",
      valor: totalReceitas / 100,
      cor: "#10b981",
    },
    {
      categoria: "Despesas",
      valor: (totalDespesas / 100) * -1,
      cor: "#ef4444",
    },
    {
      categoria: "Folha",
      valor: (totalFolha / 100) * -1,
      cor: "#f59e0b",
    },
    {
      categoria: "Resultado",
      valor: lucroLiquido / 100,
      cor: lucroLiquido >= 0 ? "#3b82f6" : "#dc2626",
    },
  ];

  return (
    <DashboardLayout>
      <div className="container max-w-7xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">DRE - Demonstração do Resultado do Exercício</h1>
          <p className="text-muted-foreground">
            Análise completa do resultado financeiro
          </p>
        </div>

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {formatCurrency(totalReceitas)}
              </div>
              <p className="text-xs text-muted-foreground">
                Receitas operacionais
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro Operacional</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${lucroOperacional >= 0 ? "text-green-500" : "text-red-500"}`}>
                {formatCurrency(lucroOperacional)}
              </div>
              <p className="text-xs text-muted-foreground">
                Margem: {margemOperacional.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
              {lucroLiquido >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${lucroLiquido >= 0 ? "text-green-500" : "text-red-500"}`}>
                {formatCurrency(lucroLiquido)}
              </div>
              <p className="text-xs text-muted-foreground">
                Margem: {margemLiquida.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Custos</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {formatCurrency(totalDespesas + totalFolha)}
              </div>
              <p className="text-xs text-muted-foreground">
                Despesas + Folha
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de DRE */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Estrutura do DRE</CardTitle>
            <CardDescription>Composição do resultado financeiro</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={dreData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="categoria" />
                <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value * 100)} />
                <Bar dataKey="valor" fill="#8884d8">
                  {dreData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.cor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tabela Detalhada do DRE */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>DRE Detalhado</CardTitle>
            <CardDescription>Demonstração completa do resultado</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60%]">Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">% Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="font-bold bg-green-50">
                  <TableCell>RECEITA OPERACIONAL BRUTA</TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatCurrency(totalReceitas)}
                  </TableCell>
                  <TableCell className="text-right">100,0%</TableCell>
                </TableRow>

                <TableRow className="font-semibold">
                  <TableCell className="pl-8">(-) Despesas Operacionais</TableCell>
                  <TableCell className="text-right text-red-600">
                    ({formatCurrency(totalDespesas)})
                  </TableCell>
                  <TableCell className="text-right">
                    {totalReceitas > 0 ? ((totalDespesas / totalReceitas) * 100).toFixed(1) : "0,0"}%
                  </TableCell>
                </TableRow>

                <TableRow className="font-bold bg-blue-50">
                  <TableCell>= LUCRO OPERACIONAL</TableCell>
                  <TableCell className={`text-right ${lucroOperacional >= 0 ? "text-blue-600" : "text-red-600"}`}>
                    {formatCurrency(lucroOperacional)}
                  </TableCell>
                  <TableCell className="text-right">
                    {margemOperacional.toFixed(1)}%
                  </TableCell>
                </TableRow>

                <TableRow className="font-semibold">
                  <TableCell className="pl-8">(-) Folha de Pagamento</TableCell>
                  <TableCell className="text-right text-red-600">
                    ({formatCurrency(totalFolha)})
                  </TableCell>
                  <TableCell className="text-right">
                    {totalReceitas > 0 ? ((totalFolha / totalReceitas) * 100).toFixed(1) : "0,0"}%
                  </TableCell>
                </TableRow>

                <TableRow className="font-bold bg-primary/10 text-lg">
                  <TableCell>= LUCRO LÍQUIDO</TableCell>
                  <TableCell className={`text-right ${lucroLiquido >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(lucroLiquido)}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {margemLiquida.toFixed(1)}%
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Evolução Mensal do Resultado */}
        {dadosMensais && dadosMensais.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Evolução Mensal do Resultado</CardTitle>
              <CardDescription>Acompanhamento do lucro/prejuízo por mês</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={dadosMensais}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mesNome" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(value) => `R$ ${(value / 100000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="receitas" fill="#10b981" name="Receitas" />
                  <Bar dataKey="despesas" fill="#ef4444" name="Despesas" />
                  <Bar dataKey="resultado" fill="#3b82f6" name="Resultado" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
