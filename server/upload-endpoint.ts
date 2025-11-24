import type { Request, Response } from "express";
import multer from "multer";
import { parseExcelFile } from "./excel-parser";
import {
  createUpload,
  updateUploadStatus,
  upsertPlanoContas,
  upsertCentrosCusto,
  upsertFornecedores,
  insertContasAPagar,
  insertContasAReceber,
  insertFolhaPagamento,
  insertSaldosBancarios,
} from "./db-financial";

// Configurar multer para armazenar arquivo em memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export const uploadMiddleware = upload.single("file");

export async function handleFileUpload(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    // Verificar autenticação via contexto tRPC
    const context = (req as any).trpcContext;
    const user = context?.user;
    
    if (!user) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const { originalname, size, buffer } = req.file;

    console.log(`[Upload] Iniciando processamento: ${originalname} (${(size / 1024 / 1024).toFixed(2)} MB)`);

    // Criar registro de upload
    const uploadId = await createUpload({
      userId: user.id,
      fileName: originalname,
      fileSize: size,
      status: "processing",
    });

    // Processar em background (não bloquear resposta)
    processFileAsync(uploadId, buffer).catch((error) => {
      console.error(`[Upload] Erro no processamento assíncrono:`, error);
    });

    // Retornar imediatamente com uploadId
    return res.json({
      success: true,
      uploadId,
      message: "Arquivo recebido e está sendo processado",
    });
  } catch (error) {
    console.error("[Upload] Erro:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}

async function processFileAsync(uploadId: number, buffer: Buffer) {
  try {
    console.log(`[Upload] Parseando arquivo para uploadId ${uploadId}...`);
    const parsedData = parseExcelFile(buffer, uploadId);

    console.log(`[Upload] Inserindo dados no banco...`);
    await upsertPlanoContas(parsedData.planoContas);
    await upsertCentrosCusto(parsedData.centrosCusto);
    await upsertFornecedores(parsedData.fornecedores);
    await insertContasAPagar(parsedData.contasAPagar);
    await insertContasAReceber(parsedData.contasAReceber);
    await insertFolhaPagamento(parsedData.folhaPagamento);
    await insertSaldosBancarios(parsedData.saldosBancarios);

    await updateUploadStatus(uploadId, "completed");
    console.log(`[Upload] Processamento concluído para uploadId ${uploadId}`);
  } catch (error) {
    console.error(`[Upload] Erro no processamento do uploadId ${uploadId}:`, error);
    await updateUploadStatus(
      uploadId,
      "failed",
      error instanceof Error ? error.message : "Erro desconhecido"
    );
  }
}
