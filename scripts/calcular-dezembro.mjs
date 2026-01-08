import * as XLSX from "xlsx";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const planilhaPath = join(__dirname, "..", "planilha-nova.xls");

console.log("=".repeat(80));
console.log("CÁLCULO DE RECEITAS E DESPESAS - DEZEMBRO");
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

try {
  const buffer = readFileSync(planilhaPath);
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

  // Calcular despesas de dezembro
  if (workbook.SheetNames.includes("PAGO")) {
    console.log("\n📊 ABA: PAGO (Despesas)\n");
    const sheet = workbook.Sheets["PAGO"];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    let totalValor = 0;
    let totalPago = 0;
    let registros = 0;
    let registrosDezembro = 0;
    
    for (const row of data) {
      if (!row["VALOR"] && !row["VPAGO"]) continue;
      
      registros++;
      
      // Verificar se é dezembro pelo campo MÊS
      const mes = row["MÊS"] ? parseInt(String(row["MÊS"]).trim()) : null;
      
      // Também verificar por data de lançamento
      let mesPorData = null;
      if (row["DTLANC"]) {
        const data = parseExcelDate(row["DTLANC"]);
        if (data) {
          mesPorData = data.getMonth() + 1;
        }
      }
      
      const isDezembro = mes === 12 || mesPorData === 12;
      
      if (isDezembro) {
        registrosDezembro++;
        totalValor += toCents(row["VALOR"]);
        totalPago += toCents(row["VPAGO"]);
      }
    }
    
    console.log(`Total de registros na planilha: ${registros}`);
    console.log(`Registros de dezembro: ${registrosDezembro}`);
    console.log(`\n💰 Totais de Dezembro:`);
    console.log(`   Valor total (VALOR): ${formatCurrency(totalValor)}`);
    console.log(`   Valor pago (VPAGO): ${formatCurrency(totalPago)}`);
    console.log(`   Diferença: ${formatCurrency(totalValor - totalPago)}`);
  }

  // Calcular receitas de dezembro
  if (workbook.SheetNames.includes("RECEBIDO")) {
    console.log("\n" + "=".repeat(80));
    console.log("📊 ABA: RECEBIDO (Receitas)\n");
    const sheet = workbook.Sheets["RECEBIDO"];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    let totalValor = 0;
    let totalRecebido = 0;
    let registros = 0;
    let registrosDezembro = 0;
    
    for (const row of data) {
      if (!row["VALOR"] && !row["VPAGO"]) continue;
      
      registros++;
      
      // Verificar se é dezembro pelo campo MÊS
      const mes = row["MÊS"] ? parseInt(String(row["MÊS"]).trim()) : null;
      
      // Também verificar por data de recebimento
      let mesPorData = null;
      if (row["DTPAG"]) {
        const data = parseExcelDate(row["DTPAG"]);
        if (data) {
          mesPorData = data.getMonth() + 1;
        }
      }
      
      const isDezembro = mes === 12 || mesPorData === 12;
      
      if (isDezembro) {
        registrosDezembro++;
        totalValor += toCents(row["VALOR"]);
        totalRecebido += toCents(row["VPAGO"]);
      }
    }
    
    console.log(`Total de registros na planilha: ${registros}`);
    console.log(`Registros de dezembro: ${registrosDezembro}`);
    console.log(`\n💰 Totais de Dezembro:`);
    console.log(`   Valor total (VALOR): ${formatCurrency(totalValor)}`);
    console.log(`   Valor recebido (VPAGO): ${formatCurrency(totalRecebido)}`);
    console.log(`   Diferença: ${formatCurrency(totalValor - totalRecebido)}`);
  }

  // Resumo geral
  console.log("\n" + "=".repeat(80));
  console.log("📈 RESUMO GERAL - DEZEMBRO");
  console.log("=".repeat(80));
  
  // Recalcular para o resumo
  let despesaTotal = 0;
  let despesaPaga = 0;
  let receitaTotal = 0;
  let receitaRecebida = 0;
  
  if (workbook.SheetNames.includes("PAGO")) {
    const sheet = workbook.Sheets["PAGO"];
    const data = XLSX.utils.sheet_to_json(sheet);
    for (const row of data) {
      const mes = row["MÊS"] ? parseInt(String(row["MÊS"]).trim()) : null;
      let mesPorData = null;
      if (row["DTLANC"]) {
        const data = parseExcelDate(row["DTLANC"]);
        if (data) mesPorData = data.getMonth() + 1;
      }
      if (mes === 12 || mesPorData === 12) {
        despesaTotal += toCents(row["VALOR"]);
        despesaPaga += toCents(row["VPAGO"]);
      }
    }
  }
  
  if (workbook.SheetNames.includes("RECEBIDO")) {
    const sheet = workbook.Sheets["RECEBIDO"];
    const data = XLSX.utils.sheet_to_json(sheet);
    for (const row of data) {
      const mes = row["MÊS"] ? parseInt(String(row["MÊS"]).trim()) : null;
      let mesPorData = null;
      if (row["DTPAG"]) {
        const data = parseExcelDate(row["DTPAG"]);
        if (data) mesPorData = data.getMonth() + 1;
      }
      if (mes === 12 || mesPorData === 12) {
        receitaTotal += toCents(row["VALOR"]);
        receitaRecebida += toCents(row["VPAGO"]);
      }
    }
  }
  
  const resultado = receitaRecebida - despesaPaga;
  const margem = receitaRecebida > 0 ? ((resultado / receitaRecebida) * 100).toFixed(2) : 0;
  
  console.log(`\n💰 Receitas:`);
  console.log(`   Total: ${formatCurrency(receitaTotal)}`);
  console.log(`   Recebido: ${formatCurrency(receitaRecebida)}`);
  console.log(`\n💰 Despesas:`);
  console.log(`   Total: ${formatCurrency(despesaTotal)}`);
  console.log(`   Pago: ${formatCurrency(despesaPaga)}`);
  console.log(`\n📊 Resultado:`);
  console.log(`   Receitas Recebidas - Despesas Pagas = ${formatCurrency(resultado)}`);
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
      const year = parseInt(parts[2]) > 50 ? 1900 + parseInt(parts[2]) : 2000 + parseInt(parts[2]);
      return new Date(year, month, day);
    }
  }
  return null;
}

