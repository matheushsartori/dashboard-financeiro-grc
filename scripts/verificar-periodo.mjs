import * as XLSX from "xlsx";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const planilhaPath = join(__dirname, "..", "planilha-nova.xls");

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

console.log("=".repeat(80));
console.log("VERIFICAÇÃO DE PERÍODO E TOTAIS POR MÊS");
console.log("=".repeat(80));

try {
  const buffer = readFileSync(planilhaPath);
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", 
                 "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

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

  // Analisar PAGO
  if (workbook.SheetNames.includes("PAGO")) {
    console.log("\n📊 DESPESAS (PAGO) - Por Data de Pagamento\n");
    const sheet = workbook.Sheets["PAGO"];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    const totaisPorMes = {};
    const datas = [];
    
    for (const row of data) {
      if (row["DTPAGTO"]) {
        const dataPagto = parseExcelDate(row["DTPAGTO"]);
        if (dataPagto) {
          const ano = dataPagto.getFullYear();
          const mes = dataPagto.getMonth() + 1;
          const chave = `${ano}-${mes}`;
          
          if (!totaisPorMes[chave]) {
            totaisPorMes[chave] = { ano, mes, total: 0, registros: 0 };
          }
          
          totaisPorMes[chave].total += toCents(row["VPAGO"]);
          totaisPorMes[chave].registros++;
          datas.push(dataPagto);
        }
      }
    }
    
    const chaves = Object.keys(totaisPorMes).sort();
    console.log("Mês/Ano | Registros | Total Pago");
    console.log("-".repeat(50));
    chaves.forEach(chave => {
      const info = totaisPorMes[chave];
      console.log(`${meses[info.mes - 1]}/${info.ano} | ${info.registros.toString().padStart(8)} | ${formatCurrency(info.total)}`);
    });
    
    if (datas.length > 0) {
      datas.sort((a, b) => b - a);
      const maisRecente = datas[0];
      const maisAntiga = datas[datas.length - 1];
      console.log(`\nPeríodo: ${maisAntiga.toLocaleDateString('pt-BR')} até ${maisRecente.toLocaleDateString('pt-BR')}`);
    }
    
    // Total de dezembro
    const dez2024 = totaisPorMes["2024-12"];
    const dez2025 = totaisPorMes["2025-12"];
    console.log(`\n💰 Dezembro 2024: ${dez2024 ? formatCurrency(dez2024.total) : "R$ 0,00"} (${dez2024?.registros || 0} registros)`);
    console.log(`💰 Dezembro 2025: ${dez2025 ? formatCurrency(dez2025.total) : "R$ 0,00"} (${dez2025?.registros || 0} registros)`);
  }

  // Analisar RECEBIDO
  if (workbook.SheetNames.includes("RECEBIDO")) {
    console.log("\n" + "=".repeat(80));
    console.log("📊 RECEITAS (RECEBIDO) - Por Data de Recebimento\n");
    const sheet = workbook.Sheets["RECEBIDO"];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    const totaisPorMes = {};
    const datas = [];
    
    for (const row of data) {
      if (row["DTPAG"]) {
        const dataReceb = parseExcelDate(row["DTPAG"]);
        if (dataReceb) {
          const ano = dataReceb.getFullYear();
          const mes = dataReceb.getMonth() + 1;
          const chave = `${ano}-${mes}`;
          
          if (!totaisPorMes[chave]) {
            totaisPorMes[chave] = { ano, mes, total: 0, registros: 0 };
          }
          
          totaisPorMes[chave].total += toCents(row["VPAGO"]);
          totaisPorMes[chave].registros++;
          datas.push(dataReceb);
        }
      }
    }
    
    const chaves = Object.keys(totaisPorMes).sort();
    console.log("Mês/Ano | Registros | Total Recebido");
    console.log("-".repeat(50));
    chaves.forEach(chave => {
      const info = totaisPorMes[chave];
      console.log(`${meses[info.mes - 1]}/${info.ano} | ${info.registros.toString().padStart(8)} | ${formatCurrency(info.total)}`);
    });
    
    if (datas.length > 0) {
      datas.sort((a, b) => b - a);
      const maisRecente = datas[0];
      const maisAntiga = datas[datas.length - 1];
      console.log(`\nPeríodo: ${maisAntiga.toLocaleDateString('pt-BR')} até ${maisRecente.toLocaleDateString('pt-BR')}`);
    }
    
    // Total de dezembro
    const dez2024 = totaisPorMes["2024-12"];
    const dez2025 = totaisPorMes["2025-12"];
    console.log(`\n💰 Dezembro 2024: ${dez2024 ? formatCurrency(dez2024.total) : "R$ 0,00"} (${dez2024?.registros || 0} registros)`);
    console.log(`💰 Dezembro 2025: ${dez2025 ? formatCurrency(dez2025.total) : "R$ 0,00"} (${dez2025?.registros || 0} registros)`);
  }

  console.log("\n" + "=".repeat(80));

} catch (error) {
  console.error("\n❌ Erro:", error.message);
  process.exit(1);
}

