import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Tabela de uploads (histórico de importações)
export const uploads = mysqlTable("uploads", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: int("file_size").notNull(),
  status: mysqlEnum("status", ["processing", "completed", "failed"]).default("processing").notNull(),
  errorMessage: text("error_message"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export type Upload = typeof uploads.$inferSelect;
export type InsertUpload = typeof uploads.$inferInsert;

// Tabela de plano de contas
export const planoContas = mysqlTable("plano_contas", {
  id: int("id").autoincrement().primaryKey(),
  codigo: varchar("codigo", { length: 50 }).notNull().unique(),
  descricao: text("descricao").notNull(),
  tipo: mysqlEnum("tipo", ["receita", "despesa", "cmv", "outras"]).notNull(),
});

export type PlanoContas = typeof planoContas.$inferSelect;
export type InsertPlanoContas = typeof planoContas.$inferInsert;

// Tabela de centros de custo
export const centrosCusto = mysqlTable("centros_custo", {
  id: int("id").autoincrement().primaryKey(),
  codigo: varchar("codigo", { length: 50 }).notNull().unique(),
  descricao: text("descricao").notNull(),
});

export type CentroCusto = typeof centrosCusto.$inferSelect;
export type InsertCentroCusto = typeof centrosCusto.$inferInsert;

// Tabela de fornecedores
export const fornecedores = mysqlTable("fornecedores", {
  id: int("id").autoincrement().primaryKey(),
  codigo: varchar("codigo", { length: 50 }).notNull().unique(),
  nome: varchar("nome", { length: 255 }).notNull(),
});

export type Fornecedor = typeof fornecedores.$inferSelect;
export type InsertFornecedor = typeof fornecedores.$inferInsert;

// Tabela de contas a pagar
export const contasAPagar = mysqlTable("contas_a_pagar", {
  id: int("id").autoincrement().primaryKey(),
  uploadId: int("upload_id").notNull(),
  ccSintetico: varchar("cc_sintetico", { length: 50 }),
  descricaoCCSintetico: text("descricao_cc_sintetico"),
  ccAnalitico: varchar("cc_analitico", { length: 50 }),
  descricaoCCAnalitico: text("descricao_cc_analitico"),
  despesaSintetico: varchar("despesa_sintetico", { length: 50 }),
  descricaoDespesaSintetico: text("descricao_despesa_sintetico"),
  despesaAnalitico: varchar("despesa_analitico", { length: 50 }),
  descricaoDespesaAnalitica: text("descricao_despesa_analitica"),
  fixoVariavel: mysqlEnum("fixo_variavel", ["FIXO", "VARIÁVEL"]),
  dataLancamento: timestamp("data_lancamento"),
  codConta: varchar("cod_conta", { length: 50 }),
  codFornecedor: varchar("cod_fornecedor", { length: 50 }),
  fornecedor: varchar("fornecedor", { length: 255 }),
  historico: text("historico"),
  tipoDocumento: varchar("tipo_documento", { length: 50 }),
  numNota: varchar("num_nota", { length: 100 }),
  duplicata: varchar("duplicata", { length: 100 }),
  valor: int("valor").notNull(), // Armazenar em centavos
  dataVencimento: timestamp("data_vencimento"),
  valorPago: int("valor_pago"), // Armazenar em centavos
  dataPagamento: timestamp("data_pagamento"),
  mes: int("mes"),
  numBanco: varchar("num_banco", { length: 50 }),
  banco: varchar("banco", { length: 100 }),
  agencia: varchar("agencia", { length: 50 }),
  conta: varchar("conta", { length: 50 }),
});

export type ContaAPagar = typeof contasAPagar.$inferSelect;
export type InsertContaAPagar = typeof contasAPagar.$inferInsert;

// Tabela de contas a receber
export const contasAReceber = mysqlTable("contas_a_receber", {
  id: int("id").autoincrement().primaryKey(),
  uploadId: int("upload_id").notNull(),
  ccSintetico: varchar("cc_sintetico", { length: 50 }),
  descricaoCCSintetico: text("descricao_cc_sintetico"),
  ccAnalitico: varchar("cc_analitico", { length: 50 }),
  descricaoCCAnalitico: text("descricao_cc_analitico"),
  receitaSintetico: varchar("receita_sintetico", { length: 50 }),
  descricaoReceitaSintetico: text("descricao_receita_sintetico"),
  receitaAnalitico: varchar("receita_analitico", { length: 50 }),
  descricaoReceitaAnalitica: text("descricao_receita_analitica"),
  dataLancamento: timestamp("data_lancamento"),
  cliente: varchar("cliente", { length: 255 }),
  historico: text("historico"),
  tipoDocumento: varchar("tipo_documento", { length: 50 }),
  numNota: varchar("num_nota", { length: 100 }),
  valor: int("valor").notNull(), // Armazenar em centavos
  dataVencimento: timestamp("data_vencimento"),
  valorRecebido: int("valor_recebido"), // Armazenar em centavos
  dataRecebimento: timestamp("data_recebimento"),
  mes: int("mes"),
  numBanco: varchar("num_banco", { length: 50 }),
  banco: varchar("banco", { length: 100 }),
  agencia: varchar("agencia", { length: 50 }),
  conta: varchar("conta", { length: 50 }),
});

export type ContaAReceber = typeof contasAReceber.$inferSelect;
export type InsertContaAReceber = typeof contasAReceber.$inferInsert;

// Tabela de folha de pagamento
export const folhaPagamento = mysqlTable("folha_pagamento", {
  id: int("id").autoincrement().primaryKey(),
  uploadId: int("upload_id").notNull(),
  area: varchar("area", { length: 100 }),
  cc: varchar("cc", { length: 50 }),
  nome: varchar("nome", { length: 255 }).notNull(),
  tipoPagamento: varchar("tipo_pagamento", { length: 50 }), // SALÁRIO, PREMIAÇÃO, COMISSÃO
  mes1: int("mes_1"), // Armazenar em centavos
  mes2: int("mes_2"),
  mes3: int("mes_3"),
  mes4: int("mes_4"),
  mes5: int("mes_5"),
  mes6: int("mes_6"),
  mes7: int("mes_7"),
  mes8: int("mes_8"),
  total: int("total"), // Armazenar em centavos
});

export type FolhaPagamento = typeof folhaPagamento.$inferSelect;
export type InsertFolhaPagamento = typeof folhaPagamento.$inferInsert;

// Tabela de saldos bancários
export const saldosBancarios = mysqlTable("saldos_bancarios", {
  id: int("id").autoincrement().primaryKey(),
  uploadId: int("upload_id").notNull(),
  banco: varchar("banco", { length: 100 }).notNull(),
  tipoConta: varchar("tipo_conta", { length: 50 }), // PF ou PJ
  saldoTotal: int("saldo_total").notNull(), // Armazenar em centavos
  saldoSistema: int("saldo_sistema"), // Armazenar em centavos
  desvio: int("desvio"), // Armazenar em centavos
  mes: int("mes"),
  ano: int("ano"),
});