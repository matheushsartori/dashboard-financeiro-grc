import { eq, and, or, gte, lte, gt, desc, sql, asc, isNull, isNotNull, inArray } from "drizzle-orm";
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
  filiais,
  InsertUpload,
  InsertContaAPagar,
  InsertContaAReceber,
  InsertFolhaPagamento,
  InsertPlanoContas,
  InsertCentroCusto,
  InsertFornecedor,
  InsertFilial,
} from "../drizzle/schema";

// ===== FUNÇÕES AUXILIARES =====

// Função auxiliar para construir filtro de filial
function buildFilialFilter(codFilial: number[] | null | undefined, field: any) {
  // Se codFilial é null ou undefined, não aplicar filtro (retorna todos, incluindo nulls)
  if (codFilial === null || codFilial === undefined) {
    return undefined;
  }

  // Se é um array vazio, não aplicar filtro
  if (codFilial.length === 0) {
    return undefined;
  }

  // Se é um array com valores, filtrar apenas essas filiais
  // Quando é consolidado (múltiplas filiais), incluir também registros com codFilial null
  // Quando é uma filial específica, não incluir nulls

  // Se há múltiplas filiais (consolidado), incluir também nulls
  if (codFilial.length > 1) {
    return or(
      inArray(field, codFilial),
      isNull(field)
    );
  }

  // Se é uma filial específica, filtrar apenas essa filial (sem incluir nulls)
  return inArray(field, codFilial);
}

// Função para garantir que a tabela de filiais existe
export async function ensureFiliaisTableExists() {
  const db = await getDb();
  if (!db) {
    console.warn("[ensureFiliaisTableExists] DB não disponível");
    return false;
  }

  try {
    // Tentar fazer uma query simples na tabela para verificar se existe
    try {
      await db.select().from(filiais).limit(1);
      // Se chegou aqui, a tabela existe
      console.log("[ensureFiliaisTableExists] Tabela filiais já existe");
      return true;
    } catch (error: any) {
      // Se a tabela não existe, o erro será sobre tabela não encontrada
      if (error?.code === '42P01' || error?.message?.includes('does not exist') || error?.message?.includes('relation') && error?.message?.includes('does not exist')) {
        console.log("[ensureFiliaisTableExists] Tabela filiais não existe, criando...");

        // Criar a tabela usando SQL direto
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS "filiais" (
            "id" serial PRIMARY KEY NOT NULL,
            "codigo" integer NOT NULL UNIQUE,
            "nome" varchar(255) NOT NULL
          );
        `);

        // Criar índice
        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS "filiais_codigo_idx" ON "filiais" ("codigo");
        `);

        console.log("[ensureFiliaisTableExists] Tabela filiais criada com sucesso!");
        return true;
      } else {
        // Outro tipo de erro, relançar
        throw error;
      }
    }
  } catch (error) {
    console.error("[ensureFiliaisTableExists] Erro ao verificar/criar tabela filiais:", error);
    return false;
  }
}

// Função para identificar e cadastrar filiais automaticamente durante a importação
export async function upsertFiliaisFromData(contasAPagar: InsertContaAPagar[], contasAReceber: InsertContaAReceber[]) {
  const db = await getDb();
  if (!db) {
    console.warn("[upsertFiliaisFromData] DB não disponível");
    return;
  }

  // Garantir que a tabela existe antes de usar
  await ensureFiliaisTableExists();

  // Extrair todos os codFilial únicos dos dados
  const filiaisEncontradas = new Set<number>();

  contasAPagar.forEach(item => {
    if (item.codFilial && item.codFilial > 0) {
      filiaisEncontradas.add(item.codFilial);
    }
  });

  contasAReceber.forEach(item => {
    if (item.codFilial && item.codFilial > 0) {
      filiaisEncontradas.add(item.codFilial);
    }
  });

  if (filiaisEncontradas.size === 0) {
    console.log("[upsertFiliaisFromData] Nenhuma filial encontrada nos dados");
    return;
  }

  console.log(`[upsertFiliaisFromData] Filiais encontradas: ${Array.from(filiaisEncontradas).sort((a, b) => a - b).join(", ")}`);

  // Mapeamento de nomes padrão conhecidos
  // Baseado na documentação: filiais [1, 3, 4, 5, 6, 7]
  const nomesPadrao: Record<number, string> = {
    1: "Matriz (RP)",
    3: "Sul",
    4: "BH",
    5: "Filial 5",
    6: "Filial 6",
    7: "Filial 7",
  };

  // Para cada filial encontrada, criar ou atualizar na tabela
  const filiaisArray = Array.from(filiaisEncontradas).sort((a, b) => a - b);
  for (const codigo of filiaisArray) {
    const nome = nomesPadrao[codigo] || `Filial ${codigo}`;

    try {
      // Verificar se já existe
      const existente = await db
        .select()
        .from(filiais)
        .where(eq(filiais.codigo, codigo))
        .limit(1);

      if (existente.length > 0) {
        // Se existe mas o nome mudou, atualizar
        if (existente[0].nome !== nome && nomesPadrao[codigo]) {
          await db
            .update(filiais)
            .set({ nome })
            .where(eq(filiais.codigo, codigo));
          console.log(`[upsertFiliaisFromData] Filial ${codigo} atualizada: ${nome}`);
        }
      } else {
        // Criar nova filial
        await db.insert(filiais).values({
          codigo,
          nome,
        });
        console.log(`[upsertFiliaisFromData] Filial ${codigo} criada: ${nome}`);
      }
    } catch (error) {
      console.error(`[upsertFiliaisFromData] Erro ao processar filial ${codigo}:`, error);
    }
  }

  console.log(`[upsertFiliaisFromData] Processamento concluído - ${filiaisEncontradas.size} filiais processadas`);
}

// ===== UPLOADS =====

// Excluir uma importação específica e todos os dados relacionados
export async function deleteUpload(uploadId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Excluir em cascata (devido às foreign keys configuradas)
  await db.delete(uploads).where(eq(uploads.id, uploadId));

  return { success: true, message: "Importação excluída com sucesso" };
}

// Obter arquivo original de uma importação
export async function getUploadFile(uploadId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const upload = await db
    .select({
      fileName: uploads.fileName,
      fileData: uploads.fileData,
    })
    .from(uploads)
    .where(eq(uploads.id, uploadId))
    .limit(1);

  if (!upload || upload.length === 0) {
    throw new Error("Importação não encontrada");
  }

  return {
    fileName: upload[0].fileName,
    fileData: upload[0].fileData, // Base64
  };
}

// Função para limpar todos os dados financeiros
export async function clearAllFinancialData() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log("[Clear] Iniciando limpeza de todos os dados financeiros...");

  try {
    // Deletar em ordem para respeitar foreign keys (se houver)
    await db.delete(saldosBancarios);
    console.log("[Clear] Saldos bancários deletados");

    await db.delete(folhaPagamento);
    console.log("[Clear] Folha de pagamento deletada");

    await db.delete(contasAReceber);
    console.log("[Clear] Contas a receber deletadas");

    await db.delete(contasAPagar);
    console.log("[Clear] Contas a pagar deletadas");

    await db.delete(uploads);
    console.log("[Clear] Uploads deletados");

    // Limpar também a tabela de filiais para que sejam recriadas na próxima importação
    // Verificar se a tabela existe antes de tentar deletar
    try {
      await db.delete(filiais);
      console.log("[Clear] Filiais deletadas");
    } catch (error: any) {
      // Se a tabela não existir, apenas logar e continuar
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.log("[Clear] Tabela de filiais não existe, pulando...");
      } else {
        // Se for outro erro, relançar
        throw error;
      }
    }

    // Tabelas de referência (opcional - comentado para manter dados de referência)
    // await db.delete(fornecedores);
    // await db.delete(centrosCusto);
    // await db.delete(planoContas);

    console.log("[Clear] Limpeza concluída com sucesso!");
    return { success: true, message: "Todos os dados financeiros foram deletados" };
  } catch (error) {
    console.error("[Clear] Erro ao limpar dados:", error);
    throw error;
  }
}

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

  // Validar e limpar dados antes de inserir
  const validData = data.filter(item => {
    if (!item.uploadId || item.uploadId <= 0) {
      console.warn(`[Insert] Contas a Pagar: Registro inválido (sem uploadId):`, item);
      return false;
    }
    return true;
  });

  if (validData.length === 0) {
    console.warn(`[Insert] Contas a Pagar: Nenhum registro válido para inserir`);
    return;
  }

  // Obter uploadId do primeiro registro válido
  const uploadId = validData[0].uploadId;

  // Deletar todos os registros existentes deste uploadId antes de inserir
  console.log(`[Insert] Contas a Pagar: Deletando registros antigos do uploadId ${uploadId}...`);
  await db.delete(contasAPagar).where(eq(contasAPagar.uploadId, uploadId));
  console.log(`[Insert] Contas a Pagar: Registros antigos deletados`);

  // Inserir em lotes menores para evitar timeouts (250 registros)
  const batchSize = 250;
  const totalBatches = Math.ceil(validData.length / batchSize);
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < validData.length; i += batchSize) {
    try {
      const batch = validData.slice(i, i + batchSize);

      // Timeout de 30 segundos por batch
      await Promise.race([
        db.insert(contasAPagar).values(batch),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout ao inserir batch ${i / batchSize + 1}`)), 30000)
        )
      ]);

      inserted += batch.length;

      if (totalBatches > 1 && (i / batchSize + 1) % 5 === 0) {
        console.log(`[Insert] Contas a Pagar: ${inserted}/${validData.length} registros inseridos`);
      }
    } catch (error) {
      errors++;
      console.error(`[Insert] Contas a Pagar: Erro no batch ${i / batchSize + 1}:`, error);

      // Tentar inserir um por um para identificar o registro problemático
      if (errors <= 3) {
        const batch = validData.slice(i, i + batchSize);
        for (let j = 0; j < batch.length; j++) {
          try {
            await db.insert(contasAPagar).values([batch[j]]);
            inserted++;
          } catch (singleError) {
            console.error(`[Insert] Contas a Pagar: Erro ao inserir registro individual:`, {
              index: i + j,
              error: singleError instanceof Error ? singleError.message : String(singleError),
              data: JSON.stringify(batch[j]).substring(0, 200)
            });
          }
        }
      } else {
        throw new Error(`Muitos erros ao inserir Contas a Pagar. Parando após ${errors} erros.`);
      }
    }
  }

  console.log(`[Insert] Contas a Pagar: Concluído - ${inserted}/${validData.length} registros inseridos, ${errors} erros`);
}

export async function getContasAPagarByUpload(uploadId: number, codFilial?: number[] | null) {
  const db = await getDb();
  if (!db) return [];

  let whereCondition: any = eq(contasAPagar.uploadId, uploadId);
  const filialFilter = buildFilialFilter(codFilial, contasAPagar.codFilial);
  if (filialFilter) {
    whereCondition = and(whereCondition, filialFilter);
  }

  return db.select().from(contasAPagar).where(whereCondition);
}

export async function getContasAPagarSummary(uploadId: number, tipoVisualizacao: "realizado" | "projetado" | "todos" = "realizado", codFilial?: number[] | null) {
  const db = await getDb();
  if (!db) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let whereCondition: any = eq(contasAPagar.uploadId, uploadId);

  // Adicionar filtro de filial
  const filialFilter = buildFilialFilter(codFilial, contasAPagar.codFilial);
  if (filialFilter) {
    whereCondition = and(whereCondition, filialFilter);
  }

  if (tipoVisualizacao === "realizado") {
    // Apenas pagamentos com data de pagamento <= hoje ou sem data de pagamento mas com valorPago > 0
    // OU sem valorPago mas com valor e data passada/sem data
    whereCondition = and(
      whereCondition,
      or(
        and(isNotNull(contasAPagar.dataPagamento), lte(contasAPagar.dataPagamento, hoje)),
        and(isNull(contasAPagar.dataPagamento), sql`${contasAPagar.valorPago} > 0`),
        and(
          or(sql`${contasAPagar.valorPago} = 0`, isNull(contasAPagar.valorPago)),
          sql`${contasAPagar.valor} > 0`,
          or(
            and(isNotNull(contasAPagar.dataPagamento), lte(contasAPagar.dataPagamento, hoje)),
            isNull(contasAPagar.dataPagamento)
          )
        )
      )
    )!;
  } else if (tipoVisualizacao === "projetado") {
    // Apenas pagamentos com data de pagamento > hoje ou sem data de pagamento mas sem valor pago
    whereCondition = and(
      whereCondition,
      or(
        and(isNotNull(contasAPagar.dataPagamento), gt(contasAPagar.dataPagamento, hoje)),
        and(isNull(contasAPagar.dataPagamento), sql`${contasAPagar.valorPago} = 0`, sql`${contasAPagar.valor} > 0`)
      )
    )!;
  }

  const result = await db
    .select({
      totalValor: sql<number>`COALESCE(SUM(${contasAPagar.valor}), 0)`,
      totalPago: sql<number>`COALESCE(SUM(${contasAPagar.valorPago}), 0)`,
      totalRegistros: sql<number>`COUNT(*)`,
    })
    .from(contasAPagar)
    .where(whereCondition);

  return result[0];
}

export async function getTopFornecedores(uploadId: number, limit: number = 10, codFilial?: number[] | null) {
  const db = await getDb();
  if (!db) return [];

  let whereCondition: any = eq(contasAPagar.uploadId, uploadId);
  const filialFilter = buildFilialFilter(codFilial, contasAPagar.codFilial);
  if (filialFilter) {
    whereCondition = and(whereCondition, filialFilter);
  }

  return db
    .select({
      fornecedor: contasAPagar.fornecedor,
      totalPago: sql<number>`SUM(${contasAPagar.valorPago})`,
    })
    .from(contasAPagar)
    .where(whereCondition)
    .groupBy(contasAPagar.fornecedor)
    .orderBy(desc(sql`SUM(${contasAPagar.valorPago})`))
    .limit(limit);
}

export async function getDespesasPorFornecedor(uploadId: number, mes?: number | null, codFilial?: number[] | null) {
  const db = await getDb();
  if (!db) return [];

  let whereCondition: any = eq(contasAPagar.uploadId, uploadId);

  const filialFilter = buildFilialFilter(codFilial, contasAPagar.codFilial);
  if (filialFilter) {
    whereCondition = and(whereCondition, filialFilter);
  }

  if (mes !== null && mes !== undefined) {
    whereCondition = and(whereCondition, eq(contasAPagar.mes, mes));
  }

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

export async function getDespesasPorCategoria(uploadId: number, codFilial?: number[] | null) {
  const db = await getDb();
  if (!db) return [];

  let whereCondition: any = eq(contasAPagar.uploadId, uploadId);
  const filialFilter = buildFilialFilter(codFilial, contasAPagar.codFilial);
  if (filialFilter) {
    whereCondition = and(whereCondition, filialFilter);
  }

  return db
    .select({
      categoria: contasAPagar.descricaoDespesaSintetico,
      totalPago: sql<number>`SUM(${contasAPagar.valorPago})`,
    })
    .from(contasAPagar)
    .where(whereCondition)
    .groupBy(contasAPagar.descricaoDespesaSintetico)
    .orderBy(desc(sql`SUM(${contasAPagar.valorPago})`));
}

export async function getDespesasPorCentroCusto(uploadId: number, codFilial?: number[] | null) {
  const db = await getDb();
  if (!db) return [];

  let whereCondition: any = eq(contasAPagar.uploadId, uploadId);
  const filialFilter = buildFilialFilter(codFilial, contasAPagar.codFilial);
  if (filialFilter) {
    whereCondition = and(whereCondition, filialFilter);
  }

  return db
    .select({
      centroCusto: contasAPagar.descricaoCCSintetico, // Usar Sintético (coluna B)
      totalPago: sql<number>`COALESCE(SUM(${contasAPagar.valorPago}), 0)`,
      quantidade: sql<number>`COUNT(*)`,
    })
    .from(contasAPagar)
    .where(whereCondition)
    .groupBy(contasAPagar.descricaoCCSintetico)
    .orderBy(desc(sql`SUM(${contasAPagar.valorPago})`));
}

// ===== CONTAS A RECEBER =====

export async function insertContasAReceber(data: InsertContaAReceber[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (data.length === 0) return;

  // Validar e limpar dados antes de inserir
  const validData = data.filter(item => {
    if (!item.uploadId || item.uploadId <= 0) {
      console.warn(`[Insert] Contas a Receber: Registro inválido (sem uploadId):`, item);
      return false;
    }
    return true;
  });

  if (validData.length === 0) {
    console.warn(`[Insert] Contas a Receber: Nenhum registro válido para inserir`);
    return;
  }

  // Obter uploadId do primeiro registro válido
  const uploadId = validData[0].uploadId;

  // Deletar todos os registros existentes deste uploadId antes de inserir
  console.log(`[Insert] Contas a Receber: Deletando registros antigos do uploadId ${uploadId}...`);
  await db.delete(contasAReceber).where(eq(contasAReceber.uploadId, uploadId));
  console.log(`[Insert] Contas a Receber: Registros antigos deletados`);

  // Inserir em lotes menores para evitar timeouts (250 registros)
  const batchSize = 250;
  const totalBatches = Math.ceil(validData.length / batchSize);
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < validData.length; i += batchSize) {
    try {
      const batch = validData.slice(i, i + batchSize);

      // Timeout de 30 segundos por batch
      await Promise.race([
        db.insert(contasAReceber).values(batch),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout ao inserir batch ${i / batchSize + 1}`)), 30000)
        )
      ]);

      inserted += batch.length;

      if (totalBatches > 1 && (i / batchSize + 1) % 5 === 0) {
        console.log(`[Insert] Contas a Receber: ${inserted}/${validData.length} registros inseridos`);
      }
    } catch (error) {
      errors++;
      console.error(`[Insert] Contas a Receber: Erro no batch ${i / batchSize + 1}:`, error);

      // Tentar inserir um por um para identificar o registro problemático
      if (errors <= 3) {
        const batch = validData.slice(i, i + batchSize);
        for (let j = 0; j < batch.length; j++) {
          try {
            await db.insert(contasAReceber).values([batch[j]]);
            inserted++;
          } catch (singleError) {
            console.error(`[Insert] Contas a Receber: Erro ao inserir registro individual:`, {
              index: i + j,
              error: singleError instanceof Error ? singleError.message : String(singleError),
              data: JSON.stringify(batch[j]).substring(0, 200)
            });
          }
        }
      } else {
        throw new Error(`Muitos erros ao inserir Contas a Receber. Parando após ${errors} erros.`);
      }
    }
  }

  console.log(`[Insert] Contas a Receber: Concluído - ${inserted}/${validData.length} registros inseridos, ${errors} erros`);
}

export async function getContasAReceberByUpload(uploadId: number, mes?: number | null, codFilial?: number[] | null) {
  const db = await getDb();
  if (!db) return [];

  let whereCondition: any = eq(contasAReceber.uploadId, uploadId);
  const filialFilter = buildFilialFilter(codFilial, contasAReceber.codFilial);
  if (filialFilter) {
    whereCondition = and(whereCondition, filialFilter);
  }

  // Filtrar por mês se fornecido
  if (mes !== null && mes !== undefined) {
    whereCondition = and(whereCondition, eq(contasAReceber.mes, mes));
  }

  return db.select().from(contasAReceber).where(whereCondition);
}

export async function getContasAReceberSummary(uploadId: number, mes?: number | null, tipoVisualizacao: "realizado" | "projetado" | "todos" = "realizado", codFilial?: number[] | null) {
  const db = await getDb();
  if (!db) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Filtrar por mês se fornecido
  let whereCondition: any = eq(contasAReceber.uploadId, uploadId);

  // Adicionar filtro de filial
  const filialFilter = buildFilialFilter(codFilial, contasAReceber.codFilial);
  if (filialFilter) {
    whereCondition = and(whereCondition, filialFilter);
  }

  if (mes !== null && mes !== undefined) {
    // Filtrar por mês: usar campo MÊS ou extrair da data de recebimento quando MÊS for NULL
    whereCondition = and(
      whereCondition,
      or(
        eq(contasAReceber.mes, mes),
        and(
          isNull(contasAReceber.mes),
          sql`EXTRACT(MONTH FROM ${contasAReceber.dataRecebimento}) = ${mes}`
        )
      )
    );
  }

  // Filtrar por tipo de visualização
  if (tipoVisualizacao === "realizado") {
    // Apenas recebimentos REALMENTE recebidos: valorRecebido > 0 OU (sem valorRecebido mas com valor e data passada/sem data)
    whereCondition = and(
      whereCondition,
      or(
        sql`${contasAReceber.valorRecebido} > 0`,
        and(
          or(sql`${contasAReceber.valorRecebido} = 0`, isNull(contasAReceber.valorRecebido)),
          sql`${contasAReceber.valor} > 0`,
          or(
            and(isNotNull(contasAReceber.dataRecebimento), lte(contasAReceber.dataRecebimento, hoje)),
            isNull(contasAReceber.dataRecebimento)
          )
        )
      )
    );
  } else if (tipoVisualizacao === "projetado") {
    // Apenas recebimentos projetados: sem valor recebido ou com data futura
    whereCondition = and(
      whereCondition,
      or(
        sql`${contasAReceber.valorRecebido} = 0`,
        and(isNotNull(contasAReceber.dataRecebimento), gt(contasAReceber.dataRecebimento, hoje))
      ),
      sql`${contasAReceber.valor} > 0`
    );
  }

  // Para o cálculo, sempre usar apenas valorRecebido quando for "realizado"
  const result = await db
    .select({
      totalValor: sql<number>`COALESCE(SUM(${contasAReceber.valor}), 0)`,
      totalRecebido: tipoVisualizacao === "realizado"
        ? sql<number>`COALESCE(SUM(${contasAReceber.valorRecebido}), 0)`
        : sql<number>`COALESCE(SUM(${contasAReceber.valorRecebido}), 0)`,
      totalRegistros: sql<number>`COUNT(*)`,
    })
    .from(contasAReceber)
    .where(whereCondition);

  return result[0];
}

export async function getTopClientes(uploadId: number, limit: number = 10, codFilial?: number[] | null) {
  const db = await getDb();
  if (!db) return [];

  let whereCondition: any = and(
    eq(contasAReceber.uploadId, uploadId),
    sql`${contasAReceber.valorRecebido} > 0`
  );

  const filialFilter = buildFilialFilter(codFilial, contasAReceber.codFilial);
  if (filialFilter) {
    whereCondition = and(whereCondition, filialFilter);
  }

  // Apenas valores realmente recebidos (valorRecebido > 0)
  return db
    .select({
      cliente: contasAReceber.cliente,
      totalRecebido: sql<number>`COALESCE(SUM(${contasAReceber.valorRecebido}), 0)`,
    })
    .from(contasAReceber)
    .where(whereCondition)
    .groupBy(contasAReceber.cliente)
    .orderBy(desc(sql`SUM(${contasAReceber.valorRecebido})`))
    .limit(limit);
}

// Obter receitas agrupadas por HISTÓRICO (composição da receita)
export async function getReceitasPorHistorico(uploadId: number, codFilial?: number[] | null) {
  const db = await getDb();
  if (!db) return [];

  let whereCondition: any = and(
    eq(contasAReceber.uploadId, uploadId),
    sql`${contasAReceber.valorRecebido} > 0`,
    isNotNull(contasAReceber.historico)
  );

  const filialFilter = buildFilialFilter(codFilial, contasAReceber.codFilial);
  if (filialFilter) {
    whereCondition = and(whereCondition, filialFilter);
  }

  return db
    .select({
      historico: contasAReceber.historico,
      totalRecebido: sql<number>`COALESCE(SUM(${contasAReceber.valorRecebido}), 0)`,
      quantidade: sql<number>`COUNT(*)`,
    })
    .from(contasAReceber)
    .where(whereCondition)
    .groupBy(contasAReceber.historico)
    .orderBy(desc(sql`SUM(${contasAReceber.valorRecebido})`));
}

// Obter receitas agrupadas por FILIAL (para comparação entre filiais)
export async function getReceitasPorFilial(uploadId: number, mes?: number | null) {
  const db = await getDb();
  if (!db) return [];

  let whereCondition: any = and(
    eq(contasAReceber.uploadId, uploadId),
    sql`${contasAReceber.valorRecebido} > 0`,
    isNotNull(contasAReceber.codFilial)
  );

  // Filtrar por mês se fornecido
  if (mes !== null && mes !== undefined) {
    whereCondition = and(whereCondition, eq(contasAReceber.mes, mes));
  }

  const result = await db
    .select({
      codFilial: contasAReceber.codFilial,
      totalRecebido: sql<number>`COALESCE(SUM(${contasAReceber.valorRecebido}), 0)`,
      quantidade: sql<number>`COUNT(*)`,
    })
    .from(contasAReceber)
    .where(whereCondition)
    .groupBy(contasAReceber.codFilial)
    .orderBy(asc(contasAReceber.codFilial));

  // Buscar nomes das filiais
  const filiaisData = await db
    .select()
    .from(filiais)
    .where(inArray(filiais.codigo, result.map(r => r.codFilial!).filter(Boolean)));

  const filiaisMap = new Map(filiaisData.map(f => [f.codigo, f.nome]));

  return result.map(r => ({
    codFilial: r.codFilial!,
    nomeFilial: filiaisMap.get(r.codFilial!) || `Filial ${r.codFilial}`,
    totalRecebido: Number(r.totalRecebido),
    quantidade: Number(r.quantidade),
  }));
}


export async function getReceitasPorEmpresa(uploadId: number, mes?: number | null, codFilial?: number[] | null) {
  const db = await getDb();
  if (!db) return [];

  let whereCondition: any = eq(contasAReceber.uploadId, uploadId);

  // Adicionar filtro de filial
  const filialFilter = buildFilialFilter(codFilial, contasAReceber.codFilial);
  if (filialFilter) {
    whereCondition = and(whereCondition, filialFilter);
  }

  if (mes !== null && mes !== undefined) {
    whereCondition = and(whereCondition, eq(contasAReceber.mes, mes));
  }

  // Apenas valores realmente recebidos (valorRecebido > 0)
  whereCondition = and(
    whereCondition,
    sql`${contasAReceber.valorRecebido} > 0`
  );

  const result = await db
    .select({
      cliente: contasAReceber.cliente,
      quantidadePagamentos: sql<number>`COUNT(*)`,
      totalPagamentos: sql<number>`COALESCE(SUM(${contasAReceber.valorRecebido}), 0)`,
      mediaPagamentos: sql<number>`COALESCE(AVG(${contasAReceber.valorRecebido}), 0)`,
      ultimoPagamento: sql<Date | null>`MAX(${contasAReceber.dataRecebimento})`,
    })
    .from(contasAReceber)
    .where(whereCondition)
    .groupBy(contasAReceber.cliente)
    .orderBy(desc(sql`SUM(${contasAReceber.valorRecebido})`));

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

  // Validar e limpar dados antes de inserir
  const validData = data.filter(item => {
    if (!item.uploadId || item.uploadId <= 0) {
      console.warn(`[Insert] Folha: Registro inválido (sem uploadId):`, item);
      return false;
    }
    if (!item.nome || item.nome.trim() === "") {
      console.warn(`[Insert] Folha: Registro inválido (sem nome):`, item);
      return false;
    }
    return true;
  });

  if (validData.length === 0) {
    console.warn(`[Insert] Folha: Nenhum registro válido para inserir`);
    return;
  }

  // Obter uploadId do primeiro registro válido
  const uploadId = validData[0].uploadId;

  // Deletar todos os registros existentes deste uploadId antes de inserir
  console.log(`[Insert] Folha: Deletando registros antigos do uploadId ${uploadId}...`);
  await db.delete(folhaPagamento).where(eq(folhaPagamento.uploadId, uploadId));
  console.log(`[Insert] Folha: Registros antigos deletados`);

  // Inserir em lotes menores para evitar timeouts (250 registros)
  const batchSize = 250;
  const totalBatches = Math.ceil(validData.length / batchSize);
  let inserted = 0;
  let errors = 0;

  // Tentar adicionar a coluna tipo_vinculo se não existir (fallback)
  try {
    await db.execute(sql`ALTER TABLE "folha_pagamento" ADD COLUMN IF NOT EXISTS "tipo_vinculo" varchar(10);`);
    console.log(`[Insert] Folha: Coluna tipo_vinculo verificada/criada`);
  } catch (alterError: unknown) {
    // Ignorar erro se coluna já existe ou se não tiver permissão
    const errorMessage = alterError instanceof Error ? alterError.message : String(alterError);
    if (!errorMessage.includes('already exists') && !errorMessage.includes('duplicate')) {
      console.warn(`[Insert] Folha: Não foi possível criar coluna tipo_vinculo (pode já existir):`, errorMessage);
    }
  }

  for (let i = 0; i < validData.length; i += batchSize) {
    try {
      const batch = validData.slice(i, i + batchSize);

      // Timeout de 30 segundos por batch
      await Promise.race([
        db.insert(folhaPagamento).values(batch),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout ao inserir batch ${i / batchSize + 1}`)), 30000)
        )
      ]);

      inserted += batch.length;

      if (totalBatches > 1 && (i / batchSize + 1) % 5 === 0) {
        console.log(`[Insert] Folha de Pagamento: ${inserted}/${validData.length} registros inseridos`);
      }
    } catch (error: any) {
      errors++;
      const errorMessage = error?.message || String(error);
      console.error(`[Insert] Folha: Erro no batch ${i / batchSize + 1}:`, errorMessage);

      // Se o erro for sobre coluna tipo_vinculo não existir, tentar sem esse campo
      if (errorMessage.includes('tipo_vinculo') && errorMessage.includes('does not exist')) {
        console.log(`[Insert] Folha: Tentando inserir sem campo tipo_vinculo...`);
        const batch = validData.slice(i, i + batchSize);
        const batchWithoutTipoVinculo = batch.map(item => {
          const { tipoVinculo, ...rest } = item;
          return rest;
        });

        try {
          await db.insert(folhaPagamento).values(batchWithoutTipoVinculo);
          inserted += batch.length;
          console.log(`[Insert] Folha: Batch ${i / batchSize + 1} inserido sem tipo_vinculo`);
          continue;
        } catch (retryError) {
          console.error(`[Insert] Folha: Erro mesmo sem tipo_vinculo:`, retryError);
        }
      }

      // Tentar inserir um por um para identificar o registro problemático
      if (errors <= 3) {
        const batch = validData.slice(i, i + batchSize);
        for (let j = 0; j < batch.length; j++) {
          try {
            await db.insert(folhaPagamento).values([batch[j]]);
            inserted++;
          } catch (singleError: any) {
            // Se erro for sobre tipo_vinculo, tentar sem esse campo
            const singleErrorMessage = singleError?.message || String(singleError);
            if (singleErrorMessage.includes('tipo_vinculo') && singleErrorMessage.includes('does not exist')) {
              try {
                const { tipoVinculo, ...itemWithoutTipoVinculo } = batch[j];
                await db.insert(folhaPagamento).values([itemWithoutTipoVinculo]);
                inserted++;
                console.log(`[Insert] Folha: Registro ${i + j} inserido sem tipo_vinculo`);
              } catch (retryError) {
                console.error(`[Insert] Folha: Erro ao inserir registro individual (sem tipo_vinculo):`, {
                  index: i + j,
                  error: retryError instanceof Error ? retryError.message : String(retryError),
                  nome: batch[j].nome,
                  uploadId: batch[j].uploadId
                });
              }
            } else {
              console.error(`[Insert] Folha: Erro ao inserir registro individual:`, {
                index: i + j,
                error: singleErrorMessage,
                nome: batch[j].nome,
                uploadId: batch[j].uploadId
              });
            }
          }
        }
      } else {
        throw new Error(`Muitos erros ao inserir Folha de Pagamento. Parando após ${errors} erros.`);
      }
    }
  }

  console.log(`[Insert] Folha de Pagamento: Concluído - ${inserted}/${validData.length} registros inseridos, ${errors} erros`);
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
      totalFolha: sql<number>`COALESCE(SUM(${folhaPagamento.total}), 0)`,
      totalFuncionarios: sql<number>`COUNT(DISTINCT ${folhaPagamento.nome})`,
    })
    .from(folhaPagamento)
    .where(eq(folhaPagamento.uploadId, uploadId));

  return result[0];
}

export async function getFolhaPagamentoTotalByType(uploadId: number, tipoPagamento: string) {
  const db = await getDb();
  if (!db) return 0;

  // Se for comissão, buscar também por variações no tipoPagamento
  let whereCondition: any = eq(folhaPagamento.uploadId, uploadId);

  if (tipoPagamento === 'COMISSÃO VENDAS' || tipoPagamento.includes('COMISSÃO') || tipoPagamento.includes('COMISSAO')) {
    // Buscar por tipoPagamento contendo COMISSÃO ou COMISSAO (case insensitive)
    whereCondition = and(
      whereCondition,
      or(
        sql`UPPER(${folhaPagamento.tipoPagamento}) LIKE '%COMISSÃO%'`,
        sql`UPPER(${folhaPagamento.tipoPagamento}) LIKE '%COMISSAO%'`,
        sql`UPPER(${folhaPagamento.tipoPagamento}) LIKE '%COMISSÃO VENDAS%'`,
        sql`UPPER(${folhaPagamento.tipoPagamento}) LIKE '%COMISSAO VENDAS%'`
      )
    );
  } else {
    // Para outros tipos, buscar exatamente como antes
    whereCondition = and(
      whereCondition,
      eq(folhaPagamento.tipoPagamento, tipoPagamento)
    );
  }

  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${folhaPagamento.total}), 0)`,
    })
    .from(folhaPagamento)
    .where(whereCondition);

  return result[0].total;
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

  // Validar e limpar dados antes de inserir
  const validData = data.filter(item => {
    if (!item.uploadId || item.uploadId <= 0) {
      console.warn(`[Insert] Saldos Bancários: Registro inválido (sem uploadId):`, item);
      return false;
    }
    return true;
  });

  if (validData.length === 0) {
    console.warn(`[Insert] Saldos Bancários: Nenhum registro válido para inserir`);
    return;
  }

  // Obter uploadId do primeiro registro válido
  const uploadId = validData[0].uploadId;

  // Deletar todos os registros existentes deste uploadId antes de inserir
  console.log(`[Insert] Saldos Bancários: Deletando registros antigos do uploadId ${uploadId}...`);
  await db.delete(saldosBancarios).where(eq(saldosBancarios.uploadId, uploadId));
  console.log(`[Insert] Saldos Bancários: Registros antigos deletados`);

  try {
    // Saldos bancários geralmente são poucos registros, pode inserir tudo de uma vez
    await db.insert(saldosBancarios).values(validData);
    console.log(`[Insert] Saldos Bancários: ${validData.length} registros inseridos`);
  } catch (error) {
    console.error(`[Insert] Saldos Bancários: Erro ao inserir:`, error);
    throw error;
  }
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

export async function getDashboardSummary(uploadId: number, tipoVisualizacao: "realizado" | "projetado" | "todos" = "realizado", codFilial?: number[] | null) {
  const db = await getDb();
  if (!db) return null;

  const [contasPagar, contasReceber, folha, saldos] = await Promise.all([
    getContasAPagarSummary(uploadId, tipoVisualizacao, codFilial),
    getContasAReceberSummary(uploadId, undefined, tipoVisualizacao, codFilial),
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

export async function getReceitasMensais(uploadId: number, codFilial?: number[] | null) {
  const db = await getDb();
  if (!db) return [];

  let whereCondition: any = eq(contasAReceber.uploadId, uploadId);
  const filialFilter = buildFilialFilter(codFilial, contasAReceber.codFilial);
  if (filialFilter) {
    whereCondition = and(whereCondition, filialFilter);
  }

  // Usar EXTRACT(MONTH FROM data_recebimento) quando mes for NULL para garantir que todos os registros sejam incluídos
  const receitasPorMes = await db
    .select({
      mes: sql<number>`COALESCE(${contasAReceber.mes}, EXTRACT(MONTH FROM ${contasAReceber.dataRecebimento})::int)`,
      totalValor: sql<number>`COALESCE(SUM(${contasAReceber.valor}), 0)`,
      totalRecebido: sql<number>`COALESCE(SUM(${contasAReceber.valorRecebido}), 0)`,
      totalRegistros: sql<number>`COUNT(*)`,
    })
    .from(contasAReceber)
    .where(whereCondition)
    .groupBy(sql`COALESCE(${contasAReceber.mes}, EXTRACT(MONTH FROM ${contasAReceber.dataRecebimento})::int)`)
    .orderBy(asc(sql`COALESCE(${contasAReceber.mes}, EXTRACT(MONTH FROM ${contasAReceber.dataRecebimento})::int)`));

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

export async function getDespesasMensais(uploadId: number, codFilial?: number[] | null) {
  const db = await getDb();
  if (!db) return [];

  let whereCondition: any = eq(contasAPagar.uploadId, uploadId);
  const filialFilter = buildFilialFilter(codFilial, contasAPagar.codFilial);
  if (filialFilter) {
    whereCondition = and(whereCondition, filialFilter);
  }

  const despesasPorMes = await db
    .select({
      mes: contasAPagar.mes,
      totalValor: sql<number>`COALESCE(SUM(${contasAPagar.valor}), 0)`,
      totalPago: sql<number>`COALESCE(SUM(${contasAPagar.valorPago}), 0)`,
      totalRegistros: sql<number>`COUNT(*)`,
    })
    .from(contasAPagar)
    .where(whereCondition)
    .groupBy(contasAPagar.mes)
    .orderBy(asc(contasAPagar.mes));

  // Garantir que todos os 12 meses apareçam
  const mesesComDados = new Map(
    despesasPorMes
      .filter(d => d.mes !== null && d.mes !== undefined)
      .map(d => [d.mes!, {
        mes: d.mes!,
        mesNome: getMesNome(d.mes!),
        totalValor: Number(d.totalValor),
        totalPago: Number(d.totalPago),
        totalRegistros: Number(d.totalRegistros),
      }])
  );

  // Preencher todos os 12 meses
  const todosMeses = [];
  for (let mes = 1; mes <= 12; mes++) {
    if (mesesComDados.has(mes)) {
      todosMeses.push(mesesComDados.get(mes)!);
    } else {
      todosMeses.push({
        mes,
        mesNome: getMesNome(mes),
        totalValor: 0,
        totalPago: 0,
        totalRegistros: 0,
      });
    }
  }

  return todosMeses;
}

export async function getDadosMensais(uploadId: number, codFilial?: number[] | null) {
  const db = await getDb();
  if (!db) return null;

  let whereReceitas: any = and(
    eq(contasAReceber.uploadId, uploadId),
    sql`${contasAReceber.valorRecebido} > 0`
  );
  const filialFilterReceitas = buildFilialFilter(codFilial, contasAReceber.codFilial);
  if (filialFilterReceitas) {
    whereReceitas = and(whereReceitas, filialFilterReceitas);
  }

  // Buscar receitas por mês - apenas valores realmente recebidos
  // Usar EXTRACT(MONTH FROM data_recebimento) quando mes for NULL para garantir que todos os registros sejam incluídos
  const receitasPorMes = await db
    .select({
      mes: sql<number>`COALESCE(${contasAReceber.mes}, EXTRACT(MONTH FROM ${contasAReceber.dataRecebimento})::int)`,
      totalValor: sql<number>`COALESCE(SUM(${contasAReceber.valor}), 0)`,
      totalRecebido: sql<number>`COALESCE(SUM(${contasAReceber.valorRecebido}), 0)`,
      totalRegistros: sql<number>`COUNT(*)`,
    })
    .from(contasAReceber)
    .where(whereReceitas)
    .groupBy(sql`COALESCE(${contasAReceber.mes}, EXTRACT(MONTH FROM ${contasAReceber.dataRecebimento})::int)`)
    .orderBy(asc(sql`COALESCE(${contasAReceber.mes}, EXTRACT(MONTH FROM ${contasAReceber.dataRecebimento})::int)`));

  let whereDespesas: any = eq(contasAPagar.uploadId, uploadId);
  const filialFilterDespesas = buildFilialFilter(codFilial, contasAPagar.codFilial);
  if (filialFilterDespesas) {
    whereDespesas = and(whereDespesas, filialFilterDespesas);
  }

  // Buscar despesas por mês
  const despesasPorMes = await db
    .select({
      mes: contasAPagar.mes,
      totalValor: sql<number>`COALESCE(SUM(${contasAPagar.valor}), 0)`,
      totalPago: sql<number>`COALESCE(SUM(${contasAPagar.valorPago}), 0)`,
      totalRegistros: sql<number>`COUNT(*)`,
    })
    .from(contasAPagar)
    .where(whereDespesas)
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

// ===== DRE ESPECÍFICO =====

export async function getDRESummary(uploadId: number, mes?: number | null, tipoVisualizacao: "realizado" | "projetado" | "todos" = "realizado", codFilial?: number[] | null) {
  const db = await getDb();
  if (!db) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Construir condições WHERE para receitas
  let receitasWhere: any = eq(contasAReceber.uploadId, uploadId);

  // Adicionar filtro de filial para receitas
  const filialFilterReceitas = buildFilialFilter(codFilial, contasAReceber.codFilial);
  if (filialFilterReceitas) {
    receitasWhere = and(receitasWhere, filialFilterReceitas);
  }

  if (mes !== null && mes !== undefined) {
    receitasWhere = and(receitasWhere, eq(contasAReceber.mes, mes));
  }

  // Aplicar filtro de tipo de visualização para receitas
  if (tipoVisualizacao === "realizado") {
    receitasWhere = and(
      receitasWhere,
      or(
        sql`${contasAReceber.valorRecebido} > 0`,
        and(
          or(sql`${contasAReceber.valorRecebido} = 0`, isNull(contasAReceber.valorRecebido)),
          sql`${contasAReceber.valor} > 0`,
          or(
            and(isNotNull(contasAReceber.dataRecebimento), lte(contasAReceber.dataRecebimento, hoje)),
            isNull(contasAReceber.dataRecebimento)
          )
        )
      )
    );
  } else if (tipoVisualizacao === "projetado") {
    receitasWhere = and(
      receitasWhere,
      or(
        sql`${contasAReceber.valorRecebido} = 0`,
        and(isNotNull(contasAReceber.dataRecebimento), gt(contasAReceber.dataRecebimento, hoje))
      ),
      sql`${contasAReceber.valor} > 0`
    );
  }

  // Construir condições WHERE para despesas
  let despesasWhere: any = eq(contasAPagar.uploadId, uploadId);

  // Adicionar filtro de filial para despesas
  const filialFilterDespesas = buildFilialFilter(codFilial, contasAPagar.codFilial);
  if (filialFilterDespesas) {
    despesasWhere = and(despesasWhere, filialFilterDespesas);
  }

  if (mes !== null && mes !== undefined) {
    despesasWhere = and(despesasWhere, eq(contasAPagar.mes, mes));
  }

  // Aplicar filtro de tipo de visualização para despesas
  if (tipoVisualizacao === "realizado") {
    despesasWhere = and(
      despesasWhere,
      or(
        and(isNotNull(contasAPagar.dataPagamento), lte(contasAPagar.dataPagamento, hoje)),
        and(isNull(contasAPagar.dataPagamento), sql`${contasAPagar.valorPago} > 0`),
        and(
          or(sql`${contasAPagar.valorPago} = 0`, isNull(contasAPagar.valorPago)),
          sql`${contasAPagar.valor} > 0`,
          or(
            and(isNotNull(contasAPagar.dataPagamento), lte(contasAPagar.dataPagamento, hoje)),
            isNull(contasAPagar.dataPagamento)
          )
        )
      )
    );
  } else if (tipoVisualizacao === "projetado") {
    despesasWhere = and(
      despesasWhere,
      or(
        and(isNotNull(contasAPagar.dataPagamento), gt(contasAPagar.dataPagamento, hoje)),
        and(isNull(contasAPagar.dataPagamento), sql`${contasAPagar.valorPago} = 0`, sql`${contasAPagar.valor} > 0`)
      )
    );
  }

  // Buscar receitas
  const receitasResult = await db
    .select({
      totalValor: sql<number>`COALESCE(SUM(${contasAReceber.valor}), 0)`,
      totalRecebido: sql<number>`COALESCE(SUM(${contasAReceber.valorRecebido}), 0)`,
    })
    .from(contasAReceber)
    .where(receitasWhere);

  // Buscar despesas
  const despesasResult = await db
    .select({
      totalValor: sql<number>`COALESCE(SUM(${contasAPagar.valor}), 0)`,
      totalPago: sql<number>`COALESCE(SUM(${contasAPagar.valorPago}), 0)`,
    })
    .from(contasAPagar)
    .where(despesasWhere);

  // Buscar folha - se há filtro de mês, buscar apenas daquele mês, senão buscar total
  let folhaResult;
  if (mes !== null && mes !== undefined && mes >= 1 && mes <= 8) {
    // Buscar folha do mês específico usando mes1, mes2, etc.
    // A folha só tem até mes8, então se o mês for > 8, usar total
    const mesFields = [
      folhaPagamento.mes1,
      folhaPagamento.mes2,
      folhaPagamento.mes3,
      folhaPagamento.mes4,
      folhaPagamento.mes5,
      folhaPagamento.mes6,
      folhaPagamento.mes7,
      folhaPagamento.mes8,
    ];
    const mesField = mesFields[mes - 1];

    folhaResult = await db
      .select({
        totalFolha: sql<number>`COALESCE(SUM(${mesField}), 0)`,
        totalFuncionarios: sql<number>`COUNT(DISTINCT ${folhaPagamento.nome})`,
      })
      .from(folhaPagamento)
      .where(eq(folhaPagamento.uploadId, uploadId));
  } else {
    // Buscar folha total quando não há filtro de mês ou mês > 8
    folhaResult = await db
      .select({
        totalFolha: sql<number>`COALESCE(SUM(${folhaPagamento.total}), 0)`,
        totalFuncionarios: sql<number>`COUNT(DISTINCT ${folhaPagamento.nome})`,
      })
      .from(folhaPagamento)
      .where(eq(folhaPagamento.uploadId, uploadId));
  }

  const receitas = receitasResult[0] || { totalValor: 0, totalRecebido: 0 };
  const despesas = despesasResult[0] || { totalValor: 0, totalPago: 0 };
  const folha = folhaResult[0] || { totalFolha: 0, totalFuncionarios: 0 };

  // Usar totalRecebido para "realizado", senão usar totalValor
  const totalReceitas = tipoVisualizacao === "realizado"
    ? Number(receitas.totalRecebido)
    : (Number(receitas.totalRecebido) > 0 ? Number(receitas.totalRecebido) : Number(receitas.totalValor));

  const totalDespesas = Number(despesas.totalPago);
  const totalFolha = Number(folha.totalFolha);

  const lucroOperacional = totalReceitas - totalDespesas;
  const lucroLiquido = totalReceitas - totalDespesas - totalFolha;
  const margemOperacional = totalReceitas > 0 ? (lucroOperacional / totalReceitas) * 100 : 0;
  const margemLiquida = totalReceitas > 0 ? (lucroLiquido / totalReceitas) * 100 : 0;

  return {
    receitas: {
      totalValor: Number(receitas.totalValor),
      totalRecebido: Number(receitas.totalRecebido),
      total: totalReceitas,
    },
    despesas: {
      totalValor: Number(despesas.totalValor),
      totalPago: totalDespesas,
    },
    folha: {
      totalFolha: totalFolha,
      totalFuncionarios: Number(folha.totalFuncionarios),
    },
    resultado: {
      lucroOperacional,
      lucroLiquido,
      margemOperacional,
      margemLiquida,
    },
  };
}

// Buscar DRE de todos os meses para tabela horizontal
export async function getDREPorMeses(uploadId: number, codFilial?: number[] | null) {
  const db = await getDb();
  if (!db) return [];

  const meses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const drePorMeses = [];

  for (const mes of meses) {
    const dre = await getDRESummary(uploadId, mes, "realizado", codFilial);
    if (dre) {
      drePorMeses.push({
        mes,
        mesNome: getMesNome(mes),
        receitas: dre.receitas.total,
        despesas: dre.despesas.totalPago,
        folha: dre.folha.totalFolha,
        lucroOperacional: dre.resultado.lucroOperacional,
        lucroLiquido: dre.resultado.lucroLiquido,
        margemOperacional: dre.resultado.margemOperacional,
        margemLiquida: dre.resultado.margemLiquida,
      });
    } else {
      drePorMeses.push({
        mes,
        mesNome: getMesNome(mes),
        receitas: 0,
        despesas: 0,
        folha: 0,
        lucroOperacional: 0,
        lucroLiquido: 0,
        margemOperacional: 0,
        margemLiquida: 0,
      });
    }
  }

  return drePorMeses;
}

function getMesNome(mes: number): string {
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  return meses[mes - 1] || `Mês ${mes}`;
}

// ===== FILIAIS =====

// Função para obter ou criar nome da filial
async function getOrCreateNomeFilial(db: any, codigo: number): Promise<string> {
  // Primeiro, tentar buscar da tabela de filiais
  const filialExistente = await db
    .select()
    .from(filiais)
    .where(eq(filiais.codigo, codigo))
    .limit(1);

  if (filialExistente.length > 0) {
    return filialExistente[0].nome;
  }

  // Se não existir, criar com nome padrão baseado em mapeamento conhecido
  // Baseado na documentação: filiais [1, 3, 4, 5, 6, 7]
  const nomesPadrao: Record<number, string> = {
    1: "Matriz (RP)",
    3: "Sul",
    4: "BH",
    5: "Filial 5",
    6: "Filial 6",
    7: "Filial 7",
  };

  const nome = nomesPadrao[codigo] || `Filial ${codigo}`;

  // Inserir na tabela de filiais para uso futuro
  try {
    await db.insert(filiais).values({
      codigo,
      nome,
    });
  } catch (error) {
    // Ignorar erro se já existir (race condition)
    console.log(`[Filial] Filial ${codigo} já existe ou erro ao inserir:`, error);
  }

  return nome;
}

export async function getFiliaisDisponiveis(uploadId: number) {
  const db = await getDb();
  if (!db) return [];

  // Garantir que a tabela existe antes de usar
  await ensureFiliaisTableExists();

  // Buscar todas as filiais cadastradas na tabela de filiais
  // As filiais são cadastradas automaticamente durante a importação
  const filiaisCadastradas = await db
    .select()
    .from(filiais)
    .orderBy(asc(filiais.codigo));

  // Se houver filiais cadastradas, retornar elas
  if (filiaisCadastradas.length > 0) {
    return filiaisCadastradas.map(f => ({
      codigo: f.codigo,
      nome: f.nome,
    }));
  }

  // Caso contrário, buscar filiais únicas de contas a pagar e receber
  const [filiaisPagar, filiaisReceber] = await Promise.all([
    db
      .selectDistinct({ codFilial: contasAPagar.codFilial })
      .from(contasAPagar)
      .where(
        and(
          eq(contasAPagar.uploadId, uploadId),
          isNotNull(contasAPagar.codFilial)
        )
      ),
    db
      .selectDistinct({ codFilial: contasAReceber.codFilial })
      .from(contasAReceber)
      .where(
        and(
          eq(contasAReceber.uploadId, uploadId),
          isNotNull(contasAReceber.codFilial)
        )
      ),
  ]);

  // Combinar e remover duplicatas
  const todasFiliais = new Set<number>();
  filiaisPagar.forEach(f => f.codFilial && todasFiliais.add(f.codFilial));
  filiaisReceber.forEach(f => f.codFilial && todasFiliais.add(f.codFilial));

  // Se não encontrou filiais nos dados, retornar filiais padrão conhecidas
  // (fallback caso a importação não tenha cadastrado as filiais)
  // Baseado na documentação: filiais [1, 3, 4, 5, 6, 7]
  if (todasFiliais.size === 0) {
    const filiaisPadrao = [
      { codigo: 1, nome: "Matriz (RP)" },
      { codigo: 3, nome: "Sul" },
      { codigo: 4, nome: "BH" },
      { codigo: 5, nome: "Filial 5" },
      { codigo: 6, nome: "Filial 6" },
      { codigo: 7, nome: "Filial 7" },
    ];

    // Criar essas filiais na tabela para uso futuro
    for (const filial of filiaisPadrao) {
      try {
        await db.insert(filiais).values({
          codigo: filial.codigo,
          nome: filial.nome,
        });
      } catch (error) {
        // Ignorar se já existir
      }
    }

    return filiaisPadrao;
  }

  // Buscar nomes das filiais da tabela ou criar com nomes padrão
  const filiaisComNomes = await Promise.all(
    Array.from(todasFiliais)
      .sort((a, b) => a - b)
      .map(async (cod) => ({
        codigo: cod,
        nome: await getOrCreateNomeFilial(db, cod),
      }))
  );

  return filiaisComNomes;
}

// ===== DESPESAS DE PESSOAL =====

// Função auxiliar para categorizar despesa de pessoal baseado no código analítico
function categorizarDespesaPessoal(
  despesaAnalitico: string | null | undefined,
  descricaoAnalitica: string | null | undefined,
  historico: string | null | undefined
): "salario" | "comissao" | "bonus" | "prolabore" | "outras" {
  if (!despesaAnalitico && !descricaoAnalitica && !historico) {
    return "outras";
  }

  const codigoStr = despesaAnalitico ? String(despesaAnalitico).trim() : "";
  const descricaoStr = descricaoAnalitica ? String(descricaoAnalitica).toUpperCase() : "";
  const historicoStr = historico ? String(historico).toUpperCase() : "";

  // Pro-labore: código 900002
  if (codigoStr === "900002" || descricaoStr.includes("PRO-LABORE") || historicoStr.includes("PRO-LABORE")) {
    return "prolabore";
  }

  // Comissões: códigos 200030, 200031
  if (
    codigoStr === "200030" ||
    codigoStr === "200031" ||
    descricaoStr.includes("COMISSÃO VENDAS") ||
    descricaoStr.includes("COMISSAO VENDAS") ||
    historicoStr.includes("COMISSÃO") ||
    historicoStr.includes("COMISSAO")
  ) {
    // Verificar se não é salário de representante (200001 exclui comissões)
    if (codigoStr !== "200001") {
      return "comissao";
    }
  }

  // Bônus e Gratificações: código 600020
  if (
    codigoStr === "600020" ||
    descricaoStr.includes("GRATIFICAÇÃO") ||
    descricaoStr.includes("GRATIFICACAO") ||
    historicoStr.includes("GRATIFICAÇÃO") ||
    historicoStr.includes("GRATIFICACAO") ||
    historicoStr.includes("PREMIO") ||
    historicoStr.includes("PRÊMIO") ||
    historicoStr.includes("BONUS") ||
    historicoStr.includes("BÔNUS")
  ) {
    return "bonus";
  }

  // Salários: códigos 600017, 200001, 600026
  if (
    codigoStr === "600017" ||
    codigoStr === "200001" ||
    codigoStr === "600026" ||
    descricaoStr.includes("SALARIO") ||
    descricaoStr.includes("SALÁRIO") ||
    descricaoStr.includes("FOLHA") ||
    historicoStr.includes("SALARIO") ||
    historicoStr.includes("SALÁRIO") ||
    historicoStr.includes("13º SALARIO") ||
    historicoStr.includes("13º SALÁRIO")
  ) {
    return "salario";
  }

  return "outras";
}

// Obter despesas de pessoal categorizadas (salários, comissões, bônus, pro-labore)
export async function getDespesasPessoalCategorizadas(
  uploadId: number,
  codFilial?: number[] | null,
  mes?: number | null,
  ano?: number | null
) {
  const db = await getDb();
  if (!db) return [];

  let whereCondition: any = eq(contasAPagar.uploadId, uploadId);

  const filialFilter = buildFilialFilter(codFilial, contasAPagar.codFilial);
  if (filialFilter) {
    whereCondition = and(whereCondition, filialFilter);
  }

  if (mes !== null && mes !== undefined) {
    whereCondition = and(whereCondition, eq(contasAPagar.mes, mes));
  }

  // Filtrar por ano usando a data de pagamento
  if (ano !== null && ano !== undefined) {
    whereCondition = and(
      whereCondition,
      sql`EXTRACT(YEAR FROM ${contasAPagar.dataPagamento}) = ${ano}`
    );
  }

  // Buscar todas as despesas que podem ser de pessoal
  const despesas = await db
    .select({
      despesaAnalitico: contasAPagar.despesaAnalitico,
      descricaoDespesaAnalitica: contasAPagar.descricaoDespesaAnalitica,
      historico: contasAPagar.historico,
      valorPago: contasAPagar.valorPago,
    })
    .from(contasAPagar)
    .where(whereCondition);

  // Categorizar e somar
  const categorias: Record<string, number> = {
    salario: 0,
    comissao: 0,
    bonus: 0,
    "pro-labore": 0,
    "distribuicao-lucros": 0,
    outros: 0,
  };

  for (const despesa of despesas) {
    const categoria = categorizarDespesaPessoal(
      despesa.despesaAnalitico,
      despesa.descricaoDespesaAnalitica,
      despesa.historico
    );

    const valor = Number(despesa.valorPago || 0);
    const catKey = categoria === "prolabore"
      ? "pro-labore"
      : categoria === "distribuicaoLucros"
        ? "distribuicao-lucros"
        : categoria === "outras"
          ? "outros"
          : categoria;
    categorias[catKey] = (categorias[catKey] || 0) + valor;
  }

  // Retornar como array
  return Object.entries(categorias).map(([categoria, total]) => ({
    categoria,
    total,
  }));
}

// Obter despesas de pessoal detalhadas por categoria
export async function getDespesasPessoalDetalhadas(
  uploadId: number,
  categoria: "salario" | "comissao" | "bonus" | "prolabore",
  codFilial?: number[] | null,
  mes?: number | null
) {
  const db = await getDb();
  if (!db) return [];

  let whereCondition: any = eq(contasAPagar.uploadId, uploadId);

  const filialFilter = buildFilialFilter(codFilial, contasAPagar.codFilial);
  if (filialFilter) {
    whereCondition = and(whereCondition, filialFilter);
  }

  if (mes !== null && mes !== undefined) {
    whereCondition = and(whereCondition, eq(contasAPagar.mes, mes));
  }

  // Buscar todas as despesas
  const despesas = await db
    .select()
    .from(contasAPagar)
    .where(whereCondition);

  // Filtrar pela categoria
  return despesas.filter(despesa => {
    const cat = categorizarDespesaPessoal(
      despesa.despesaAnalitico,
      despesa.descricaoDespesaAnalitica,
      despesa.historico
    );
    return cat === categoria;
  });
}

// Obter folha de pagamento baseada em despesas de pessoal (da aba PAGO)
// Agrupada por mês de pagamento e categoria
export async function getFolhaPagamentoPorDespesas(
  uploadId: number,
  codFilial?: number[] | null,
  mes?: number | null
) {
  const db = await getDb();
  if (!db) return { porMes: [], porCategoria: { salario: 0, comissao: 0, bonus: 0, prolabore: 0, outras: 0, total: 0 } };

  let whereCondition: any = eq(contasAPagar.uploadId, uploadId);

  const filialFilter = buildFilialFilter(codFilial, contasAPagar.codFilial);
  if (filialFilter) {
    whereCondition = and(whereCondition, filialFilter);
  }

  if (mes !== null && mes !== undefined) {
    whereCondition = and(whereCondition, eq(contasAPagar.mes, mes));
  }

  // Buscar todas as despesas de pessoal com data de pagamento
  const despesas = await db
    .select({
      despesaAnalitico: contasAPagar.despesaAnalitico,
      descricaoDespesaAnalitica: contasAPagar.descricaoDespesaAnalitica,
      historico: contasAPagar.historico,
      valorPago: contasAPagar.valorPago,
      dataPagamento: contasAPagar.dataPagamento,
      mes: contasAPagar.mes,
      fornecedor: contasAPagar.fornecedor,
      codFilial: contasAPagar.codFilial,
    })
    .from(contasAPagar)
    .where(whereCondition);

  // Agrupar por mês e categoria
  const porMes: Record<number, { salario: number, comissao: number, bonus: number, prolabore: number, outras: number, total: number }> = {};
  const porCategoria = { salario: 0, comissao: 0, bonus: 0, prolabore: 0, outras: 0, total: 0 };

  for (const despesa of despesas) {
    const categoria = categorizarDespesaPessoal(
      despesa.despesaAnalitico,
      despesa.descricaoDespesaAnalitica,
      despesa.historico
    );

    const valor = Number(despesa.valorPago || 0);

    // Agrupar por mês (usar mês do campo MÊS ou extrair da data de pagamento)
    let mesDespesa = despesa.mes;
    if (!mesDespesa && despesa.dataPagamento) {
      const data = new Date(despesa.dataPagamento);
      mesDespesa = data.getMonth() + 1;
    }

    if (mesDespesa) {
      if (!porMes[mesDespesa]) {
        porMes[mesDespesa] = { salario: 0, comissao: 0, bonus: 0, prolabore: 0, outras: 0, total: 0 };
      }
      porMes[mesDespesa][categoria] += valor;
      porMes[mesDespesa].total += valor;
    }

    // Total por categoria
    porCategoria[categoria] += valor;
    porCategoria.total += valor;
  }

  // Converter para array ordenado
  const porMesArray = Object.entries(porMes)
    .map(([mes, valores]) => ({
      mes: parseInt(mes),
      ...valores,
    }))
    .sort((a, b) => a.mes - b.mes);

  return { porMes: porMesArray, porCategoria };
}

// Obter detalhes de folha de pagamento por categoria e mês
export async function getFolhaPagamentoDetalhada(
  uploadId: number,
  categoria: "salario" | "comissao" | "bonus" | "prolabore",
  codFilial?: number[] | null,
  mes?: number | null,
  ano?: number | null
) {
  const db = await getDb();
  if (!db) return [];

  let whereCondition: any = eq(contasAPagar.uploadId, uploadId);

  const filialFilter = buildFilialFilter(codFilial, contasAPagar.codFilial);
  if (filialFilter) {
    whereCondition = and(whereCondition, filialFilter);
  }

  if (mes !== null && mes !== undefined) {
    whereCondition = and(whereCondition, eq(contasAPagar.mes, mes));
  }

  // Filtrar por ano usando a data de pagamento
  if (ano !== null && ano !== undefined) {
    whereCondition = and(
      whereCondition,
      sql`EXTRACT(YEAR FROM ${contasAPagar.dataPagamento}) = ${ano}`
    );
  }

  // Buscar todas as despesas
  const despesas = await db
    .select({
      id: contasAPagar.id,
      despesaAnalitico: contasAPagar.despesaAnalitico,
      descricaoDespesaAnalitica: contasAPagar.descricaoDespesaAnalitica,
      historico: contasAPagar.historico,
      valorPago: contasAPagar.valorPago,
      dataPagamento: contasAPagar.dataPagamento,
      mes: contasAPagar.mes,
      fornecedor: contasAPagar.fornecedor,
      codFilial: contasAPagar.codFilial,
    })
    .from(contasAPagar)
    .where(whereCondition);

  // Filtrar pela categoria e retornar detalhes
  return despesas
    .filter(despesa => {
      const cat = categorizarDespesaPessoal(
        despesa.despesaAnalitico,
        despesa.descricaoDespesaAnalitica,
        despesa.historico
      );
      return cat === categoria;
    })
    .map(despesa => ({
      id: despesa.id,
      categoria,
      descricao: despesa.descricaoDespesaAnalitica || despesa.historico || "Sem descrição",
      historico: despesa.historico,
      fornecedor: despesa.fornecedor,
      valorPago: Number(despesa.valorPago || 0),
      dataPagamento: despesa.dataPagamento,
      mes: despesa.mes,
      codFilial: despesa.codFilial,
      despesaAnalitico: despesa.despesaAnalitico,
    }));
}
// Funções para gerenciar importações