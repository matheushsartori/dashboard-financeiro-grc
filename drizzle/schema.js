import { pgTable, serial, varchar, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
const roleEnum = pgEnum("role", ["user", "admin"]);
const uploadStatusEnum = pgEnum("upload_status", ["processing", "completed", "failed"]);
const planoContasTipoEnum = pgEnum("plano_contas_tipo", ["receita", "despesa", "cmv", "outras"]);
const fixoVariavelEnum = pgEnum("fixo_variavel", ["FIXO", "VARI\xC1VEL"]);
const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Identificador externo do usuário (por exemplo, origem do arquivo). */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
const uploads = pgTable("uploads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: integer("file_size").notNull(),
  status: uploadStatusEnum("status").default("processing").notNull(),
  errorMessage: text("error_message"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull()
});
const planoContas = pgTable("plano_contas", {
  id: serial("id").primaryKey(),
  codigo: varchar("codigo", { length: 50 }).notNull().unique(),
  descricao: text("descricao").notNull(),
  tipo: planoContasTipoEnum("tipo").notNull()
});
const centrosCusto = pgTable("centros_custo", {
  id: serial("id").primaryKey(),
  codigo: varchar("codigo", { length: 50 }).notNull().unique(),
  descricao: text("descricao").notNull()
});
const fornecedores = pgTable("fornecedores", {
  id: serial("id").primaryKey(),
  codigo: varchar("codigo", { length: 50 }).notNull().unique(),
  nome: varchar("nome", { length: 255 }).notNull()
});
const filiais = pgTable("filiais", {
  id: serial("id").primaryKey(),
  codigo: integer("codigo").notNull().unique(),
  nome: varchar("nome", { length: 255 }).notNull()
});
const contasAPagar = pgTable("contas_a_pagar", {
  id: serial("id").primaryKey(),
  uploadId: integer("upload_id").notNull(),
  ccSintetico: varchar("cc_sintetico", { length: 50 }),
  descricaoCCSintetico: text("descricao_cc_sintetico"),
  ccAnalitico: varchar("cc_analitico", { length: 50 }),
  descricaoCCAnalitico: text("descricao_cc_analitico"),
  despesaSintetico: varchar("despesa_sintetico", { length: 50 }),
  descricaoDespesaSintetico: text("descricao_despesa_sintetico"),
  despesaAnalitico: varchar("despesa_analitico", { length: 50 }),
  descricaoDespesaAnalitica: text("descricao_despesa_analitica"),
  fixoVariavel: fixoVariavelEnum("fixo_variavel"),
  dataLancamento: timestamp("data_lancamento"),
  codConta: varchar("cod_conta", { length: 50 }),
  codFornecedor: varchar("cod_fornecedor", { length: 50 }),
  fornecedor: varchar("fornecedor", { length: 255 }),
  historico: text("historico"),
  tipoDocumento: varchar("tipo_documento", { length: 50 }),
  numNota: varchar("num_nota", { length: 100 }),
  duplicata: varchar("duplicata", { length: 100 }),
  valor: integer("valor").notNull(),
  // Armazenar em centavos
  dataVencimento: timestamp("data_vencimento"),
  valorPago: integer("valor_pago"),
  // Armazenar em centavos
  dataPagamento: timestamp("data_pagamento"),
  mes: integer("mes"),
  numBanco: varchar("num_banco", { length: 50 }),
  banco: varchar("banco", { length: 100 }),
  agencia: varchar("agencia", { length: 50 }),
  conta: varchar("conta", { length: 50 }),
  codFilial: integer("cod_filial")
  // 1=Matriz/RP, 3=Sul, 4=BH
});
const contasAReceber = pgTable("contas_a_receber", {
  id: serial("id").primaryKey(),
  uploadId: integer("upload_id").notNull(),
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
  valor: integer("valor").notNull(),
  // Armazenar em centavos
  dataVencimento: timestamp("data_vencimento"),
  valorRecebido: integer("valor_recebido"),
  // Armazenar em centavos
  dataRecebimento: timestamp("data_recebimento"),
  mes: integer("mes"),
  numBanco: varchar("num_banco", { length: 50 }),
  banco: varchar("banco", { length: 100 }),
  agencia: varchar("agencia", { length: 50 }),
  conta: varchar("conta", { length: 50 }),
  codFilial: integer("cod_filial")
  // 1=Matriz/RP, 3=Sul, 4=BH
});
const folhaPagamento = pgTable("folha_pagamento", {
  id: serial("id").primaryKey(),
  uploadId: integer("upload_id").notNull(),
  area: varchar("area", { length: 100 }),
  cc: varchar("cc", { length: 50 }),
  nome: varchar("nome", { length: 255 }).notNull(),
  tipoPagamento: varchar("tipo_pagamento", { length: 50 }),
  // SALÁRIO, PREMIAÇÃO, COMISSÃO
  tipoVinculo: varchar("tipo_vinculo", { length: 10 }),
  // CLT, PJ, INDEFINIDO
  mes1: integer("mes_1"),
  // Armazenar em centavos
  mes2: integer("mes_2"),
  mes3: integer("mes_3"),
  mes4: integer("mes_4"),
  mes5: integer("mes_5"),
  mes6: integer("mes_6"),
  mes7: integer("mes_7"),
  mes8: integer("mes_8"),
  total: integer("total")
  // Armazenar em centavos
});
const saldosBancarios = pgTable("saldos_bancarios", {
  id: serial("id").primaryKey(),
  uploadId: integer("upload_id").notNull(),
  banco: varchar("banco", { length: 100 }).notNull(),
  tipoConta: varchar("tipo_conta", { length: 50 }),
  // PF ou PJ
  saldoTotal: integer("saldo_total").notNull(),
  // Armazenar em centavos
  saldoSistema: integer("saldo_sistema"),
  // Armazenar em centavos
  desvio: integer("desvio"),
  // Armazenar em centavos
  mes: integer("mes"),
  ano: integer("ano")
});
export {
  centrosCusto,
  contasAPagar,
  contasAReceber,
  filiais,
  fixoVariavelEnum,
  folhaPagamento,
  fornecedores,
  planoContas,
  planoContasTipoEnum,
  roleEnum,
  saldosBancarios,
  uploadStatusEnum,
  uploads,
  users
};
