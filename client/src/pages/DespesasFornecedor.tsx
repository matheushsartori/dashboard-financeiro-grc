import { useMemo } from "react";
import { useSearch, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
// DashboardLayout removido - agora é gerenciado pelo App.tsx
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function formatCurrency(cents: number | null | undefined): string {
  if (!cents || cents === 0) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("pt-BR");
}

export default function DespesasFornecedor() {
  const searchParams = new URLSearchParams(useSearch());
  const fornecedor = searchParams.get("fornecedor");
  const uploadId = searchParams.get("uploadId");
  const mes = searchParams.get("mes");
  const [, setLocation] = useLocation();

  const decodedFornecedor = fornecedor ? decodeURIComponent(fornecedor) : null;
  const uploadIdNum = uploadId ? parseInt(uploadId) : null;
  const mesNum = mes ? parseInt(mes) : null;

  const { data: despesas, isLoading } = trpc.financial.getDespesasPorFornecedorDetalhes.useQuery(
    { 
      uploadId: uploadIdNum!, 
      fornecedor: decodedFornecedor!,
      mes: mesNum ?? undefined
    },
    { enabled: !!uploadIdNum && !!decodedFornecedor }
  );

  // Calcular estatísticas
  const stats = useMemo(() => {
    if (!despesas || despesas.length === 0) {
      return {
        totalValor: 0,
        totalPago: 0,
        quantidade: 0,
        media: 0,
        ultimoPagamento: null,
      };
    }

    const totalValor = despesas.reduce((sum, d) => sum + (d.valor || 0), 0);
    const totalPago = despesas.reduce((sum, d) => sum + (d.valorPago || d.valor || 0), 0);
    const quantidade = despesas.length;
    const media = quantidade > 0 ? totalPago / quantidade : 0;
    
    const pagamentosComData = despesas
      .filter(d => d.dataPagamento)
      .map(d => new Date(d.dataPagamento!))
      .sort((a, b) => b.getTime() - a.getTime());
    
    const ultimoPagamento = pagamentosComData.length > 0 ? pagamentosComData[0] : null;

    return {
      totalValor,
      totalPago,
      quantidade,
      media,
      ultimoPagamento,
    };
  }, [despesas]);

  if (!uploadIdNum || !decodedFornecedor) {
    return (
      <div className="container max-w-7xl py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Parâmetros inválidos</h2>
          <p className="text-muted-foreground mb-6">
            Fornecedor ou upload não especificado.
          </p>
          <Button onClick={() => setLocation("/despesas")}>
            Voltar para Despesas
          </Button>
        </div>
      </div>
    );
  }

  return (
      <div className="container max-w-7xl py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/despesas")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Despesas
          </Button>
          <div>
            <h1 className="text-3xl font-bold mb-2">{decodedFornecedor}</h1>
            <p className="text-muted-foreground">
              Detalhamento de todos os pagamentos {mesNum ? `do mês ${mesNum}` : "geral"}
            </p>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid gap-4 md:grid-cols-5 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Emitido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalValor)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.totalPago)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quantidade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.quantidade}
              </div>
              <p className="text-xs text-muted-foreground">
                Pagamentos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Média</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.media)}
              </div>
              <p className="text-xs text-muted-foreground">
                Por pagamento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Último Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.ultimoPagamento ? formatDate(stats.ultimoPagamento) : "N/A"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Pagamentos */}
        <Card>
          <CardHeader>
            <CardTitle>Pagamentos Detalhados</CardTitle>
            <CardDescription>
              Lista completa de pagamentos deste fornecedor
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : despesas && despesas.length > 0 ? (
              <DataTable
                data={despesas}
                columns={[
                  {
                    key: "dataLancamento",
                    label: "Data Lançamento",
                    render: (value) => formatDate(value),
                  },
                  {
                    key: "dataVencimento",
                    label: "Data Vencimento",
                    render: (value) => formatDate(value),
                  },
                  {
                    key: "valor",
                    label: "Valor Emitido",
                    render: (value) => formatCurrency(value),
                    className: "text-right",
                  },
                  {
                    key: "valorPago",
                    label: "Valor Pago",
                    render: (value, row) => (
                      <span className="text-red-600 font-semibold">
                        {formatCurrency(value || row.valor || 0)}
                      </span>
                    ),
                    className: "text-right",
                  },
                  {
                    key: "dataPagamento",
                    label: "Data Pagamento",
                    render: (value) => (
                      <span className={value ? "" : "text-muted-foreground"}>
                        {value ? formatDate(value) : "Pendente"}
                      </span>
                    ),
                  },
                  {
                    key: "mes",
                    label: "Mês",
                    render: (value) => value ? (
                      <Badge variant="outline">Mês {value}</Badge>
                    ) : "-",
                  },
                  {
                    key: "historico",
                    label: "Histórico",
                    render: (value) => (
                      <span className="max-w-xs truncate block" title={value || ""}>
                        {value || "-"}
                      </span>
                    ),
                  },
                ]}
                searchable={true}
                searchPlaceholder="Buscar por histórico..."
                searchKeys={["historico"]}
                pageSize={15}
                emptyMessage="Nenhum pagamento encontrado"
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum pagamento encontrado para este fornecedor
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}

