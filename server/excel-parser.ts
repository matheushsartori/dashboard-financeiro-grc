import * as XLSX from "xlsx";
import {
  InsertContaAPagar,
  InsertContaAReceber,
  InsertFolhaPagamento,
  InsertPlanoContas,
  InsertCentroCusto,
  InsertFornecedor,
} from "../drizzle/schema";

// Função auxiliar para converter valores monetários para centavos
function toCents(value: any): number {
  if (value === null || value === undefined || value === "") return 0;
  const num = typeof value === "string" ? parseFloat(value.replace(/[^\d.-]/g, "")) : Number(value);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

// Função auxiliar para converter datas do Excel
function parseExcelDate(value: any): Date | null {
  if (!value) return null;
  
  // Se já é uma data
  if (value instanceof Date) return value;
  
  // Se é um número (data do Excel)
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    return new Date(date.y, date.m - 1, date.d);
  }
  
  // Se é uma string, tentar parsear
  if (typeof value === "string") {
    // Formato DD/MM/YYYY
    const parts = value.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      return new Date(year, month, day);
    }
  }
  
  return null;
}

// Função auxiliar para extrair mês de uma data
function getMonth(date: Date | null): number | null {
  if (!date) return null;
  return date.getMonth() + 1; // 1-12
}

export interface ParsedExcelData {
  planoContas: InsertPlanoContas[];
  centrosCusto: InsertCentroCusto[];
  fornecedores: InsertFornecedor[];
  contasAPagar: InsertContaAPagar[];
  contasAReceber: InsertContaAReceber[];
  folhaPagamento: InsertFolhaPagamento[];
  saldosBancarios: any[];
}

export function parseExcelFile(buffer: Buffer, uploadId: number): ParsedExcelData {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

  const result: ParsedExcelData = {
    planoContas: [],
    centrosCusto: [],
    fornecedores: [],
    contasAPagar: [],
    contasAReceber: [],
    folhaPagamento: [],
    saldosBancarios: [],
  };

  // Parse PG - GRC (Plano de Contas)
  if (workbook.SheetNames.includes("PG - GRC")) {
    const sheet = workbook.Sheets["PG - GRC"];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0] || !row[1]) continue;

      const codigo = String(row[0]).trim();
      const descricao = String(row[1]).trim();

      // Determinar tipo baseado no código
      let tipo: "receita" | "despesa" | "cmv" | "outras" = "outras";
      if (codigo.startsWith("100")) tipo = "cmv";
      else if (codigo.startsWith("101") || codigo.startsWith("200")) tipo = "receita";
      else if (codigo.startsWith("500") || codigo.startsWith("600") || codigo.startsWith("700") || codigo.startsWith("800")) tipo = "despesa";

      result.planoContas.push({ codigo, descricao, tipo });
    }
  }

  // Parse CC - GRC (Centros de Custo)
  if (workbook.SheetNames.includes("CC - GRC")) {
    const sheet = workbook.Sheets["CC - GRC"];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0] || !row[1]) continue;

      result.centrosCusto.push({
        codigo: String(row[0]).trim(),
        descricao: String(row[1]).trim(),
      });
    }
  }

  // Parse Fornecedores
  if (workbook.SheetNames.includes("Fornecedores")) {
    const sheet = workbook.Sheets["Fornecedores"];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0] || !row[1]) continue;

      result.fornecedores.push({
        codigo: String(row[0]).trim(),
        nome: String(row[1]).trim(),
      });
    }
  }

  // Parse GERAL A PAGAR
  if (workbook.SheetNames.includes("GERAL A PAGAR")) {
    const sheet = workbook.Sheets["GERAL A PAGAR"];
    const data = XLSX.utils.sheet_to_json(sheet) as any[];

    for (const row of data) {
      const dataLancamento = parseExcelDate(row["DTLANC"]);
      const dataVencimento = parseExcelDate(row["DTVENC"]);
      const dataPagamento = parseExcelDate(row["DTPAGTO"]);

      result.contasAPagar.push({
        uploadId,
        ccSintetico: row["CC Síntético"] ? String(row["CC Síntético"]) : null,
        descricaoCCSintetico: row["Descrição CC SIntético"] || null,
        ccAnalitico: row["CC Analítico"] ? String(row["CC Analítico"]) : null,
        descricaoCCAnalitico: row["Descrição CC Analítico"] || null,
        despesaSintetico: row["Despesa Sintético"] ? String(row["Despesa Sintético"]) : null,
        descricaoDespesaSintetico: row["Descrição Despesa Sintético"] || null,
        despesaAnalitico: row["Despesa Analítico"] ? String(row["Despesa Analítico"]) : null,
        descricaoDespesaAnalitica: row["Descrição Despesa Analítica"] || null,
        fixoVariavel: row["FIXO OU VARIAVÉL"] === "FIXO" ? "FIXO" : row["FIXO OU VARIAVÉL"] === "VARIÁVEL" ? "VARIÁVEL" : null,
        dataLancamento,
        codConta: row["CODCONTA"] ? String(row["CODCONTA"]) : null,
        codFornecedor: row["CODFORNEC"] ? String(row["CODFORNEC"]) : null,
        fornecedor: row["Fornecedor"] || null,
        historico: row["HISTORICO"] || null,
        tipoDocumento: row["TIPO DE DOCUMENTO"] || null,
        numNota: row["NUMNOTA"] ? String(row["NUMNOTA"]) : null,
        duplicata: row["DUPLIC"] ? String(row["DUPLIC"]) : null,
        valor: toCents(row["VALOR"]),
        dataVencimento,
        valorPago: toCents(row["VPAGO"]),
        dataPagamento,
        mes: row["MÊS"] ? Number(row["MÊS"]) : getMonth(dataLancamento),
        numBanco: row["NUMBANCO"] ? String(row["NUMBANCO"]) : null,
        banco: row["BANCO "] || null,
        agencia: row["AGENCIA"] ? String(row["AGENCIA"]) : null,
        conta: row["C/C"] ? String(row["C/C"]) : null,
      });
    }
  }

  // Parse GERAL A RECEBER
  if (workbook.SheetNames.includes("GERAL A RECEBER")) {
    const sheet = workbook.Sheets["GERAL A RECEBER"];
    const data = XLSX.utils.sheet_to_json(sheet) as any[];

    for (const row of data) {
      const dataLancamento = parseExcelDate(row["DTEMISSAO"]);
      const dataVencimento = parseExcelDate(row["DTVENC"]);
      const dataRecebimento = parseExcelDate(row["DTPAG"]);

      result.contasAReceber.push({
        uploadId,
        ccSintetico: row["CC Síntético"] ? String(row["CC Síntético"]) : null,
        descricaoCCSintetico: row["Descrição CC SIntético"] || null,
        ccAnalitico: row["CC Analítico"] ? String(row["CC Analítico"]) : null,
        descricaoCCAnalitico: row["Descrição CC Analítico"] || null,
        receitaSintetico: row["Receita Sintético"] ? String(row["Receita Sintético"]) : null,
        descricaoReceitaSintetico: row["Descrição Receita Sintético"] || null,
        receitaAnalitico: row["Receita Analítico"] ? String(row["Receita Analítico"]) : null,
        descricaoReceitaAnalitica: row["Descrição Receita Analítica"] || null,
        dataLancamento,
        cliente: row["NOME"] || null,
        historico: row["HISTORICO"] || null,
        tipoDocumento: row["TIPO DE DOCUMENTO"] || null,
        numNota: row["NUMNOTA"] ? String(row["NUMNOTA"]) : null,
        valor: toCents(row["VALOR"]),
        dataVencimento,
        valorRecebido: toCents(row["VPAGO"]),
        dataRecebimento,
        mes: row["MÊS"] ? Number(row["MÊS"]) : getMonth(dataLancamento),
        numBanco: row["NUMBANCO"] ? String(row["NUMBANCO"]) : null,
        banco: row["BANCO "] || null,
        agencia: row["AGENCIA"] ? String(row["AGENCIA"]) : null,
        conta: row["C/C"] ? String(row["C/C"]) : null,
      });
    }
  }

  // Parse CONSULTA FOLHA
  if (workbook.SheetNames.includes("CONSULTA FOLHA")) {
    const sheet = workbook.Sheets["CONSULTA FOLHA"];
    const data = XLSX.utils.sheet_to_json(sheet) as any[];

    for (const row of data) {
      // Ignorar linhas de total
      if (!row["NOME"] || String(row["NOME"]).includes("TOTAL")) continue;

      result.folhaPagamento.push({
        uploadId,
        area: row["ÁREA"] || null,
        cc: row["CC"] || null,
        nome: row["NOME"],
        tipoPagamento: row["Unnamed: 3"] || null, // Coluna sem nome que contém tipo (SALÁRIO, PREMIAÇÃO, etc)
        mes1: toCents(row["1"]),
        mes2: toCents(row["2"]),
        mes3: toCents(row["3"]),
        mes4: toCents(row["4"]),
        mes5: toCents(row["5"]),
        mes6: toCents(row["6"]),
        mes7: toCents(row["7"]),
        mes8: toCents(row["8"]),
        total: toCents(row["TOTAL"]),
      });
    }
  }

  // Parse DINÂMICA BANCOS
  if (workbook.SheetNames.includes("DINÂMICA BANCOS")) {
    const sheet = workbook.Sheets["DINÂMICA BANCOS"];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    // Procurar pela seção de bancos (começa em "EXTRATO BANCÁRIO")
    let startRow = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === "EXTRATO BANCÁRIO") {
        startRow = i + 1;
        break;
      }
    }

    if (startRow !== -1) {
      for (let i = startRow; i < data.length; i++) {
        const row = data[i];
        if (!row[0] || row[0] === "Total BANCOS" || row[0] === "Total Sistema") break;

        result.saldosBancarios.push({
          uploadId,
          banco: String(row[0]).trim(),
          tipoConta: null, // Pode ser extraído do nome do banco se necessário
          saldoTotal: toCents(row[1]),
          saldoSistema: toCents(row[2]),
          desvio: toCents(row[3]),
          mes: null,
          ano: null,
        });
      }
    }
  }

  return result;
}
