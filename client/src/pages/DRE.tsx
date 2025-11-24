import { useMemo, useState } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, DollarSign, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList, Cell } from "recharts";
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

  // Buscar dados do DRE (com filtro de mês)
  const { data: dreData, isLoading: loadingDRE } = trpc.financial.getDRESummary.useQuery(
    { uploadId: latestUpload!, mes: selectedMonth ?? undefined },
    { enabled: !!latestUpload }
  );

  // Buscar dados mensais para gráfico
  const { data: dadosMensais } = trpc.financial.getDadosMensais.useQuery(
    { uploadId: latestUpload! },
    { enabled: !!latestUpload }
  );

  // Buscar dados totais (sem filtro) para comparação
  const { data: dreTotal } = trpc.financial.getDRESummary.useQuery(
    { uploadId: latestUpload! },
    { enabled: !!latestUpload && !!selectedMonth } // Só busca total quando há filtro de mês
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

  if (loadingDRE) {
    return (
      <div className="container max-w-7xl py-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!dreData) {
    return (
      <div className="container max-w-7xl py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Sem dados disponíveis</h2>
          <p className="text-muted-foreground">
            Não há dados financeiros para exibir o DRE.
          </p>
        </div>
      </div>
    );
  }

  const totalReceitas = dreData.receitas.total;
  const totalDespesas = dreData.despesas.totalPago;
  const totalFolha = dreData.folha.totalFolha;
  const lucroOperacional = dreData.resultado.lucroOperacional;
  const lucroLiquido = dreData.resultado.lucroLiquido;
  const margemOperacional = dreData.resultado.margemOperacional;
  const margemLiquida = dreData.resultado.margemLiquida;

  // Dados para gráfico de DRE
  const dreChartData = [
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
            Análise completa do resultado financeiro {selectedMonth ? `(mês ${selectedMonth})` : "(geral)"}
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

      {/* Comparação Mensal vs Total (quando há filtro) */}
      {selectedMonth && dreTotal && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Comparação: Mês {selectedMonth} vs Total</CardTitle>
            <CardDescription>
              Comparativo entre o mês selecionado e o total geral
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Mês Selecionado */}
              <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <h4 className="font-semibold text-base mb-4">Mês {selectedMonth}</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Receitas</p>
                    <div className="text-xl font-bold text-green-600">
                      {formatCurrency(totalReceitas)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Custos</p>
                    <div className="text-xl font-semibold text-orange-600">
                      {formatCurrency(totalDespesas + totalFolha)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 pl-2">
                      <span>Despesas: {formatCurrency(totalDespesas)}</span>
                      <span className="mx-2">•</span>
                      <span>Folha: {formatCurrency(totalFolha)}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Resultado Líquido</p>
                    <div className={`text-2xl font-bold ${lucroLiquido >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {lucroLiquido >= 0 ? "+" : ""}{formatCurrency(lucroLiquido)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Margem: {margemLiquida.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Total Geral */}
              <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <h4 className="font-semibold text-base mb-4">Total Geral</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Receitas</p>
                    <div className="text-xl font-bold text-green-600">
                      {formatCurrency(dreTotal.receitas.total)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Custos</p>
                    <div className="text-xl font-semibold text-orange-600">
                      {formatCurrency(dreTotal.despesas.totalPago + dreTotal.folha.totalFolha)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 pl-2">
                      <span>Despesas: {formatCurrency(dreTotal.despesas.totalPago)}</span>
                      <span className="mx-2">•</span>
                      <span>Folha: {formatCurrency(dreTotal.folha.totalFolha)}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Resultado Líquido</p>
                    <div className={`text-2xl font-bold ${dreTotal.resultado.lucroLiquido >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {dreTotal.resultado.lucroLiquido >= 0 ? "+" : ""}{formatCurrency(dreTotal.resultado.lucroLiquido)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Margem: {dreTotal.resultado.margemLiquida.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            <BarChart data={dreChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(229, 231, 235, 0.3)" />
              <XAxis 
                dataKey="categoria" 
                stroke="#6b7280"
                fontSize={12}
                tick={{ fill: "#9ca3af" }}
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
              <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                {dreChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.cor} />
                ))}
                <LabelList
                  dataKey="valor"
                  position="top"
                  formatter={(value: number) => (value !== 0 ? formatCurrency(value * 100) : "")}
                  fill="#f3f4f6"
                  fontSize={10}
                />
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
      {dadosMensais && dadosMensais.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evolução Mensal do Resultado</CardTitle>
            <CardDescription>
              Acompanhamento do lucro/prejuízo por mês {selectedMonth ? `(filtrado: mês ${selectedMonth})` : "(todos os meses)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={filteredDadosMensais} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
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
                <Bar 
                  dataKey="receitas" 
                  fill={SERIES_COLORS.receitas} 
                  name="Receitas"
                  radius={[4, 4, 0, 0]}
                >
                  <LabelList
                    dataKey="receitas"
                    position="top"
                    formatter={(value: number) => (value > 0 ? formatCurrency(value) : "")}
                    fill="#f3f4f6"
                    fontSize={9}
                  />
                </Bar>
                <Bar 
                  dataKey="despesas" 
                  fill={SERIES_COLORS.despesas} 
                  name="Despesas"
                  radius={[4, 4, 0, 0]}
                >
                  <LabelList
                    dataKey="despesas"
                    position="top"
                    formatter={(value: number) => (value > 0 ? formatCurrency(value) : "")}
                    fill="#f3f4f6"
                    fontSize={9}
                  />
                </Bar>
                <Bar 
                  dataKey="resultado" 
                  fill={SERIES_COLORS.resultado} 
                  name="Resultado"
                  radius={[4, 4, 0, 0]}
                >
                  <LabelList
                    dataKey="resultado"
                    position="top"
                    formatter={(value: number) => (value !== 0 ? formatCurrency(value) : "")}
                    fill="#f3f4f6"
                    fontSize={9}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
