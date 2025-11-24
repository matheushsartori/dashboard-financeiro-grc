import { useMemo } from "react";
import { useSearch, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
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

export default function ReceitasEmpresa() {
  const searchParams = new URLSearchParams(useSearch());
  const cliente = searchParams.get("cliente");
  const uploadId = searchParams.get("uploadId");
  const mes = searchParams.get("mes");
  const [, setLocation] = useLocation();

  const decodedCliente = cliente ? decodeURIComponent(cliente) : null;
  const uploadIdNum = uploadId ? parseInt(uploadId) : null;
  const mesNum = mes ? parseInt(mes) : null;

  const { data: receitas, isLoading } = trpc.financial.getReceitasPorEmpresaDetalhes.useQuery(
    { 
      uploadId: uploadIdNum!, 
      cliente: decodedCliente!,
      mes: mesNum ?? undefined
    },
    { enabled: !!uploadIdNum && !!decodedCliente }
  );

  // Calcular estatísticas
  const stats = useMemo(() => {
    if (!receitas || receitas.length === 0) {
      return {
        totalValor: 0,
        totalRecebido: 0,
        quantidade: 0,
        media: 0,
        ultimoPagamento: null,
      };
    }

    const totalValor = receitas.reduce((sum, r) => sum + (r.valor || 0), 0);
    const totalRecebido = receitas.reduce((sum, r) => sum + (r.valorRecebido || r.valor || 0), 0);
    const quantidade = receitas.length;
    const media = quantidade > 0 ? totalRecebido / quantidade : 0;
    
    const pagamentosComData = receitas
      .filter(r => r.dataRecebimento)
      .map(r => new Date(r.dataRecebimento!))
      .sort((a, b) => b.getTime() - a.getTime());
    
    const ultimoPagamento = pagamentosComData.length > 0 ? pagamentosComData[0] : null;

    return {
      totalValor,
      totalRecebido,
      quantidade,
      media,
      ultimoPagamento,
    };
  }, [receitas]);

  if (!uploadIdNum || !decodedCliente) {
    return (
      <DashboardLayout>
        <div className="container max-w-7xl py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">Parâmetros inválidos</h2>
            <p className="text-muted-foreground mb-6">
              Cliente ou upload não especificado.
            </p>
            <Button onClick={() => setLocation("/receitas")}>
              Voltar para Receitas
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container max-w-7xl py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/receitas")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Receitas
          </Button>
          <div>
            <h1 className="text-3xl font-bold mb-2">{decodedCliente}</h1>
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
              <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalRecebido)}
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
              Lista completa de pagamentos desta empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : receitas && receitas.length > 0 ? (
              <DataTable
                data={receitas}
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
                    key: "valorRecebido",
                    label: "Valor Recebido",
                    render: (value, row) => (
                      <span className="text-green-600 font-semibold">
                        {formatCurrency(value || row.valor || 0)}
                      </span>
                    ),
                    className: "text-right",
                  },
                  {
                    key: "dataRecebimento",
                    label: "Data Recebimento",
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
                Nenhum pagamento encontrado para esta empresa
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

