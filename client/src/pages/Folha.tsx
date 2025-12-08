import { useMemo } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Loader2, Briefcase, UserCheck, DollarSign, Award, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// DashboardLayout removido - agora é gerenciado pelo App.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { DataTable } from "@/components/DataTable";
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

  const { data: uploads, isLoading: loadingUploads } = trpc.financial.listUploads.useQuery();
  const latestUpload = useMemo(() => {
    if (uploadId) return parseInt(uploadId);
    if (uploads && uploads.length > 0) return uploads[0].id;
    return null;
  }, [uploadId, uploads]);

  const { data: summary, isLoading: loadingSummary } = trpc.financial.getFolhaPagamentoSummary.useQuery(
    { uploadId: latestUpload! },
    { 
      enabled: !!latestUpload,
      staleTime: 2 * 60 * 1000, // 2 minutos
    }
  );

  const { data: folha, isLoading: loadingFolha } = trpc.financial.getFolhaPagamento.useQuery(
    { uploadId: latestUpload! },
    { 
      enabled: !!latestUpload,
      staleTime: 3 * 60 * 1000,
    }
  );

  // Buscar folha separada por tipo (Salário, Comissão, Premiação)
  const { data: folhaSeparada, isLoading: loadingFolhaSeparada } = trpc.financial.getFolhaPagamentoSeparada.useQuery(
    { uploadId: latestUpload! },
    { 
      enabled: !!latestUpload,
      staleTime: 3 * 60 * 1000,
    }
  );

  // Combinar todos os estados de loading
  const isLoading = loadingUploads || (!!latestUpload && (loadingSummary || loadingFolha || loadingFolhaSeparada));

  // Separar folha em CLT e PJ (sempre executar, mesmo que folha seja undefined)
  // Usar tipoVinculo do banco se disponível, senão usar heurística
  const { folhaCLT, folhaPJ, folhaIndefinida } = useMemo(() => {
    if (!folha) return { folhaCLT: [], folhaPJ: [], folhaIndefinida: [] };
    
    const clt: typeof folha = [];
    const pj: typeof folha = [];
    const indefinida: typeof folha = [];
    
    folha.forEach((item) => {
      // Priorizar tipoVinculo do banco, se disponível
      let tipo: "CLT" | "PJ" | "INDEFINIDO";
      if (item.tipoVinculo && (item.tipoVinculo === "CLT" || item.tipoVinculo === "PJ")) {
        tipo = item.tipoVinculo;
      } else {
        // Fallback para heurística se tipoVinculo não estiver disponível
        tipo = identificarTipoVinculo(item.tipoPagamento, item.area);
      }
      
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

  // Calcular totais por tipo de pagamento CLT (usando dados do backend)
  const totaisPorTipo = useMemo(() => {
    if (!folhaSeparada) {
      return {
        salario: { total: 0, funcionarios: 0 },
        premiacao: { total: 0, funcionarios: 0 },
        comissao: { total: 0, funcionarios: 0 },
        outros: { total: 0, funcionarios: 0 },
      };
    }

    // A contagem de funcionários por tipo de pagamento ainda precisa ser feita no frontend
    // pois o backend retorna apenas o total em valor.
    const getFuncionariosPorTipo = (tipoPagamento: string) => {
      if (!folhaCLT) return 0;
      const nomes = new Set(folhaCLT
        .filter(item => item.tipoPagamento?.toUpperCase() === tipoPagamento)
        .map(item => item.nome)
      );
      return nomes.size;
    };

    return {
      salario: { total: folhaSeparada.salario, funcionarios: getFuncionariosPorTipo('SALÁRIO') },
      premiacao: { total: folhaSeparada.premiacao, funcionarios: getFuncionariosPorTipo('PREMIAÇÃO') },
      comissao: { total: folhaSeparada.comissao, funcionarios: getFuncionariosPorTipo('COMISSÃO VENDAS') },
      outros: { total: 0, funcionarios: 0 }, // Outros não é calculado separadamente no backend
    };
  }, [folhaSeparada, folhaCLT]);

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

  // Função auxiliar para calcular gráficos por tipo de pagamento
  const calcularGraficosPorTipo = (items: typeof folhaCLT) => {
    const areaMap = new Map<string, number>();
    items.forEach((item) => {
      const area = item.area || "Sem área";
      const total = item.total || 0;
      areaMap.set(area, (areaMap.get(area) || 0) + total);
    });
    const custoPorArea = Array.from(areaMap.entries())
      .map(([area, total]) => ({ name: area, value: total / 100 }))
      .sort((a, b) => b.value - a.value);

    const funcionarioMap = new Map<string, number>();
    items.forEach((item) => {
      const nome = item.nome;
      const total = item.total || 0;
      funcionarioMap.set(nome, (funcionarioMap.get(nome) || 0) + total);
    });
    const topFuncionarios = Array.from(funcionarioMap.entries())
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map(item => ({
        name: item.nome,
        valor: item.total / 100,
      }));

    return { custoPorArea, topFuncionarios };
  };

  // Separar folha CLT por tipo de pagamento
  const folhaSalario = useMemo(() => {
    if (!folhaCLT) return [];
    return folhaCLT.filter(item => 
      item.tipoPagamento?.toUpperCase().includes('SALÁRIO') || 
      item.tipoPagamento?.toUpperCase().includes('SALARIO')
    );
  }, [folhaCLT]);

  const folhaPremiacao = useMemo(() => {
    if (!folhaCLT) return [];
    return folhaCLT.filter(item => 
      item.tipoPagamento?.toUpperCase().includes('PREMIAÇÃO') ||
      item.tipoPagamento?.toUpperCase().includes('PREMIACAO')
    );
  }, [folhaCLT]);

  const folhaComissao = useMemo(() => {
    if (!folhaCLT) return [];
    return folhaCLT.filter(item => 
      item.tipoPagamento?.toUpperCase().includes('COMISSÃO') ||
      item.tipoPagamento?.toUpperCase().includes('COMISSAO')
    );
  }, [folhaCLT]);

  const folhaOutros = useMemo(() => {
    if (!folhaCLT) return [];
    return folhaCLT.filter(item => {
      const tipo = item.tipoPagamento?.toUpperCase() || '';
      return !tipo.includes('SALÁRIO') && 
             !tipo.includes('SALARIO') &&
             !tipo.includes('PREMIAÇÃO') &&
             !tipo.includes('PREMIACAO') &&
             !tipo.includes('COMISSÃO') &&
             !tipo.includes('COMISSAO');
    });
  }, [folhaCLT]);

  // Gráficos por tipo de pagamento
  const graficosSalario = useMemo(() => calcularGraficosPorTipo(folhaSalario), [folhaSalario]);
  const graficosPremiacao = useMemo(() => calcularGraficosPorTipo(folhaPremiacao), [folhaPremiacao]);
  const graficosComissao = useMemo(() => calcularGraficosPorTipo(folhaComissao), [folhaComissao]);
  const graficosOutros = useMemo(() => calcularGraficosPorTipo(folhaOutros), [folhaOutros]);

  // Verificar se há dados após todos os hooks serem executados
  if (!latestUpload && !loadingUploads) {
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

  if (isLoading) {
    return (
      <div className="container max-w-7xl py-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-4 mb-8">
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
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

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
            {/* Cards de Resumo por Tipo de Pagamento CLT */}
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Salários</CardTitle>
                  <DollarSign className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(totaisPorTipo.salario.total)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totaisPorTipo.salario.funcionarios} funcionários
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Premiações</CardTitle>
                  <Award className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">
                    {formatCurrency(totaisPorTipo.premiacao.total)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totaisPorTipo.premiacao.funcionarios} funcionários
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Comissões</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(totaisPorTipo.comissao.total)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totaisPorTipo.comissao.funcionarios} funcionários
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Outros</CardTitle>
                  <Users className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-600">
                    {formatCurrency(totaisPorTipo.outros.total)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totaisPorTipo.outros.funcionarios} funcionários
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs por Tipo de Pagamento dentro de CLT */}
            <Tabs defaultValue="salario" className="space-y-6">
              <TabsList className="grid w-full max-w-2xl grid-cols-4">
                <TabsTrigger value="salario" className="flex items-center gap-2">
                  <DollarSign className="h-3 w-3" />
                  Salários
                </TabsTrigger>
                <TabsTrigger value="premiacao" className="flex items-center gap-2">
                  <Award className="h-3 w-3" />
                  Premiações
                </TabsTrigger>
                <TabsTrigger value="comissao" className="flex items-center gap-2">
                  <TrendingUp className="h-3 w-3" />
                  Comissões
                </TabsTrigger>
                <TabsTrigger value="outros" className="flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  Outros
                </TabsTrigger>
              </TabsList>

              {/* Aba Salários */}
              <TabsContent value="salario" className="space-y-6">
                {/* Gráficos Salários */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Custo por Área - Salários */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Custo por Área - Salários</CardTitle>
                      <CardDescription>Distribuição de salários por departamento</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {graficosSalario.custoPorArea.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart data={graficosSalario.custoPorArea} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
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
                          Sem dados de salários disponíveis
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Top 10 Funcionários - Salários */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Top 10 Funcionários - Salários</CardTitle>
                      <CardDescription>Maiores salários por funcionário</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {graficosSalario.topFuncionarios.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart data={graficosSalario.topFuncionarios} layout="vertical">
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
                          Sem dados de salários disponíveis
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Tabela Salários */}
                <Card>
                  <CardHeader>
                    <CardTitle>Detalhamento Salários</CardTitle>
                    <CardDescription>Lista completa de salários</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingFolha ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <DataTable
                        data={folhaSalario}
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
                    emptyMessage="Nenhum dado de salários encontrado"
                  />
                )}
              </CardContent>
            </Card>
              </TabsContent>

              {/* Aba Premiações */}
              <TabsContent value="premiacao" className="space-y-6">
                {/* Gráficos Premiações */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Custo por Área - Premiações */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Custo por Área - Premiações</CardTitle>
                      <CardDescription>Distribuição de premiações por departamento</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {graficosPremiacao.custoPorArea.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart data={graficosPremiacao.custoPorArea} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
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
                              fill="#f59e0b"
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
                          Sem dados de premiações disponíveis
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Top 10 Funcionários - Premiações */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Top 10 Funcionários - Premiações</CardTitle>
                      <CardDescription>Maiores premiações por funcionário</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {graficosPremiacao.topFuncionarios.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart data={graficosPremiacao.topFuncionarios} layout="vertical">
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
                              fill="#f59e0b"
                              radius={[0, 4, 4, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                          Sem dados de premiações disponíveis
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Tabela Premiações */}
                <Card>
                  <CardHeader>
                    <CardTitle>Detalhamento Premiações</CardTitle>
                    <CardDescription>Lista completa de premiações</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingFolha ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <DataTable
                        data={folhaPremiacao}
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
                        emptyMessage="Nenhum dado de premiações encontrado"
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aba Comissões */}
              <TabsContent value="comissao" className="space-y-6">
                {/* Gráficos Comissões */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Custo por Área - Comissões */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Custo por Área - Comissões</CardTitle>
                      <CardDescription>Distribuição de comissões por departamento</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {graficosComissao.custoPorArea.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart data={graficosComissao.custoPorArea} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
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
                              fill="#10b981"
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
                          Sem dados de comissões disponíveis
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Top 10 Funcionários - Comissões */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Top 10 Funcionários - Comissões</CardTitle>
                      <CardDescription>Maiores comissões por funcionário</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {graficosComissao.topFuncionarios.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart data={graficosComissao.topFuncionarios} layout="vertical">
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
                              fill="#10b981"
                              radius={[0, 4, 4, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                          Sem dados de comissões disponíveis
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Tabela Comissões */}
                <Card>
                  <CardHeader>
                    <CardTitle>Detalhamento Comissões</CardTitle>
                    <CardDescription>Lista completa de comissões</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingFolha ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <DataTable
                        data={folhaComissao}
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
                              <span className="font-bold text-green-600">
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
                        emptyMessage="Nenhum dado de comissões encontrado"
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aba Outros */}
              <TabsContent value="outros" className="space-y-6">
                {/* Gráficos Outros */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Custo por Área - Outros */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Custo por Área - Outros</CardTitle>
                      <CardDescription>Distribuição de outros pagamentos por departamento</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {graficosOutros.custoPorArea.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart data={graficosOutros.custoPorArea} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
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
                              fill="#6b7280"
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
                          Sem dados de outros pagamentos disponíveis
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Top 10 Funcionários - Outros */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Top 10 Funcionários - Outros</CardTitle>
                      <CardDescription>Maiores outros pagamentos por funcionário</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {graficosOutros.topFuncionarios.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart data={graficosOutros.topFuncionarios} layout="vertical">
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
                              fill="#6b7280"
                              radius={[0, 4, 4, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                          Sem dados de outros pagamentos disponíveis
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Tabela Outros */}
                <Card>
                  <CardHeader>
                    <CardTitle>Detalhamento Outros Pagamentos</CardTitle>
                    <CardDescription>Lista completa de outros pagamentos CLT</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingFolha ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <DataTable
                        data={folhaOutros}
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
                              <span className="font-bold text-gray-600">
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
                        emptyMessage="Nenhum dado de outros pagamentos encontrado"
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
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
