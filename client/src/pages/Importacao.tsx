import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// DashboardLayout removido - agora é gerenciado pelo App.tsx

export default function Importacao() {
  const [, setLocation] = useLocation();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const utils = trpc.useUtils();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const clearMutation = trpc.financial.clearAllData.useMutation({
    onSuccess: () => {
      toast.success("Todos os dados foram limpos com sucesso!");
      utils.financial.listUploads.invalidate();
      setShowClearConfirm(false);
    },
    onError: (error) => {
      toast.error(`Erro ao limpar dados: ${error.message}`);
    },
  });

  const uploadMutation = trpc.financial.uploadExcel.useMutation({
    onSuccess: (data) => {
      toast.success("Arquivo importado com sucesso!");
      utils.financial.listUploads.invalidate();
      setUploading(false);
      setLocation(`/dashboard?uploadId=${data.uploadId}`);
    },
    onError: (error) => {
      toast.error(`Erro ao importar arquivo: ${error.message}`);
      setUploading(false);
    },
    // Timeout de 5 minutos para uploads grandes
    retry: false,
  });

  const { data: uploads, isLoading: loadingUploads } = trpc.financial.listUploads.useQuery();

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        toast.error("Por favor, selecione um arquivo Excel (.xlsx ou .xls)");
        return;
      }

      setUploading(true);

      try {
        // Usar FormData para upload multipart (mais eficiente)
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Erro ao fazer upload");
        }

        const result = await response.json();
        
        toast.success("Arquivo importado com sucesso!");
        utils.financial.listUploads.invalidate();
        setUploading(false);
        setLocation(`/dashboard?uploadId=${result.uploadId}`);
      } catch (error) {
        console.error("Error uploading file:", error);
        toast.error(error instanceof Error ? error.message : "Erro ao importar arquivo");
        setUploading(false);
      }
    },
    [utils, setLocation]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileUpload(e.dataTransfer.files[0]);
      }
    },
    [handleFileUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFileUpload(e.target.files[0]);
      }
    },
    [handleFileUpload]
  );

  return (
      <div className="container max-w-6xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Importação de Dados</h1>
          <p className="text-muted-foreground">
            Faça upload da planilha Excel com os dados financeiros para análise e visualização.
          </p>
        </div>

        {/* Alerta de limpeza */}
        {showClearConfirm && (
          <Alert className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">Atenção!</AlertTitle>
            <AlertDescription className="text-yellow-700">
              Esta ação irá deletar TODOS os dados financeiros importados. Esta ação não pode ser desfeita.
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    clearMutation.mutate();
                  }}
                  disabled={clearMutation.isPending}
                >
                  {clearMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Limpando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Sim, limpar tudo
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowClearConfirm(false)}
                  disabled={clearMutation.isPending}
                >
                  Cancelar
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle>Upload de Planilha</CardTitle>
              <CardDescription>
                Arraste e solte ou clique para selecionar um arquivo Excel (.xlsx ou .xls)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                } ${uploading ? "pointer-events-none opacity-50" : ""}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileInput}
                  disabled={uploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                {uploading ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <div className="text-center">
                      <p className="text-sm font-medium mb-1">
                        Processando arquivo...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Isso pode levar alguns minutos para arquivos grandes
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        Arraste e solte seu arquivo aqui
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ou clique para selecionar
                      </p>
                    </div>
                    <Button variant="outline" size="sm" disabled={uploading}>
                      Selecionar Arquivo
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Formato esperado:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Arquivo Excel (.xlsx ou .xls)</li>
                  <li>• Abas: PG - GRC, CC - GRC, Fornecedores</li>
                  <li>• GERAL A PAGAR, GERAL A RECEBER</li>
                  <li>• CONSULTA FOLHA, DINÂMICA BANCOS</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Upload History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Histórico de Importações</CardTitle>
                  <CardDescription>
                    Arquivos importados anteriormente
                  </CardDescription>
                </div>
                {uploads && uploads.length > 0 && !showClearConfirm && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowClearConfirm(true)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Limpar Tudo
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingUploads ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : uploads && uploads.length > 0 ? (
                <div className="space-y-3">
                  {uploads.slice(0, 5).map((upload) => (
                    <div
                      key={upload.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => setLocation(`/dashboard?uploadId=${upload.id}`)}
                    >
                      <FileSpreadsheet className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {upload.fileName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(upload.uploadedAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {upload.status === "completed" ? (
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : upload.status === "failed" ? (
                        <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                      ) : (
                        <Loader2 className="h-5 w-5 animate-spin text-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nenhum arquivo importado ainda</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
