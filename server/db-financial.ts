import { eq, and, gte, lte, desc, sql, asc } from "drizzle-orm";
import { getDb } from "./db";
import {
  uploads,
  contasAPagar,
  contasAReceber,
  folhaPagamento,
  saldosBancarios,
  planoContas,
  centrosCusto,
  fornecedores,
  InsertUpload,
  InsertContaAPagar,
  InsertContaAReceber,
  InsertFolhaPagamento,
  InsertPlanoContas,
  InsertCentroCusto,
  InsertFornecedor,
} from "../drizzle/schema";

// ===== UPLOADS =====

export async function createUpload(data: InsertUpload) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(uploads).values(data).returning({ id: uploads.id });
  return result[0].id;
}

export async function updateUploadStatus(
  uploadId: number,
  status: "processing" | "completed" | "failed",
  errorMessage?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(uploads)
    .set({ status, errorMessage })
    .where(eq(uploads.id, uploadId));
}

export async function getUploadsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(uploads).where(eq(uploads.userId, userId)).orderBy(desc(uploads.uploadedAt));
}

// ===== PLANO DE CONTAS =====

export async function upsertPlanoContas(data: InsertPlanoContas[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (const item of data) {
    await db
      .insert(planoContas)
      .values(item)
      .onConflictDoUpdate({
        target: planoContas.codigo,
        set: { descricao: item.descricao, tipo: item.tipo }
      });
  }
}

export async function getAllPlanoContas() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(planoContas);
}

// ===== CENTROS DE CUSTO =====

export async function upsertCentrosCusto(data: InsertCentroCusto[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (const item of data) {
    await db
      .insert(centrosCusto)
      .values(item)
      .onConflictDoUpdate({
        target: centrosCusto.codigo,
        set: { descricao: item.descricao }
      });
  }
}

export async function getAllCentrosCusto() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(centrosCusto);
}

// ===== FORNECEDORES =====

export async function upsertFornecedores(data: InsertFornecedor[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (const item of data) {
    await db
      .insert(fornecedores)
      .values(item)
      .onConflictDoUpdate({
        target: fornecedores.codigo,
        set: { nome: item.nome }
      });
  }
}

export async function getAllFornecedores() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(fornecedores);
}

// ===== CONTAS A PAGAR =====

export async function insertContasAPagar(data: InsertContaAPagar[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (data.length === 0) return;

  // Inserir em lotes de 100 para evitar problemas de memória
  const batchSize = 100;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await db.insert(contasAPagar).values(batch);
  }
}

export async function getContasAPagarByUpload(uploadId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(contasAPagar).where(eq(contasAPagar.uploadId, uploadId));
}

export async function getContasAPagarSummary(uploadId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      totalValor: sql<number>`COALESCE(SUM(${contasAPagar.valor}), 0)`,
      totalPago: sql<number>`COALESCE(SUM(${contasAPagar.valorPago}), 0)`,
      totalRegistros: sql<number>`COUNT(*)`,
    })
    .from(contasAPagar)
    .where(eq(contasAPagar.uploadId, uploadId));

  return result[0];
}

export async function getTopFornecedores(uploadId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      fornecedor: contasAPagar.fornecedor,
      totalPago: sql<number>`SUM(${contasAPagar.valorPago})`,
    })
    .from(contasAPagar)
    .where(eq(contasAPagar.uploadId, uploadId))
    .groupBy(contasAPagar.fornecedor)
    .orderBy(desc(sql`SUM(${contasAPagar.valorPago})`))
    .limit(limit);
}

export async function getDespesasPorFornecedor(uploadId: number, mes?: number | null) {
  const db = await getDb();
  if (!db) return [];

  const whereCondition = mes !== null && mes !== undefined
    ? and(eq(contasAPagar.uploadId, uploadId), eq(contasAPagar.mes, mes))
    : eq(contasAPagar.uploadId, uploadId);

  const result = await db
    .select({
      fornecedor: contasAPagar.fornecedor,
      quantidadePagamentos: sql<number>`COUNT(*)`,
      totalPagamentos: sql<number>`COALESCE(SUM(${contasAPagar.valorPago}), SUM(${contasAPagar.valor}), 0)`,
      mediaPagamentos: sql<number>`COALESCE(AVG(${contasAPagar.valorPago}), AVG(${contasAPagar.valor}), 0)`,
      ultimoPagamento: sql<Date | null>`MAX(${contasAPagar.dataPagamento})`,
    })
    .from(contasAPagar)
    .where(whereCondition)
    .groupBy(contasAPagar.fornecedor)
    .orderBy(desc(sql`COALESCE(SUM(${contasAPagar.valorPago}), SUM(${contasAPagar.valor}), 0)`));

  return result.map(r => ({
    fornecedor: r.fornecedor || "Sem nome",
    quantidadePagamentos: Number(r.quantidadePagamentos),
    totalPagamentos: Number(r.totalPagamentos),
    mediaPagamentos: Number(r.mediaPagamentos),
    ultimoPagamento: r.ultimoPagamento,
  }));
}

export async function getDespesasPorFornecedorDetalhes(uploadId: number, fornecedor: string, mes?: number | null) {
  const db = await getDb();
  if (!db) return [];

  const whereCondition = mes !== null && mes !== undefined
    ? and(
        eq(contasAPagar.uploadId, uploadId),
        eq(contasAPagar.fornecedor, fornecedor),
        eq(contasAPagar.mes, mes)
      )
    : and(
        eq(contasAPagar.uploadId, uploadId),
        eq(contasAPagar.fornecedor, fornecedor)
      );

  return db
    .select()
    .from(contasAPagar)
    .where(whereCondition)
    .orderBy(desc(contasAPagar.dataPagamento));
}

export async function getDespesasPorCategoria(uploadId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      categoria: contasAPagar.descricaoDespesaSintetico,
      totalPago: sql<number>`SUM(${contasAPagar.valorPago})`,
    })
    .from(contasAPagar)
    .where(eq(contasAPagar.uploadId, uploadId))
    .groupBy(contasAPagar.descricaoDespesaSintetico)
    .orderBy(desc(sql`SUM(${contasAPagar.valorPago})`));
}

export async function getDespesasPorCentroCusto(uploadId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      centroCusto: contasAPagar.descricaoCCSintetico,
      totalPago: sql<number>`SUM(${contasAPagar.valorPago})`,
    })
    .from(contasAPagar)
    .where(eq(contasAPagar.uploadId, uploadId))
    .groupBy(contasAPagar.descricaoCCSintetico)
    .orderBy(desc(sql`SUM(${contasAPagar.valorPago})`));
}

// ===== CONTAS A RECEBER =====

export async function insertContasAReceber(data: InsertContaAReceber[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (data.length === 0) return;

  const batchSize = 100;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await db.insert(contasAReceber).values(batch);
  }
}

export async function getContasAReceberByUpload(uploadId: number, mes?: number | null) {
  const db = await getDb();
  if (!db) return [];

  // Filtrar por mês se fornecido
  if (mes !== null && mes !== undefined) {
    return db
      .select()
      .from(contasAReceber)
      .where(and(eq(contasAReceber.uploadId, uploadId), eq(contasAReceber.mes, mes)));
  }
  
  return db.select().from(contasAReceber).where(eq(contasAReceber.uploadId, uploadId));
}

export async function getContasAReceberSummary(uploadId: number, mes?: number | null) {
  const db = await getDb();
  if (!db) return null;

  // Filtrar por mês se fornecido
  const whereCondition = mes !== null && mes !== undefined
    ? and(eq(contasAReceber.uploadId, uploadId), eq(contasAReceber.mes, mes))
    : eq(contasAReceber.uploadId, uploadId);

  const result = await db
    .select({
      totalValor: sql<number>`COALESCE(SUM(${contasAReceber.valor}), 0)`,
      totalRecebido: sql<number>`COALESCE(SUM(${contasAReceber.valorRecebido}), 0)`,
      totalRegistros: sql<number>`COUNT(*)`,
    })
    .from(contasAReceber)
    .where(whereCondition);

  return result[0];
}

export async function getTopClientes(uploadId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      cliente: contasAReceber.cliente,
      totalRecebido: sql<number>`COALESCE(SUM(${contasAReceber.valorRecebido}), SUM(${contasAReceber.valor}), 0)`,
    })
    .from(contasAReceber)
    .where(eq(contasAReceber.uploadId, uploadId))
    .groupBy(contasAReceber.cliente)
    .orderBy(desc(sql`COALESCE(SUM(${contasAReceber.valorRecebido}), SUM(${contasAReceber.valor}), 0)`))
    .limit(limit);
}

export async function getReceitasPorEmpresa(uploadId: number, mes?: number | null) {
  const db = await getDb();
  if (!db) return [];

  const whereCondition = mes !== null && mes !== undefined
    ? and(eq(contasAReceber.uploadId, uploadId), eq(contasAReceber.mes, mes))
    : eq(contasAReceber.uploadId, uploadId);

  const result = await db
    .select({
      cliente: contasAReceber.cliente,
      quantidadePagamentos: sql<number>`COUNT(*)`,
      totalPagamentos: sql<number>`COALESCE(SUM(${contasAReceber.valorRecebido}), SUM(${contasAReceber.valor}), 0)`,
      mediaPagamentos: sql<number>`COALESCE(AVG(${contasAReceber.valorRecebido}), AVG(${contasAReceber.valor}), 0)`,
      ultimoPagamento: sql<Date | null>`MAX(${contasAReceber.dataRecebimento})`,
    })
    .from(contasAReceber)
    .where(whereCondition)
    .groupBy(contasAReceber.cliente)
    .orderBy(desc(sql`COALESCE(SUM(${contasAReceber.valorRecebido}), SUM(${contasAReceber.valor}), 0)`));

  return result.map(r => ({
    cliente: r.cliente || "Sem nome",
    quantidadePagamentos: Number(r.quantidadePagamentos),
    totalPagamentos: Number(r.totalPagamentos),
    mediaPagamentos: Number(r.mediaPagamentos),
    ultimoPagamento: r.ultimoPagamento,
  }));
}

export async function getReceitasPorEmpresaDetalhes(uploadId: number, cliente: string, mes?: number | null) {
  const db = await getDb();
  if (!db) return [];

  const whereCondition = mes !== null && mes !== undefined
    ? and(
        eq(contasAReceber.uploadId, uploadId),
        eq(contasAReceber.cliente, cliente),
        eq(contasAReceber.mes, mes)
      )
    : and(
        eq(contasAReceber.uploadId, uploadId),
        eq(contasAReceber.cliente, cliente)
      );

  return db
    .select()
    .from(contasAReceber)
    .where(whereCondition)
    .orderBy(desc(contasAReceber.dataRecebimento));
}

// ===== FOLHA DE PAGAMENTO =====

export async function insertFolhaPagamento(data: InsertFolhaPagamento[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (data.length === 0) return;

  await db.insert(folhaPagamento).values(data);
}

export async function getFolhaPagamentoByUpload(uploadId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(folhaPagamento).where(eq(folhaPagamento.uploadId, uploadId));
}

export async function getFolhaPagamentoSummary(uploadId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      totalFolha: sql<number>`SUM(${folhaPagamento.total})`,
      totalFuncionarios: sql<number>`COUNT(DISTINCT ${folhaPagamento.nome})`,
    })
    .from(folhaPagamento)
    .where(eq(folhaPagamento.uploadId, uploadId));

  return result[0];
}

export async function getCustoPorArea(uploadId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      area: folhaPagamento.area,
      totalCusto: sql<number>`SUM(${folhaPagamento.total})`,
    })
    .from(folhaPagamento)
    .where(eq(folhaPagamento.uploadId, uploadId))
    .groupBy(folhaPagamento.area)
    .orderBy(desc(sql`SUM(${folhaPagamento.total})`));
}

// ===== SALDOS BANCÁRIOS =====

export async function insertSaldosBancarios(data: any[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (data.length === 0) return;

  await db.insert(saldosBancarios).values(data);
}

export async function getSaldosBancariosByUpload(uploadId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(saldosBancarios).where(eq(saldosBancarios.uploadId, uploadId));
}

export async function getSaldosBancariosSummary(uploadId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      totalSaldo: sql<number>`SUM(${saldosBancarios.saldoTotal})`,
      totalBancos: sql<number>`COUNT(DISTINCT ${saldosBancarios.banco})`,
    })
    .from(saldosBancarios)
    .where(eq(saldosBancarios.uploadId, uploadId));

  return result[0];
}

// ===== DASHBOARD SUMMARY =====

export async function getDashboardSummary(uploadId: number) {
  const db = await getDb();
  if (!db) return null;

  const [contasPagar, contasReceber, folha, saldos] = await Promise.all([
    getContasAPagarSummary(uploadId),
    getContasAReceberSummary(uploadId),
    getFolhaPagamentoSummary(uploadId),
    getSaldosBancariosSummary(uploadId),
  ]);

  return {
    contasPagar,
    contasReceber,
    folha,
    saldos,
  };
}

// ===== DADOS MENSAIS =====

export async function getReceitasMensais(uploadId: number) {
  const db = await getDb();
  if (!db) return [];

  const receitasPorMes = await db
    .select({
      mes: contasAReceber.mes,
      totalValor: sql<number>`COALESCE(SUM(${contasAReceber.valor}), 0)`,
      totalRecebido: sql<number>`COALESCE(SUM(${contasAReceber.valorRecebido}), 0)`,
      totalRegistros: sql<number>`COUNT(*)`,
    })
    .from(contasAReceber)
    .where(eq(contasAReceber.uploadId, uploadId))
    .groupBy(contasAReceber.mes)
    .orderBy(asc(contasAReceber.mes));

  return receitasPorMes
    .filter(r => r.mes !== null && r.mes !== undefined)
    .map(r => ({
      mes: r.mes!,
      mesNome: getMesNome(r.mes!),
      totalValor: Number(r.totalValor),
      totalRecebido: Number(r.totalRecebido),
      totalRegistros: Number(r.totalRegistros),
    }));
}

export async function getDadosMensais(uploadId: number) {
  const db = await getDb();
  if (!db) return null;

  // Buscar receitas por mês
  const receitasPorMes = await db
    .select({
      mes: contasAReceber.mes,
      totalValor: sql<number>`COALESCE(SUM(${contasAReceber.valor}), 0)`,
      totalRecebido: sql<number>`COALESCE(SUM(${contasAReceber.valorRecebido}), 0)`,
      totalRegistros: sql<number>`COUNT(*)`,
    })
    .from(contasAReceber)
    .where(eq(contasAReceber.uploadId, uploadId))
    .groupBy(contasAReceber.mes)
    .orderBy(asc(contasAReceber.mes));

  // Buscar despesas por mês
  const despesasPorMes = await db
    .select({
      mes: contasAPagar.mes,
      totalValor: sql<number>`COALESCE(SUM(${contasAPagar.valor}), 0)`,
      totalPago: sql<number>`COALESCE(SUM(${contasAPagar.valorPago}), 0)`,
      totalRegistros: sql<number>`COUNT(*)`,
    })
    .from(contasAPagar)
    .where(eq(contasAPagar.uploadId, uploadId))
    .groupBy(contasAPagar.mes)
    .orderBy(asc(contasAPagar.mes));

  // Combinar dados de receitas e despesas por mês
  const meses = new Set([
    ...receitasPorMes.map(r => r.mes).filter(m => m !== null),
    ...despesasPorMes.map(d => d.mes).filter(m => m !== null),
  ]);

  const dadosMensais = Array.from(meses).sort((a, b) => a! - b!).map(mes => {
    const receita = receitasPorMes.find(r => r.mes === mes);
    const despesa = despesasPorMes.find(d => d.mes === mes);

    const totalReceitas = Number(receita?.totalRecebido || 0);
    const totalDespesas = Number(despesa?.totalPago || 0);
    const resultado = totalReceitas - totalDespesas;

    return {
      mes,
      mesNome: getMesNome(mes!),
      receitas: totalReceitas,
      despesas: totalDespesas,
      resultado,
      receitasRegistros: Number(receita?.totalRegistros || 0),
      despesasRegistros: Number(despesa?.totalRegistros || 0),
    };
  });

  return dadosMensais;
}

function getMesNome(mes: number): string {
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  return meses[mes - 1] || `Mês ${mes}`;
}
