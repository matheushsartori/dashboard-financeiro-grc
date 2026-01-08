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
  
  // Se já é número, converter diretamente
  if (typeof value === "number") {
    return Math.round(value * 100);
  }
  
  // Se é string, limpar e converter
  if (typeof value === "string") {
    // Remover "R$", espaços e outros caracteres não numéricos
    // Manter apenas dígitos, pontos, vírgulas e hífen (para negativos)
    let cleaned = value.replace(/[^\d.,-]/g, "");
    
    // Se tem vírgula e ponto, assumir que vírgula é separador decimal (formato brasileiro)
    if (cleaned.includes(",") && cleaned.includes(".")) {
      // Formato: 1.234,56 -> remover ponto de milhar, vírgula vira ponto
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else if (cleaned.includes(",")) {
      // Apenas vírgula -> separador decimal
      cleaned = cleaned.replace(",", ".");
    }
    // Se só tem ponto, assumir que é separador decimal
    
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.round(num * 100);
  }
  
  // Para outros tipos, tentar converter para número
  const num = Number(value);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

// Função para identificar tipo de vínculo (CLT/PJ) baseado no tipoPagamento e área
function identificarTipoVinculo(tipoPagamento: string | null | undefined, area: string | null | undefined): "CLT" | "PJ" | "INDEFINIDO" {
  if (!tipoPagamento) return "INDEFINIDO";
  
  const tipoUpper = tipoPagamento.toUpperCase().trim();
  const areaUpper = area ? area.toUpperCase().trim() : "";
  
  // Identificadores explícitos de PJ
  if (
    tipoUpper.includes("PJ") ||
    tipoUpper.includes("NOTA FISCAL") ||
    tipoUpper.includes("NF") ||
    tipoUpper.includes("PRESTAÇÃO") ||
    tipoUpper.includes("SERVIÇO") ||
    tipoUpper.includes("CONSULTORIA") ||
    tipoUpper.includes("TERCEIRIZADO") ||
    tipoUpper.includes("PESSOA JURIDICA") ||
    tipoUpper.includes("PESSOA JURÍDICA") ||
    areaUpper.includes("PJ") ||
    areaUpper.includes("TERCEIRIZADO")
  ) {
    return "PJ";
  }
  
  // Identificadores explícitos de CLT/PF
  if (
    tipoUpper.includes("SALÁRIO") ||
    tipoUpper.includes("SALARIO") ||
    tipoUpper.includes("13º") ||
    tipoUpper.includes("FÉRIAS") ||
    tipoUpper.includes("FERIAS") ||
    tipoUpper.includes("ADICIONAL") ||
    tipoUpper.includes("BONUS") ||
    tipoUpper.includes("BÔNUS") ||
    tipoUpper.includes("PREMIAÇÃO") ||
    tipoUpper.includes("COMISSÃO") ||
    tipoUpper.includes("COMISSAO") ||
    tipoUpper.includes("RETIRADA") ||
    areaUpper.includes("CLT") ||
    areaUpper.includes("PF")
  ) {
    return "CLT";
  }
  
  return "INDEFINIDO";
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

// Função para categorizar tipo de despesa de pessoal baseado no código analítico e histórico
// Baseado na documentação: Salários (600017, 200001, 600026), Comissões (200030, 200031), 
// Bônus/Gratificações (600020), Pro-labore (900002)
export function categorizarDespesaPessoal(
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

  // Parse PAGO (nova estrutura - antes era "GERAL A PAGAR")
  // Suporta ambos os nomes para compatibilidade
  const sheetNamePago = workbook.SheetNames.includes("PAGO") ? "PAGO" : "GERAL A PAGAR";
  if (workbook.SheetNames.includes(sheetNamePago)) {
    const sheet = workbook.Sheets[sheetNamePago];
    const data = XLSX.utils.sheet_to_json(sheet) as any[];

    for (const row of data) {
      const dataLancamento = parseExcelDate(row["DTLANC"]);
      const dataVencimento = parseExcelDate(row["DTVENC"]);
      const dataPagamento = parseExcelDate(row["DTPAGTO"]);

      // Normalizar FIXO OU VARIAVÉL (pode ter variações como "VARIAVEL" sem acento)
      let fixoVariavel: "FIXO" | "VARIÁVEL" | null = null;
      const fixoVariavelValue = row["FIXO OU VARIAVÉL"];
      if (fixoVariavelValue) {
        const normalized = String(fixoVariavelValue).toUpperCase().trim();
        if (normalized === "FIXO") fixoVariavel = "FIXO";
        else if (normalized === "VARIÁVEL" || normalized === "VARIAVEL") fixoVariavel = "VARIÁVEL";
      }

      result.contasAPagar.push({
        uploadId,
        ccSintetico: row["CC Síntético"] ? String(row["CC Síntético"]) : null,
        descricaoCCSintetico: row["Descrição CC SIntético"] || null,
        ccAnalitico: null, // Não existe na nova estrutura
        descricaoCCAnalitico: null, // Não existe na nova estrutura
        despesaSintetico: row["Despesa Sintético"] ? String(row["Despesa Sintético"]) : null,
        descricaoDespesaSintetico: row["Descrição Despesa Sintético"] || null,
        despesaAnalitico: row["Despesa Analítico"] ? String(row["Despesa Analítico"]) : null,
        descricaoDespesaAnalitica: row["Descrição Despesa Analítica"] || null,
        fixoVariavel,
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
        mes: row["MÊS"] ? Number(row["MÊS"]) : (dataPagamento ? getMonth(dataPagamento) : (dataLancamento ? getMonth(dataLancamento) : null)),
        numBanco: row["NUMBANCO"] ? String(row["NUMBANCO"]) : null,
        banco: row["BANCO"] || row["BANCO "] || null, // Pode ter espaço no final
        agencia: row["AGENCIA"] ? String(row["AGENCIA"]) : null,
        conta: row["C/C"] ? String(row["C/C"]) : null,
        codFilial: row["CODFILIAL"] ? Number(row["CODFILIAL"]) : null,
      });
    }
  }

  // Parse RECEBIDO (nova estrutura - antes era "GERAL A RECEBER")
  // Suporta ambos os nomes para compatibilidade
  const sheetNameRecebido = workbook.SheetNames.includes("RECEBIDO") ? "RECEBIDO" : "GERAL A RECEBER";
  if (workbook.SheetNames.includes(sheetNameRecebido)) {
    const sheet = workbook.Sheets[sheetNameRecebido];
    const data = XLSX.utils.sheet_to_json(sheet) as any[];

    for (const row of data) {
      const dataLancamento = parseExcelDate(row["DTEMISSAO"]);
      const dataVencimento = parseExcelDate(row["DTVENC"]);
      const dataRecebimento = parseExcelDate(row["DTPAG"]);

      result.contasAReceber.push({
        uploadId,
        ccSintetico: null, // Não existe na nova estrutura de RECEBIDO
        descricaoCCSintetico: null, // Não existe na nova estrutura de RECEBIDO
        ccAnalitico: null, // Não existe na nova estrutura de RECEBIDO
        descricaoCCAnalitico: null, // Não existe na nova estrutura de RECEBIDO
        receitaSintetico: null, // Não existe na nova estrutura de RECEBIDO
        descricaoReceitaSintetico: null, // Não existe na nova estrutura de RECEBIDO
        receitaAnalitico: null, // Não existe na nova estrutura de RECEBIDO
        descricaoReceitaAnalitica: null, // Não existe na nova estrutura de RECEBIDO
        dataLancamento,
        cliente: row["NOME"] || null,
        historico: row["HISTÓRICO"] || row["HISTORICO"] || null, // Pode ter acento ou não
        tipoDocumento: null, // Não existe na nova estrutura de RECEBIDO
        numNota: null, // Não existe na nova estrutura de RECEBIDO
        valor: toCents(row["VALOR"]),
        dataVencimento,
        valorRecebido: toCents(row["VPAGO"]),
        dataRecebimento,
        mes: row["MÊS"] ? Number(row["MÊS"]) : (dataRecebimento ? getMonth(dataRecebimento) : (dataLancamento ? getMonth(dataLancamento) : null)),
        numBanco: row["NUM BANCO"] ? String(row["NUM BANCO"]) : null, // Note: "NUM BANCO" com espaço
        banco: null, // Não existe na nova estrutura de RECEBIDO
        agencia: null, // Não existe na nova estrutura de RECEBIDO
        conta: null, // Não existe na nova estrutura de RECEBIDO
        codFilial: row["CODFILIAL"] ? Number(row["CODFILIAL"]) : null,
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

      const area = row["ÁREA"] || null;
      const tipoPagamento = row["__EMPTY"] || row["Unnamed: 3"] || null; // Tentar ambas as colunas possíveis
      const tipoVinculo = identificarTipoVinculo(tipoPagamento, area);

      result.folhaPagamento.push({
        uploadId,
        area,
        cc: row["CC"] || null,
        nome: row["NOME"],
        tipoPagamento,
        tipoVinculo,
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
