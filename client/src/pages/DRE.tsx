import { useMemo, useState } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, DollarSign, Loader2 } from "lucide-react";
// DashboardLayout removido - agora é gerenciado pelo App.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
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

export default function DRE() {
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
    );
  }

  if (isLoading) {
    return (
      <div className="container max-w-7xl py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // CORRIGIDO: Usar totalValor se totalRecebido for 0 ou null
  const totalReceitasValor = summary?.contasReceber?.totalValor || 0;
  const totalReceitasRecebido = summary?.contasReceber?.totalRecebido || 0;
  const totalReceitas = totalReceitasRecebido > 0 ? totalReceitasRecebido : totalReceitasValor;
  
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
      cor: SERIES_COLORS.receitas,
    },
    {
      categoria: "Despesas",
      valor: (totalDespesas / 100) * -1,
      cor: SERIES_COLORS.despesas,
    },
    {
      categoria: "Folha",
      valor: (totalFolha / 100) * -1,
      cor: SERIES_COLORS.folha,
    },
    {
      categoria: "Resultado",
      valor: lucroLiquido / 100,
      cor: lucroLiquido >= 0 ? SERIES_COLORS.resultado : SERIES_COLORS.despesas,
    },
  ];

  return (
      <div className="container max-w-7xl py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">DRE - Demonstração do Resultado do Exercício</h1>
            <p className="text-muted-foreground">
              Análise completa do resultado financeiro
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
                Receitas operacionais {selectedMonth ? `(mês ${selectedMonth})` : "(geral)"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro Operacional</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${lucroOperacional >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(lucroOperacional)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
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
              <div className={`text-2xl font-bold ${lucroLiquido >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(lucroLiquido)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
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
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalDespesas + totalFolha)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Despesas + Folha
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de DRE */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Estrutura do DRE</CardTitle>
            <CardDescription>
              Composição do resultado financeiro {selectedMonth ? `(mês ${selectedMonth})` : "(geral)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={450}>
              <BarChart data={dreData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="categoria" 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  stroke="#6b7280"
                  fontSize={11}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value * 100)}
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "6px" }}
                />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
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
            <CardDescription>
              Demonstração completa do resultado {selectedMonth ? `(mês ${selectedMonth})` : "(geral)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60%] font-semibold">Descrição</TableHead>
                    <TableHead className="text-right font-semibold">Valor</TableHead>
                    <TableHead className="text-right font-semibold">% Receita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="font-bold bg-green-50 dark:bg-green-950/20">
                    <TableCell className="font-bold text-base">RECEITA OPERACIONAL BRUTA</TableCell>
                    <TableCell className="text-right text-green-600 font-bold text-base">
                      {formatCurrency(totalReceitas)}
                    </TableCell>
                    <TableCell className="text-right font-bold">100,0%</TableCell>
                  </TableRow>

                  <TableRow className="font-semibold">
                    <TableCell className="pl-8">(-) Despesas Operacionais</TableCell>
                    <TableCell className="text-right text-red-600 font-semibold">
                      ({formatCurrency(totalDespesas)})
                    </TableCell>
                    <TableCell className="text-right">
                      {totalReceitas > 0 ? ((totalDespesas / totalReceitas) * 100).toFixed(1) : "0,0"}%
                    </TableCell>
                  </TableRow>

                  <TableRow className="font-bold bg-blue-50 dark:bg-blue-950/20">
                    <TableCell className="font-bold text-base">= LUCRO OPERACIONAL</TableCell>
                    <TableCell className={`text-right font-bold text-base ${lucroOperacional >= 0 ? "text-blue-600" : "text-red-600"}`}>
                      {formatCurrency(lucroOperacional)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {margemOperacional.toFixed(1)}%
                    </TableCell>
                  </TableRow>

                  <TableRow className="font-semibold">
                    <TableCell className="pl-8">(-) Folha de Pagamento</TableCell>
                    <TableCell className="text-right text-red-600 font-semibold">
                      ({formatCurrency(totalFolha)})
                    </TableCell>
                    <TableCell className="text-right">
                      {totalReceitas > 0 ? ((totalFolha / totalReceitas) * 100).toFixed(1) : "0,0"}%
                    </TableCell>
                  </TableRow>

                  <TableRow className="font-bold bg-primary/10 text-lg border-t-2 border-primary">
                    <TableCell className="font-bold text-lg">= LUCRO LÍQUIDO</TableCell>
                    <TableCell className={`text-right font-bold text-lg ${lucroLiquido >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(lucroLiquido)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      {margemLiquida.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Evolução Mensal do Resultado */}
        {filteredDadosMensais && filteredDadosMensais.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Evolução Mensal do Resultado</CardTitle>
              <CardDescription>
                Acompanhamento do lucro/prejuízo por mês {selectedMonth ? `(filtrado: mês ${selectedMonth})` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={filteredDadosMensais} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
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
                  <Bar 
                    dataKey="receitas" 
                    fill={SERIES_COLORS.receitas} 
                    name="Receitas"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="despesas" 
                    fill={SERIES_COLORS.despesas} 
                    name="Despesas"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="resultado" 
                    fill={SERIES_COLORS.resultado} 
                    name="Resultado"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
  );
}
