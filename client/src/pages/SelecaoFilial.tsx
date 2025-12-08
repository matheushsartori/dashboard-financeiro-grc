import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Loader2, XCircle } from "lucide-react";
import { Skeleton } from "@/components/Skeleton";

export default function SelecaoFilial() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const uploadId = searchParams.get("uploadId");

  const { data: uploads, isLoading: loadingUploads } = trpc.financial.listUploads.useQuery(undefined, {
    refetchInterval: (query) => {
      const hasProcessing = query.state.data?.some((u: any) => u.status === "processing");
      return hasProcessing ? 3000 : false;
    },
  });

  const latestUpload = uploadId ? parseInt(uploadId) : (uploads && uploads.length > 0 ? uploads[0].id : null);

  const { data: filiais, isLoading: loadingFiliais } = trpc.financial.getFiliaisDisponiveis.useQuery(
    { uploadId: latestUpload! },
    { enabled: !!latestUpload }
  );

  const currentUpload = uploads?.find(u => u.id === latestUpload);

  const handleSelecionarFilial = (codFilial: number | null) => {
    // Armazenar seleção no localStorage
    if (codFilial === null) {
      localStorage.setItem("selectedFilial", "consolidado");
    } else {
      localStorage.setItem("selectedFilial", codFilial.toString());
    }
    
    // Redirecionar para o dashboard
    const params = new URLSearchParams();
    if (uploadId) params.set("uploadId", uploadId);
    setLocation(`/dashboard?${params.toString()}`);
  };


  if (!latestUpload) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="text-center py-12">
          <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-2xl font-bold mb-2">Nenhum dado importado</h2>
          <p className="text-muted-foreground mb-6">
            Faça o upload de uma planilha Excel para visualizar seus dados financeiros.
          </p>
          <Button asChild>
            <a href="/importacao">Importar Dados</a>
          </Button>
        </div>
      </div>
    );
  }

  if (currentUpload?.status === "processing") {
    return (
      <div className="container max-w-4xl py-8">
        <div className="text-center py-12">
          <Loader2 className="h-16 w-16 mx-auto mb-4 text-primary animate-spin" />
          <h2 className="text-2xl font-bold mb-2">Processando planilha...</h2>
          <p className="text-muted-foreground mb-4">
            A planilha <strong>{currentUpload.fileName}</strong> está sendo processada.
          </p>
          <p className="text-sm text-muted-foreground">
            Isso pode levar alguns minutos para arquivos grandes. Os dados aparecerão automaticamente quando o processamento for concluído.
          </p>
        </div>
      </div>
    );
  }

  if (currentUpload?.status === "failed") {
    return (
      <div className="container max-w-4xl py-8">
        <div className="text-center py-12">
          <XCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-2">Erro ao processar planilha</h2>
          <p className="text-muted-foreground mb-4">
            A planilha <strong>{currentUpload.fileName}</strong> falhou ao ser processada.
          </p>
          {currentUpload.errorMessage && (
            <p className="text-sm text-red-500 mb-4">{currentUpload.errorMessage}</p>
          )}
          <Button asChild>
            <a href="/importacao">Tentar Novamente</a>
          </Button>
        </div>
      </div>
    );
  }

  if (loadingUploads || loadingFiliais) {
    return (
      <div className="container max-w-4xl py-8">
        <Skeleton className="h-10 w-64 mb-4 mx-auto" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-8">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="text-center mb-8">
        <Building2 className="h-16 w-16 mx-auto mb-4 text-primary" />
        <h1 className="text-3xl font-bold mb-2">Selecione o Escopo</h1>
        <p className="text-muted-foreground">
          Visualize o resultado consolidado da Matriz (incluindo todas as filiais) ou o resultado individual de cada filial
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Opção Consolidado */}
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => handleSelecionarFilial(null)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Consolidado GRC
            </CardTitle>
            <CardDescription>Matriz (RP) + Todas as Filiais</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              Selecionar
            </Button>
          </CardContent>
        </Card>

        {/* Filiais dinâmicas */}
        {filiais && filiais.length > 0 ? (
          filiais.map((filial) => (
            <Card
              key={filial.codigo}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleSelecionarFilial(filial.codigo)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {filial.nome}
                </CardTitle>
                <CardDescription>Filial {filial.codigo}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  Selecionar
                </Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Nenhuma filial encontrada</CardTitle>
              <CardDescription>Não há dados de filiais na planilha importada</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}

