import * as XLSX from "xlsx";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const planilhaPath = join(__dirname, "..", "planilha-nova.xls");

console.log("=".repeat(80));
console.log("CÁLCULO DE RECEITAS E DESPESAS - DEZEMBRO (POR DATA)");
console.log("=".repeat(80));

function toCents(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") {
    return Math.round(value * 100);
  }
  if (typeof value === "string") {
    let cleaned = value.replace(/[^\d.,-]/g, "");
    if (cleaned.includes(",") && cleaned.includes(".")) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else if (cleaned.includes(",")) {
      cleaned = cleaned.replace(",", ".");
    }
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.round(num * 100);
  }
  const num = Number(value);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

function formatCurrency(cents) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
}

function parseExcelDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    return new Date(date.y, date.m - 1, date.d);
  }
  if (typeof value === "string") {
    const parts = value.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      let year = parseInt(parts[2]);
      if (year < 100) {
        year = year > 50 ? 1900 + year : 2000 + year;
      }
      return new Date(year, month, day);
    }
  }
  return null;
}

try {
  const buffer = readFileSync(planilhaPath);
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

  // Calcular despesas de dezembro (por data de lançamento e pagamento)
  if (workbook.SheetNames.includes("PAGO")) {
    console.log("\n📊 ABA: PAGO (Despesas)\n");
    const sheet = workbook.Sheets["PAGO"];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    let totalValor = 0;
    let totalPago = 0;
    let registrosDezembroLanc = 0;
    let registrosDezembroPagto = 0;
    
    for (const row of data) {
      if (!row["VALOR"] && !row["VPAGO"]) continue;
      
      let isDezembroLanc = false;
      let isDezembroPagto = false;
      
      // Verificar por data de lançamento
      if (row["DTLANC"]) {
        const dataLanc = parseExcelDate(row["DTLANC"]);
        if (dataLanc && dataLanc.getMonth() === 11) { // Dezembro é mês 11 (0-indexed)
          isDezembroLanc = true;
          registrosDezembroLanc++;
          totalValor += toCents(row["VALOR"]);
        }
      }
      
      // Verificar por data de pagamento
      if (row["DTPAGTO"]) {
        const dataPagto = parseExcelDate(row["DTPAGTO"]);
        if (dataPagto && dataPagto.getMonth() === 11) { // Dezembro é mês 11
          isDezembroPagto = true;
          if (!isDezembroLanc) registrosDezembroPagto++;
          totalPago += toCents(row["VPAGO"]);
        }
      }
    }
    
    console.log(`Registros com lançamento em dezembro: ${registrosDezembroLanc}`);
    console.log(`Registros com pagamento em dezembro: ${registrosDezembroPagto + registrosDezembroLanc}`);
    console.log(`\n💰 Totais de Dezembro:`);
    console.log(`   Valor total (lançado em dez): ${formatCurrency(totalValor)}`);
    console.log(`   Valor pago (pago em dez): ${formatCurrency(totalPago)}`);
  }

  // Calcular receitas de dezembro (por data de recebimento)
  if (workbook.SheetNames.includes("RECEBIDO")) {
    console.log("\n" + "=".repeat(80));
    console.log("📊 ABA: RECEBIDO (Receitas)\n");
    const sheet = workbook.Sheets["RECEBIDO"];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    let totalValor = 0;
    let totalRecebido = 0;
    let registrosDezembroReceb = 0;
    
    for (const row of data) {
      if (!row["VALOR"] && !row["VPAGO"]) continue;
      
      // Verificar por data de recebimento
      if (row["DTPAG"]) {
        const dataReceb = parseExcelDate(row["DTPAG"]);
        if (dataReceb && dataReceb.getMonth() === 11) { // Dezembro é mês 11
          registrosDezembroReceb++;
          totalValor += toCents(row["VALOR"]);
          totalRecebido += toCents(row["VPAGO"]);
        }
      }
    }
    
    console.log(`Registros recebidos em dezembro: ${registrosDezembroReceb}`);
    console.log(`\n💰 Totais de Dezembro:`);
    console.log(`   Valor total (recebido em dez): ${formatCurrency(totalValor)}`);
    console.log(`   Valor recebido (VPAGO em dez): ${formatCurrency(totalRecebido)}`);
  }

  // Recalcular para resumo usando data de pagamento/recebimento
  let despesaPaga = 0;
  let receitaRecebida = 0;
  
  if (workbook.SheetNames.includes("PAGO")) {
    const sheet = workbook.Sheets["PAGO"];
    const data = XLSX.utils.sheet_to_json(sheet);
    for (const row of data) {
      if (row["DTPAGTO"]) {
        const dataPagto = parseExcelDate(row["DTPAGTO"]);
        if (dataPagto && dataPagto.getMonth() === 11) {
          despesaPaga += toCents(row["VPAGO"]);
        }
      }
    }
  }
  
  if (workbook.SheetNames.includes("RECEBIDO")) {
    const sheet = workbook.Sheets["RECEBIDO"];
    const data = XLSX.utils.sheet_to_json(sheet);
    for (const row of data) {
      if (row["DTPAG"]) {
        const dataReceb = parseExcelDate(row["DTPAG"]);
        if (dataReceb && dataReceb.getMonth() === 11) {
          receitaRecebida += toCents(row["VPAGO"]);
        }
      }
    }
  }
  
  const resultado = receitaRecebida - despesaPaga;
  const margem = receitaRecebida > 0 ? ((resultado / receitaRecebida) * 100).toFixed(2) : 0;
  
  console.log("\n" + "=".repeat(80));
  console.log("📈 RESUMO GERAL - DEZEMBRO (Por Data de Pagamento/Recebimento)");
  console.log("=".repeat(80));
  console.log(`\n💰 Receitas Recebidas em Dezembro: ${formatCurrency(receitaRecebida)}`);
  console.log(`💰 Despesas Pagas em Dezembro: ${formatCurrency(despesaPaga)}`);
  console.log(`\n📊 Resultado:`);
  console.log(`   Receitas - Despesas = ${formatCurrency(resultado)}`);
  console.log(`   Margem: ${margem}%`);
  
  if (resultado > 0) {
    console.log(`\n   ✅ Saldo positivo em dezembro!`);
  } else {
    console.log(`\n   ⚠️  Saldo negativo em dezembro.`);
  }

  console.log("\n" + "=".repeat(80));

} catch (error) {
  console.error("\n❌ Erro:", error.message);
  process.exit(1);
}

