import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  // Financial data routers
  financial: router({
    // Upload e processar arquivo Excel
    uploadExcel: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileSize: z.number(),
        fileData: z.string(), // Base64 encoded
      }))
      .mutation(async ({ ctx, input }) => {
        const { createUpload, updateUploadStatus } = await import("./db-financial");
        const { parseExcelFile } = await import("./excel-parser");
        const {
          upsertPlanoContas,
          upsertCentrosCusto,
          upsertFornecedores,
          insertContasAPagar,
          insertContasAReceber,
          insertFolhaPagamento,
          insertSaldosBancarios,
        } = await import("./db-financial");

        // Criar registro de upload
        const uploadId = await createUpload({
          userId: ctx.user.id,
          fileName: input.fileName,
          fileSize: input.fileSize,
          status: "processing",
        });

        try {
          // Decodificar base64
          const buffer = Buffer.from(input.fileData, "base64");

          // Parsear arquivo Excel
          const parsedData = parseExcelFile(buffer, uploadId);

          // Inserir dados no banco
          await upsertPlanoContas(parsedData.planoContas);
          await upsertCentrosCusto(parsedData.centrosCusto);
          await upsertFornecedores(parsedData.fornecedores);
          await insertContasAPagar(parsedData.contasAPagar);
          await insertContasAReceber(parsedData.contasAReceber);
          await insertFolhaPagamento(parsedData.folhaPagamento);
          await insertSaldosBancarios(parsedData.saldosBancarios);

          // Atualizar status do upload
          await updateUploadStatus(uploadId, "completed");

          return { success: true, uploadId };
        } catch (error) {
          console.error("Error processing Excel file:", error);
          await updateUploadStatus(
            uploadId,
            "failed",
            error instanceof Error ? error.message : "Unknown error"
          );
          throw new Error("Falha ao processar arquivo Excel");
        }
      }),

    // Listar uploads do usuário
    listUploads: protectedProcedure.query(async ({ ctx }) => {
      const { getUploadsByUser } = await import("./db-financial");
      return getUploadsByUser(ctx.user.id);
    }),

    // Obter resumo do dashboard
    getDashboardSummary: protectedProcedure
      .input(z.object({ uploadId: z.number() }))
      .query(async ({ input }) => {
        const { getDashboardSummary } = await import("./db-financial");
        return getDashboardSummary(input.uploadId);
      }),

    // Obter resumo do DRE
    getDRESummary: protectedProcedure
      .input(z.object({ uploadId: z.number(), mes: z.number().optional().nullable() }))
      .query(async ({ input }) => {
        const { getDRESummary } = await import("./db-financial");
        return getDRESummary(input.uploadId, input.mes ?? null);
      }),

    // Obter dados mensais
    getDadosMensais: protectedProcedure
      .input(z.object({ uploadId: z.number() }))
      .query(async ({ input }) => {
        const { getDadosMensais } = await import("./db-financial");
        return getDadosMensais(input.uploadId);
      }),

    // Obter contas a pagar
    getContasAPagar: protectedProcedure
      .input(z.object({ uploadId: z.number() }))
      .query(async ({ input }) => {
        const { getContasAPagarByUpload } = await import("./db-financial");
        return getContasAPagarByUpload(input.uploadId);
      }),

    // Obter resumo de contas a pagar
    getContasAPagarSummary: protectedProcedure
      .input(z.object({ uploadId: z.number() }))
      .query(async ({ input }) => {
        const { getContasAPagarSummary, getTopFornecedores, getDespesasPorCategoria, getDespesasPorCentroCusto } = await import("./db-financial");
        const [summary, topFornecedores, despesasCategoria, despesasCentroCusto] = await Promise.all([
          getContasAPagarSummary(input.uploadId),
          getTopFornecedores(input.uploadId, 10),
          getDespesasPorCategoria(input.uploadId),
          getDespesasPorCentroCusto(input.uploadId),
        ]);
        return { summary, topFornecedores, despesasCategoria, despesasCentroCusto };
      }),

    // Obter despesas por fornecedor
    getDespesasPorFornecedor: protectedProcedure
      .input(z.object({ uploadId: z.number(), mes: z.number().optional().nullable() }))
      .query(async ({ input }) => {
        const { getDespesasPorFornecedor } = await import("./db-financial");
        return getDespesasPorFornecedor(input.uploadId, input.mes ?? null);
      }),

    // Obter detalhes de despesas de um fornecedor específico
    getDespesasPorFornecedorDetalhes: protectedProcedure
      .input(z.object({ uploadId: z.number(), fornecedor: z.string(), mes: z.number().optional().nullable() }))
      .query(async ({ input }) => {
        const { getDespesasPorFornecedorDetalhes } = await import("./db-financial");
        return getDespesasPorFornecedorDetalhes(input.uploadId, input.fornecedor, input.mes ?? null);
      }),

    // Obter contas a receber
    getContasAReceber: protectedProcedure
      .input(z.object({ uploadId: z.number(), mes: z.number().optional().nullable() }))
      .query(async ({ input }) => {
        const { getContasAReceberByUpload } = await import("./db-financial");
        return getContasAReceberByUpload(input.uploadId, input.mes ?? null);
      }),

    // Obter resumo de contas a receber
    getContasAReceberSummary: protectedProcedure
      .input(z.object({ uploadId: z.number(), mes: z.number().optional().nullable() }))
      .query(async ({ input }) => {
        const { getContasAReceberSummary, getTopClientes } = await import("./db-financial");
        const [summary, topClientes] = await Promise.all([
          getContasAReceberSummary(input.uploadId, input.mes ?? null),
          getTopClientes(input.uploadId, 10),
        ]);
        return { summary, topClientes };
      }),

    // Obter receitas mensais (evolução)
    getReceitasMensais: protectedProcedure
      .input(z.object({ uploadId: z.number() }))
      .query(async ({ input }) => {
        const { getReceitasMensais } = await import("./db-financial");
        return getReceitasMensais(input.uploadId);
      }),

    // Obter despesas mensais (evolução)
    getDespesasMensais: protectedProcedure
      .input(z.object({ uploadId: z.number() }))
      .query(async ({ input }) => {
        const { getDespesasMensais } = await import("./db-financial");
        return getDespesasMensais(input.uploadId);
      }),

    // Obter receitas por empresa
    getReceitasPorEmpresa: protectedProcedure
      .input(z.object({ uploadId: z.number(), mes: z.number().optional().nullable() }))
      .query(async ({ input }) => {
        const { getReceitasPorEmpresa } = await import("./db-financial");
        return getReceitasPorEmpresa(input.uploadId, input.mes ?? null);
      }),

    // Obter detalhes de receitas de uma empresa específica
    getReceitasPorEmpresaDetalhes: protectedProcedure
      .input(z.object({ uploadId: z.number(), cliente: z.string(), mes: z.number().optional().nullable() }))
      .query(async ({ input }) => {
        const { getReceitasPorEmpresaDetalhes } = await import("./db-financial");
        return getReceitasPorEmpresaDetalhes(input.uploadId, input.cliente, input.mes ?? null);
      }),

    // Obter folha de pagamento
    getFolhaPagamento: protectedProcedure
      .input(z.object({ uploadId: z.number() }))
      .query(async ({ input }) => {
        const { getFolhaPagamentoByUpload } = await import("./db-financial");
        return getFolhaPagamentoByUpload(input.uploadId);
      }),

    // Obter resumo de folha de pagamento
    getFolhaPagamentoSummary: protectedProcedure
      .input(z.object({ uploadId: z.number() }))
      .query(async ({ input }) => {
        const { getFolhaPagamentoSummary, getCustoPorArea } = await import("./db-financial");
        const [summary, custoPorArea] = await Promise.all([
          getFolhaPagamentoSummary(input.uploadId),
          getCustoPorArea(input.uploadId),
        ]);
        return { summary, custoPorArea };
      }),

    // Obter saldos bancários
    getSaldosBancarios: protectedProcedure
      .input(z.object({ uploadId: z.number() }))
      .query(async ({ input }) => {
        const { getSaldosBancariosByUpload } = await import("./db-financial");
        return getSaldosBancariosByUpload(input.uploadId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
