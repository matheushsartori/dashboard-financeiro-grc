import * as XLSX from "xlsx";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const planilhaPath = join(__dirname, "..", "planilha-nova.xls");

function toCents(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Math.round(value * 100);
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
  return Math.round(Number(value) * 100) || 0;
}

function formatCurrency(cents) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
}

console.log("=".repeat(80));
console.log("DEBUG: VERIFICAÇÃO DE RECEITAS EM DEZEMBRO");
console.log("=".repeat(80));

try {
  const buffer = readFileSync(planilhaPath);
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

  if (workbook.SheetNames.includes("RECEBIDO")) {
    console.log("\n📊 ABA: RECEBIDO\n");
    const sheet = workbook.Sheets["RECEBIDO"];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    let totalValor = 0;
    let totalRecebido = 0;
    let registrosDezembro = 0;
    let registrosComValorRecebido = 0;
    
    const exemplos = [];
    
    for (const row of data) {
      if (!row["VALOR"] && !row["VPAGO"]) continue;
      
      // Verificar se é dezembro
      const mes = row["MÊS"] ? parseInt(String(row["MÊS"]).trim()) : null;
      
      let mesPorData = null;
      if (row["DTPAG"]) {
        const dataStr = String(row["DTPAG"]);
        const parts = dataStr.split("/");
        if (parts.length === 3) {
          mesPorData = parseInt(parts[1]);
        }
      }
      
      const isDezembro = mes === 12 || mesPorData === 12;
      
      if (isDezembro) {
        registrosDezembro++;
        const valor = toCents(row["VALOR"]);
        const recebido = toCents(row["VPAGO"]);
        
        totalValor += valor;
        totalRecebido += recebido;
        
        if (recebido > 0) {
          registrosComValorRecebido++;
        }
        
        if (exemplos.length < 5) {
          exemplos.push({
            cliente: row["NOME"],
            valor: row["VALOR"],
            valorRecebido: row["VPAGO"],
            valorCentavos: valor,
            recebidoCentavos: recebido,
            mes: mes || mesPorData,
            dataPag: row["DTPAG"],
          });
        }
      }
    }
    
    console.log(`Total de registros em dezembro: ${registrosDezembro}`);
    console.log(`Registros com valor recebido > 0: ${registrosComValorRecebido}`);
    console.log(`\n💰 Totais:`);
    console.log(`   Valor total (VALOR): ${formatCurrency(totalValor)}`);
    console.log(`   Valor recebido (VPAGO): ${formatCurrency(totalRecebido)}`);
    console.log(`\n📋 Primeiros 5 exemplos:`);
    exemplos.forEach((ex, i) => {
      console.log(`\n  ${i + 1}. ${ex.cliente}`);
      console.log(`     VALOR: ${ex.valor} -> ${formatCurrency(ex.valorCentavos)}`);
      console.log(`     VPAGO: ${ex.valorRecebido} -> ${formatCurrency(ex.recebidoCentavos)}`);
      console.log(`     Mês: ${ex.mes}, Data: ${ex.dataPag}`);
    });
  }

  console.log("\n" + "=".repeat(80));

} catch (error) {
  console.error("\n❌ Erro:", error.message);
  process.exit(1);
}

