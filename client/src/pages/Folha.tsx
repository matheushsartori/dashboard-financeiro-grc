import { useMemo } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Loader2, Briefcase, UserCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// DashboardLayout removido - agora é gerenciado pelo App.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { DataTable } from "@/components/DataTable";
import { SERIES_COLORS } from "@/lib/chartColors";
import { Badge } from "@/components/ui/badge";

function formatCurrency(cents: number | null | undefined): string {
  if (!cents || cents === 0) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

// Função para identificar se é CLT ou PJ baseado no tipoPagamento e área
function identificarTipoVinculo(tipoPagamento: string | null | undefined, area: string | null | undefined): "CLT" | "PJ" | "INDEFINIDO" {
  if (!tipoPagamento) return "INDEFINIDO";
  
  const tipoUpper = tipoPagamento.toUpperCase();
  
  // Identificadores comuns de PJ
  if (
    tipoUpper.includes("PJ") ||
    tipoUpper.includes("NOTA FISCAL") ||
    tipoUpper.includes("NF") ||
    tipoUpper.includes("PRESTAÇÃO") ||
    tipoUpper.includes("SERVIÇO") ||
    tipoUpper.includes("CONSULTORIA") ||
    tipoUpper.includes("TERCEIRIZADO")
  ) {
    return "PJ";
  }
  
  // Identificadores comuns de CLT
  if (
    tipoUpper.includes("SALÁRIO") ||
    tipoUpper.includes("SALARIO") ||
    tipoUpper.includes("13º") ||
    tipoUpper.includes("FÉRIAS") ||
    tipoUpper.includes("FERIAS") ||
    tipoUpper.includes("ADICIONAL") ||
    tipoUpper.includes("BONUS") ||
    tipoUpper.includes("BÔNUS") ||
    tipoUpper.includes("PREMIAÇÃO") ||
    tipoUpper.includes("COMISSÃO") ||
    tipoUpper.includes("COMISSAO")
  ) {
    return "CLT";
  }
  
  return "INDEFINIDO";
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

  // Separar folha em CLT e PJ
  const { folhaCLT, folhaPJ, folhaIndefinida } = useMemo(() => {
    if (!folha) return { folhaCLT: [], folhaPJ: [], folhaIndefinida: [] };
    
    const clt: typeof folha = [];
    const pj: typeof folha = [];
    const indefinida: typeof folha = [];
    
    folha.forEach((item) => {
      const tipo = identificarTipoVinculo(item.tipoPagamento, item.area);
      if (tipo === "CLT") {
        clt.push(item);
      } else if (tipo === "PJ") {
        pj.push(item);
      } else {
        indefinida.push(item);
      }
    });
    
    return { folhaCLT: clt, folhaPJ: pj, folhaIndefinida: indefinida };
  }, [folha]);

  // Calcular totais por tipo
  const totaisCLT = useMemo(() => {
    const total = folhaCLT.reduce((sum, item) => sum + (item.total || 0), 0);
    const funcionarios = new Set(folhaCLT.map(item => item.nome)).size;
    return { total, funcionarios };
  }, [folhaCLT]);

  const totaisPJ = useMemo(() => {
    const total = folhaPJ.reduce((sum, item) => sum + (item.total || 0), 0);
    const funcionarios = new Set(folhaPJ.map(item => item.nome)).size;
    return { total, funcionarios };
  }, [folhaPJ]);

  // Gráficos por área para CLT
  const custoPorAreaCLT = useMemo(() => {
    const areaMap = new Map<string, number>();
    folhaCLT.forEach((item) => {
      const area = item.area || "Sem área";
      const total = item.total || 0;
      areaMap.set(area, (areaMap.get(area) || 0) + total);
    });
    return Array.from(areaMap.entries())
      .map(([area, total]) => ({ name: area, value: total / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [folhaCLT]);

  // Gráficos por área para PJ
  const custoPorAreaPJ = useMemo(() => {
    const areaMap = new Map<string, number>();
    folhaPJ.forEach((item) => {
      const area = item.area || "Sem área";
      const total = item.total || 0;
      areaMap.set(area, (areaMap.get(area) || 0) + total);
    });
    return Array.from(areaMap.entries())
      .map(([area, total]) => ({ name: area, value: total / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [folhaPJ]);

  // Top funcionários CLT
  const topFuncionariosCLT = useMemo(() => {
    const funcionarioMap = new Map<string, number>();
    folhaCLT.forEach((item) => {
      const nome = item.nome;
      const total = item.total || 0;
      funcionarioMap.set(nome, (funcionarioMap.get(nome) || 0) + total);
    });
    return Array.from(funcionarioMap.entries())
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map(item => ({
        name: item.nome,
        valor: item.total / 100,
      }));
  }, [folhaCLT]);

  // Top funcionários PJ
  const topFuncionariosPJ = useMemo(() => {
    const funcionarioMap = new Map<string, number>();
    folhaPJ.forEach((item) => {
      const nome = item.nome;
      const total = item.total || 0;
      funcionarioMap.set(nome, (funcionarioMap.get(nome) || 0) + total);
    });
    return Array.from(funcionarioMap.entries())
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map(item => ({
        name: item.nome,
        valor: item.total / 100,
      }));
  }, [folhaPJ]);

  return (
      <div className="container max-w-7xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Folha de Pagamento</h1>
          <p className="text-muted-foreground">
            Análise de custos com pessoal
          </p>
        </div>

        {/* Cards de Resumo Geral */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
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
              <CardTitle className="text-sm font-medium">Total CLT</CardTitle>
              <UserCheck className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(totaisCLT.total)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totaisCLT.funcionarios} funcionários CLT
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total PJ</CardTitle>
              <Briefcase className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(totaisPJ.total)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totaisPJ.funcionarios} prestadores PJ
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
        </div>

        {/* Tabs para CLT e PJ */}
        <Tabs defaultValue="clt" className="mb-8">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="clt" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              CLT ({totaisCLT.funcionarios})
            </TabsTrigger>
            <TabsTrigger value="pj" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              PJ ({totaisPJ.funcionarios})
            </TabsTrigger>
          </TabsList>

          {/* Aba CLT */}
          <TabsContent value="clt" className="space-y-6">
            {/* Gráficos CLT */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Custo por Área CLT */}
              <Card>
                <CardHeader>
                  <CardTitle>Custo por Área - CLT</CardTitle>
                  <CardDescription>Distribuição de custos CLT por departamento</CardDescription>
                </CardHeader>
                <CardContent>
                  {custoPorAreaCLT.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={custoPorAreaCLT} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
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
                          fill="#2563eb"
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
                      Sem dados CLT disponíveis
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top 10 Funcionários CLT */}
              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Funcionários CLT</CardTitle>
                  <CardDescription>Maiores custos por funcionário CLT</CardDescription>
                </CardHeader>
                <CardContent>
                  {topFuncionariosCLT.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={topFuncionariosCLT} layout="vertical">
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
                          fill="#2563eb"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                      Sem dados CLT disponíveis
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tabela CLT */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhamento Folha CLT</CardTitle>
                <CardDescription>
                  Lista completa de pagamentos CLT
                  {folhaIndefinida.length > 0 && (
                    <Badge variant="outline" className="ml-2">
                      {folhaIndefinida.length} registro(s) não classificado(s)
                    </Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingFolha ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <DataTable
                    data={folhaCLT}
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
                          <Badge variant="outline" className="text-xs">
                            {value || "-"}
                          </Badge>
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
                          <span className="font-bold text-blue-600">
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
                    emptyMessage="Nenhum dado CLT encontrado"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba PJ */}
          <TabsContent value="pj" className="space-y-6">
            {/* Gráficos PJ */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Custo por Área PJ */}
              <Card>
                <CardHeader>
                  <CardTitle>Custo por Área - PJ</CardTitle>
                  <CardDescription>Distribuição de custos PJ por departamento</CardDescription>
                </CardHeader>
                <CardContent>
                  {custoPorAreaPJ.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={custoPorAreaPJ} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
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
                          fill="#8b5cf6"
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
                      Sem dados PJ disponíveis
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top 10 Prestadores PJ */}
              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Prestadores PJ</CardTitle>
                  <CardDescription>Maiores custos por prestador PJ</CardDescription>
                </CardHeader>
                <CardContent>
                  {topFuncionariosPJ.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={topFuncionariosPJ} layout="vertical">
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
                          fill="#8b5cf6"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                      Sem dados PJ disponíveis
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tabela PJ */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhamento Folha PJ</CardTitle>
                <CardDescription>Lista completa de pagamentos PJ</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingFolha ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <DataTable
                    data={folhaPJ}
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
                          <Badge variant="outline" className="text-xs">
                            {value || "-"}
                          </Badge>
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
                          <span className="font-bold text-purple-600">
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
                    emptyMessage="Nenhum dado PJ encontrado"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
