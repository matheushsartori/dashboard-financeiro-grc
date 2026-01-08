import * as XLSX from "xlsx";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const planilhaPath = join(__dirname, "..", "planilha-nova.xls");

console.log("=".repeat(80));
console.log("VERIFICAÇÃO DE MESES COM DADOS");
console.log("=".repeat(80));

try {
  const buffer = readFileSync(planilhaPath);
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
                 "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  // Verificar PAGO
  if (workbook.SheetNames.includes("PAGO")) {
    console.log("\n📊 ABA: PAGO (Despesas)\n");
    const sheet = workbook.Sheets["PAGO"];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    const mesesEncontrados = new Set();
    const mesesPorData = new Set();
    
    for (const row of data) {
      if (row["MÊS"]) {
        const mes = parseInt(String(row["MÊS"]).trim());
        if (mes >= 1 && mes <= 12) {
          mesesEncontrados.add(mes);
        }
      }
      
      // Também verificar por data de lançamento
      if (row["DTLANC"]) {
        const data = parseExcelDate(row["DTLANC"]);
        if (data) {
          mesesPorData.add(data.getMonth() + 1);
        }
      }
    }
    
    const mesesArray = Array.from(mesesEncontrados).sort((a, b) => a - b);
    const mesesDataArray = Array.from(mesesPorData).sort((a, b) => a - b);
    
    console.log(`Meses encontrados (campo MÊS):`);
    if (mesesArray.length > 0) {
      mesesArray.forEach(mes => {
        console.log(`  ${mes} - ${meses[mes - 1]}`);
      });
      console.log(`\n  Último mês: ${mesesArray[mesesArray.length - 1]} - ${meses[mesesArray[mesesArray.length - 1] - 1]}`);
    } else {
      console.log(`  Nenhum mês encontrado no campo MÊS`);
    }
    
    if (mesesDataArray.length > 0) {
      console.log(`\nMeses encontrados (por data de lançamento):`);
      mesesDataArray.forEach(mes => {
        console.log(`  ${mes} - ${meses[mes - 1]}`);
      });
      console.log(`\n  Último mês: ${mesesDataArray[mesesDataArray.length - 1]} - ${meses[mesesDataArray[mesesDataArray.length - 1] - 1]}`);
    }
    
    // Verificar datas mais recentes
    const datasLancamento = [];
    for (const row of data) {
      if (row["DTLANC"]) {
        const data = parseExcelDate(row["DTLANC"]);
        if (data) {
          datasLancamento.push(data);
        }
      }
    }
    
    if (datasLancamento.length > 0) {
      datasLancamento.sort((a, b) => b - a);
      const dataMaisRecente = datasLancamento[0];
      console.log(`\n  📅 Data de lançamento mais recente: ${dataMaisRecente.toLocaleDateString('pt-BR')}`);
      console.log(`  📅 Mês mais recente: ${dataMaisRecente.getMonth() + 1} - ${meses[dataMaisRecente.getMonth()]}`);
    }
  }

  // Verificar RECEBIDO
  if (workbook.SheetNames.includes("RECEBIDO")) {
    console.log("\n" + "=".repeat(80));
    console.log("📊 ABA: RECEBIDO (Receitas)\n");
    const sheet = workbook.Sheets["RECEBIDO"];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    const mesesEncontrados = new Set();
    const mesesPorData = new Set();
    
    for (const row of data) {
      if (row["MÊS"]) {
        const mes = parseInt(String(row["MÊS"]).trim());
        if (mes >= 1 && mes <= 12) {
          mesesEncontrados.add(mes);
        }
      }
      
      // Verificar por data de recebimento
      if (row["DTPAG"]) {
        const data = parseExcelDate(row["DTPAG"]);
        if (data) {
          mesesPorData.add(data.getMonth() + 1);
        }
      }
    }
    
    const mesesArray = Array.from(mesesEncontrados).sort((a, b) => a - b);
    const mesesDataArray = Array.from(mesesPorData).sort((a, b) => a - b);
    
    console.log(`Meses encontrados (campo MÊS):`);
    if (mesesArray.length > 0) {
      mesesArray.forEach(mes => {
        console.log(`  ${mes} - ${meses[mes - 1]}`);
      });
      console.log(`\n  Último mês: ${mesesArray[mesesArray.length - 1]} - ${meses[mesesArray[mesesArray.length - 1] - 1]}`);
    } else {
      console.log(`  Nenhum mês encontrado no campo MÊS`);
    }
    
    if (mesesDataArray.length > 0) {
      console.log(`\nMeses encontrados (por data de recebimento):`);
      mesesDataArray.forEach(mes => {
        console.log(`  ${mes} - ${meses[mes - 1]}`);
      });
      console.log(`\n  Último mês: ${mesesDataArray[mesesDataArray.length - 1]} - ${meses[mesesDataArray[mesesDataArray.length - 1] - 1]}`);
    }
    
    // Verificar datas mais recentes
    const datasRecebimento = [];
    for (const row of data) {
      if (row["DTPAG"]) {
        const data = parseExcelDate(row["DTPAG"]);
        if (data) {
          datasRecebimento.push(data);
        }
      }
    }
    
    if (datasRecebimento.length > 0) {
      datasRecebimento.sort((a, b) => b - a);
      const dataMaisRecente = datasRecebimento[0];
      console.log(`\n  📅 Data de recebimento mais recente: ${dataMaisRecente.toLocaleDateString('pt-BR')}`);
      console.log(`  📅 Mês mais recente: ${dataMaisRecente.getMonth() + 1} - ${meses[dataMaisRecente.getMonth()]}`);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("✅ VERIFICAÇÃO CONCLUÍDA");
  console.log("=".repeat(80));

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

