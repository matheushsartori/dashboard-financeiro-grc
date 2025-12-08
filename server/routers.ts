import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import type { ParsedExcelData } from "./excel-parser";

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
          console.log(`[Upload ${uploadId}] Iniciando processamento...`);
          
          // Decodificar base64
          const buffer = Buffer.from(input.fileData, "base64");
          console.log(`[Upload ${uploadId}] Arquivo decodificado: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);

          // Parsear arquivo Excel
          console.log(`[Upload ${uploadId}] Parseando arquivo Excel...`);
          const parsedData = parseExcelFile(buffer, uploadId);
          console.log(`[Upload ${uploadId}] Arquivo parseado:`, {
            contasAPagar: parsedData.contasAPagar.length,
            contasAReceber: parsedData.contasAReceber.length,
            folhaPagamento: parsedData.folhaPagamento.length,
            saldosBancarios: parsedData.saldosBancarios.length,
          });

          // Inserir dados no banco
          console.log(`[Upload ${uploadId}] Inserindo dados no banco...`);
          await upsertPlanoContas(parsedData.planoContas);
          console.log(`[Upload ${uploadId}] Plano de contas inserido`);
          
          await upsertCentrosCusto(parsedData.centrosCusto);
          console.log(`[Upload ${uploadId}] Centros de custo inseridos`);
          
          await upsertFornecedores(parsedData.fornecedores);
          console.log(`[Upload ${uploadId}] Fornecedores inseridos`);
          
          await insertContasAPagar(parsedData.contasAPagar);
          console.log(`[Upload ${uploadId}] Contas a pagar inseridas`);
          
          await insertContasAReceber(parsedData.contasAReceber);
          console.log(`[Upload ${uploadId}] Contas a receber inseridas`);
          
          // Identificar e cadastrar filiais automaticamente
          const { upsertFiliaisFromData } = await import("./db-financial");
          await upsertFiliaisFromData(parsedData.contasAPagar, parsedData.contasAReceber);
          console.log(`[Upload ${uploadId}] Filiais identificadas e cadastradas`);
          
          await insertFolhaPagamento(parsedData.folhaPagamento);
          console.log(`[Upload ${uploadId}] Folha de pagamento inserida`);
          
          await insertSaldosBancarios(parsedData.saldosBancarios);
          console.log(`[Upload ${uploadId}] Saldos bancários inseridos`);

          // Atualizar status do upload
          await updateUploadStatus(uploadId, "completed");
          console.log(`[Upload ${uploadId}] Processamento concluído com sucesso!`);

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

    // Limpar todos os dados financeiros (para reset completo)
    clearAllData: protectedProcedure.mutation(async () => {
      const { clearAllFinancialData } = await import("./db-financial");
      return clearAllFinancialData();
    }),

    // Obter resumo do dashboard
    getDashboardSummary: protectedProcedure
      .input(z.object({ 
        uploadId: z.number(),
        tipoVisualizacao: z.enum(["realizado", "projetado", "todos"]).optional().default("realizado"),
        codFilial: z.array(z.number()).optional().nullable()
      }))
      .query(async ({ input }) => {
        const { getDashboardSummary } = await import("./db-financial");
        return getDashboardSummary(input.uploadId, input.tipoVisualizacao, input.codFilial ?? null);
      }),

    // Obter resumo do DRE
    getDRESummary: protectedProcedure
      .input(z.object({ 
        uploadId: z.number(), 
        mes: z.number().optional().nullable(),
        tipoVisualizacao: z.enum(["realizado", "projetado", "todos"]).optional().default("realizado"),
        codFilial: z.array(z.number()).optional().nullable()
      }))
      .query(async ({ input }) => {
        const { getDRESummary } = await import("./db-financial");
        return getDRESummary(input.uploadId, input.mes ?? null, input.tipoVisualizacao, input.codFilial ?? null);
      }),

    // Obter DRE de todos os meses (para tabela horizontal)
    getDREPorMeses: protectedProcedure
      .input(z.object({ uploadId: z.number() }))
      .query(async ({ input }) => {
        const { getDREPorMeses } = await import("./db-financial");
        return getDREPorMeses(input.uploadId);
      }),

    // Obter dados mensais
    getDadosMensais: protectedProcedure
      .input(z.object({ 
        uploadId: z.number(),
        codFilial: z.array(z.number()).optional().nullable()
      }))
      .query(async ({ input }) => {
        const { getDadosMensais } = await import("./db-financial");
        return getDadosMensais(input.uploadId, input.codFilial ?? null);
      }),

    // Obter contas a pagar
    getContasAPagar: protectedProcedure
      .input(z.object({ 
        uploadId: z.number(),
        codFilial: z.array(z.number()).optional().nullable()
      }))
      .query(async ({ input }) => {
        const { getContasAPagarByUpload } = await import("./db-financial");
        return getContasAPagarByUpload(input.uploadId, input.codFilial ?? null);
      }),

    // Obter resumo de contas a pagar
    getContasAPagarSummary: protectedProcedure
      .input(z.object({ 
        uploadId: z.number(),
        tipoVisualizacao: z.enum(["realizado", "projetado", "todos"]).optional().default("realizado"),
        codFilial: z.array(z.number()).optional().nullable()
      }))
      .query(async ({ input }) => {
        const { getContasAPagarSummary, getTopFornecedores, getDespesasPorCategoria, getDespesasPorCentroCusto } = await import("./db-financial");
        const [summary, topFornecedores, despesasCategoria, despesasCentroCusto] = await Promise.all([
          getContasAPagarSummary(input.uploadId, input.tipoVisualizacao, input.codFilial ?? null),
          getTopFornecedores(input.uploadId, 10, input.codFilial ?? null),
          getDespesasPorCategoria(input.uploadId),
          getDespesasPorCentroCusto(input.uploadId, input.codFilial ?? null),
        ]);
        return { summary, topFornecedores, despesasCategoria, despesasCentroCusto };
      }),

    // Obter despesas por fornecedor
    getDespesasPorFornecedor: protectedProcedure
      .input(z.object({ 
        uploadId: z.number(), 
        mes: z.number().optional().nullable(),
        codFilial: z.array(z.number()).optional().nullable()
      }))
      .query(async ({ input }) => {
        const { getDespesasPorFornecedor } = await import("./db-financial");
        return getDespesasPorFornecedor(input.uploadId, input.mes ?? null, input.codFilial ?? null);
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
      .input(z.object({ 
        uploadId: z.number(), 
        mes: z.number().optional().nullable(),
        codFilial: z.array(z.number()).optional().nullable()
      }))
      .query(async ({ input }) => {
        const { getContasAReceberByUpload } = await import("./db-financial");
        return getContasAReceberByUpload(input.uploadId, input.mes ?? null, input.codFilial ?? null);
      }),

    // Obter resumo de contas a receber
    getContasAReceberSummary: protectedProcedure
      .input(z.object({ 
        uploadId: z.number(), 
        mes: z.number().optional().nullable(),
        tipoVisualizacao: z.enum(["realizado", "projetado", "todos"]).optional().default("realizado"),
        codFilial: z.array(z.number()).optional().nullable()
      }))
      .query(async ({ input }) => {
        const { getContasAReceberSummary, getTopClientes, getReceitasPorHistorico } = await import("./db-financial");
        const [summary, topClientes, receitasPorHistorico] = await Promise.all([
          getContasAReceberSummary(input.uploadId, input.mes ?? null, input.tipoVisualizacao, input.codFilial ?? null),
          getTopClientes(input.uploadId, 10, input.codFilial ?? null),
          getReceitasPorHistorico(input.uploadId, input.codFilial ?? null),
        ]);
        return { summary, topClientes, receitasPorHistorico };
      }),

    // Obter receitas mensais (evolução)
    getReceitasMensais: protectedProcedure
      .input(z.object({ 
        uploadId: z.number(),
        codFilial: z.array(z.number()).optional().nullable()
      }))
      .query(async ({ input }) => {
        const { getReceitasMensais } = await import("./db-financial");
        return getReceitasMensais(input.uploadId, input.codFilial ?? null);
      }),

    // Obter despesas mensais (evolução)
    getDespesasMensais: protectedProcedure
      .input(z.object({ 
        uploadId: z.number(),
        codFilial: z.array(z.number()).optional().nullable()
      }))
      .query(async ({ input }) => {
        const { getDespesasMensais } = await import("./db-financial");
        return getDespesasMensais(input.uploadId, input.codFilial ?? null);
      }),

    // Obter receitas por empresa
    getReceitasPorEmpresa: protectedProcedure
      .input(z.object({ 
        uploadId: z.number(), 
        mes: z.number().optional().nullable(),
        codFilial: z.array(z.number()).optional().nullable()
      }))
      .query(async ({ input }) => {
        const { getReceitasPorEmpresa } = await import("./db-financial");
        return getReceitasPorEmpresa(input.uploadId, input.mes ?? null, input.codFilial ?? null);
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

    // Obter folha de pagamento separada por tipo (Salário, Comissão, Premiação)
    getFolhaPagamentoSeparada: protectedProcedure
      .input(z.object({ uploadId: z.number() }))
      .query(async ({ input }) => {
        const { getFolhaPagamentoTotalByType } = await import("./db-financial");
        
        // Os tipos de pagamento foram identificados na planilha CONSULTA FOLHA
        const totalSalario = await getFolhaPagamentoTotalByType(input.uploadId, 'SALÁRIO');
        const totalComissao = await getFolhaPagamentoTotalByType(input.uploadId, 'COMISSÃO VENDAS');
        const totalPremiacao = await getFolhaPagamentoTotalByType(input.uploadId, 'PREMIAÇÃO');

        return {
          salario: totalSalario,
          comissao: totalComissao,
          premiacao: totalPremiacao,
          totalGeral: totalSalario + totalComissao + totalPremiacao,
        };
      }),

    // Obter saldos bancários
    getSaldosBancarios: protectedProcedure
      .input(z.object({ uploadId: z.number() }))
      .query(async ({ input }) => {
        const { getSaldosBancariosByUpload } = await import("./db-financial");
        return getSaldosBancariosByUpload(input.uploadId);
      }),

    // Obter filiais disponíveis para um upload
    getFiliaisDisponiveis: protectedProcedure
      .input(z.object({ uploadId: z.number() }))
      .query(async ({ input }) => {
        const { getFiliaisDisponiveis } = await import("./db-financial");
        return getFiliaisDisponiveis(input.uploadId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
