import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
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

  const result = await db.insert(uploads).values(data);
  return result[0].insertId;
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
      .onDuplicateKeyUpdate({ set: { descricao: item.descricao, tipo: item.tipo } });
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
      .onDuplicateKeyUpdate({ set: { descricao: item.descricao } });
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
      .onDuplicateKeyUpdate({ set: { nome: item.nome } });
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
      totalValor: sql<number>`SUM(${contasAPagar.valor})`,
      totalPago: sql<number>`SUM(${contasAPagar.valorPago})`,
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

export async function getContasAReceberByUpload(uploadId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(contasAReceber).where(eq(contasAReceber.uploadId, uploadId));
}

export async function getContasAReceberSummary(uploadId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      totalValor: sql<number>`SUM(${contasAReceber.valor})`,
      totalRecebido: sql<number>`SUM(${contasAReceber.valorRecebido})`,
      totalRegistros: sql<number>`COUNT(*)`,
    })
    .from(contasAReceber)
    .where(eq(contasAReceber.uploadId, uploadId));

  return result[0];
}

export async function getTopClientes(uploadId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      cliente: contasAReceber.cliente,
      totalRecebido: sql<number>`SUM(${contasAReceber.valorRecebido})`,
    })
    .from(contasAReceber)
    .where(eq(contasAReceber.uploadId, uploadId))
    .groupBy(contasAReceber.cliente)
    .orderBy(desc(sql`SUM(${contasAReceber.valorRecebido})`))
    .limit(limit);
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
