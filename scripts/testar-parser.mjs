import * as XLSX from "xlsx";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Importar o parser (precisamos adaptar para funcionar sem TypeScript)
// Vou criar uma versão simplificada do parser aqui

function toCents(value) {
  if (value === null || value === undefined || value === "") return 0;
  const num = typeof value === "string" ? parseFloat(value.replace(/[^\d.-]/g, "").replace(",", ".")) : Number(value);
  return isNaN(num) ? 0 : Math.round(num * 100);
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

function getMonth(date) {
  if (!date) return null;
  return date.getMonth() + 1;
}

const planilhaPath = join(__dirname, "..", "planilha-nova.xls");

console.log("=".repeat(80));
console.log("TESTE DO PARSER - VERIFICAÇÃO DE EXTRAÇÃO DE DADOS");
console.log("=".repeat(80));
console.log(`\nArquivo: ${planilhaPath}\n`);

try {
  const buffer = readFileSync(planilhaPath);
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

  console.log(`Total de abas: ${workbook.SheetNames.length}`);
  console.log(`Abas: ${workbook.SheetNames.join(", ")}\n`);

  const resultados = {
    planoContas: [],
    centrosCusto: [],
    fornecedores: [],
    contasAPagar: [],
    contasAReceber: [],
  };

  // Testar PG - GRC
  if (workbook.SheetNames.includes("PG - GRC")) {
    console.log("\n" + "=".repeat(80));
    console.log("TESTANDO: PG - GRC");
    console.log("=".repeat(80));
    const sheet = workbook.Sheets["PG - GRC"];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    let count = 0;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0] || !row[1]) continue;
      count++;
      if (count <= 5) {
        resultados.planoContas.push({
          codigo: String(row[0]).trim(),
          descricao: String(row[1]).trim(),
        });
      }
    }
    console.log(`✅ Total de registros processados: ${count}`);
    console.log(`Primeiros 5 registros:`);
    resultados.planoContas.forEach((r, i) => {
      console.log(`  ${i + 1}. Código: ${r.codigo} | Descrição: ${r.descricao}`);
    });
  }

  // Testar CC - GRC
  if (workbook.SheetNames.includes("CC - GRC")) {
    console.log("\n" + "=".repeat(80));
    console.log("TESTANDO: CC - GRC");
    console.log("=".repeat(80));
    const sheet = workbook.Sheets["CC - GRC"];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    let count = 0;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0] || !row[1]) continue;
      count++;
      if (count <= 5) {
        resultados.centrosCusto.push({
          codigo: String(row[0]).trim(),
          descricao: String(row[1]).trim(),
        });
      }
    }
    console.log(`✅ Total de registros processados: ${count}`);
    console.log(`Primeiros 5 registros:`);
    resultados.centrosCusto.forEach((r, i) => {
      console.log(`  ${i + 1}. Código: ${r.codigo} | Descrição: ${r.descricao}`);
    });
  }

  // Testar Fornecedores
  if (workbook.SheetNames.includes("Fornecedores")) {
    console.log("\n" + "=".repeat(80));
    console.log("TESTANDO: Fornecedores");
    console.log("=".repeat(80));
    const sheet = workbook.Sheets["Fornecedores"];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    let count = 0;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0] || !row[1]) continue;
      count++;
      if (count <= 5) {
        resultados.fornecedores.push({
          codigo: String(row[0]).trim(),
          nome: String(row[1]).trim(),
        });
      }
    }
    console.log(`✅ Total de registros processados: ${count}`);
    console.log(`Primeiros 5 registros:`);
    resultados.fornecedores.forEach((r, i) => {
      console.log(`  ${i + 1}. Código: ${r.codigo} | Nome: ${r.nome}`);
    });
  }

  // Testar PAGO
  const sheetNamePago = workbook.SheetNames.includes("PAGO") ? "PAGO" : "GERAL A PAGAR";
  if (workbook.SheetNames.includes(sheetNamePago)) {
    console.log("\n" + "=".repeat(80));
    console.log(`TESTANDO: ${sheetNamePago}`);
    console.log("=".repeat(80));
    const sheet = workbook.Sheets[sheetNamePago];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    let count = 0;
    let problemas = [];
    const filiaisEncontradas = new Set();
    const despesasAnaliticas = new Set();
    const fixoVariavel = { FIXO: 0, VARIÁVEL: 0, VARIAVEL: 0, outros: 0 };
    
    for (const row of data) {
      if (!row["DTLANC"] && !row["VALOR"]) continue; // Pular linhas vazias
      
      count++;
      
      // Coletar estatísticas
      if (row["CODFILIAL"]) {
        filiaisEncontradas.add(String(row["CODFILIAL"]).trim());
      }
      if (row["Despesa Analítico"]) {
        despesasAnaliticas.add(String(row["Despesa Analítico"]).trim());
      }
      
      const fv = row["FIXO OU VARIAVÉL"];
      if (fv === "FIXO") fixoVariavel.FIXO++;
      else if (fv === "VARIÁVEL") fixoVariavel.VARIÁVEL++;
      else if (fv === "VARIAVEL") fixoVariavel.VARIAVEL++;
      else if (fv) fixoVariavel.outros++;
      
      // Verificar primeiros registros
      if (count <= 3) {
        const registro = {
          ccSintetico: row["CC Síntético"] ? String(row["CC Síntético"]) : null,
          despesaSintetico: row["Despesa Sintético"] ? String(row["Despesa Sintético"]) : null,
          despesaAnalitico: row["Despesa Analítico"] ? String(row["Despesa Analítico"]) : null,
          descricaoAnalitica: row["Descrição Despesa Analítica"] || null,
          fixoVariavel: fv || null,
          fornecedor: row["Fornecedor"] || null,
          historico: row["HISTORICO"] || null,
          valor: row["VALOR"] || null,
          valorPago: row["VPAGO"] || null,
          codFilial: row["CODFILIAL"] ? Number(row["CODFILIAL"]) : null,
          dataLancamento: row["DTLANC"] || null,
          dataPagamento: row["DTPAGTO"] || null,
        };
        
        resultados.contasAPagar.push(registro);
        
        // Verificar problemas
        if (!registro.ccSintetico) problemas.push(`Registro ${count}: CC Síntético ausente`);
        if (!registro.despesaAnalitico) problemas.push(`Registro ${count}: Despesa Analítico ausente`);
        if (!registro.valor) problemas.push(`Registro ${count}: VALOR ausente`);
      }
    }
    
    console.log(`✅ Total de registros processados: ${count}`);
    console.log(`\nEstatísticas:`);
    console.log(`  - Filiais encontradas: ${Array.from(filiaisEncontradas).sort().join(", ")}`);
    console.log(`  - Códigos de despesa analítica únicos: ${despesasAnaliticas.size}`);
    console.log(`  - FIXO OU VARIAVÉL: FIXO=${fixoVariavel.FIXO}, VARIÁVEL=${fixoVariavel.VARIÁVEL}, VARIAVEL=${fixoVariavel.VARIAVEL}, outros=${fixoVariavel.outros}`);
    
    console.log(`\nPrimeiros 3 registros detalhados:`);
    resultados.contasAPagar.forEach((r, i) => {
      console.log(`\n  Registro ${i + 1}:`);
      console.log(`    CC Síntético: ${r.ccSintetico || "❌ AUSENTE"}`);
      console.log(`    Despesa Analítico: ${r.despesaAnalitico || "❌ AUSENTE"}`);
      console.log(`    Descrição: ${r.descricaoAnalitica || "❌ AUSENTE"}`);
      console.log(`    Fixo/Variável: ${r.fixoVariavel || "❌ AUSENTE"}`);
      console.log(`    Fornecedor: ${r.fornecedor || "❌ AUSENTE"}`);
      console.log(`    Histórico: ${r.historico || "❌ AUSENTE"}`);
      console.log(`    Valor: ${r.valor || "❌ AUSENTE"}`);
      console.log(`    Valor Pago: ${r.valorPago || "❌ AUSENTE"}`);
      console.log(`    Filial: ${r.codFilial || "❌ AUSENTE"}`);
      console.log(`    Data Lançamento: ${r.dataLancamento || "❌ AUSENTE"}`);
      console.log(`    Data Pagamento: ${r.dataPagamento || "❌ AUSENTE"}`);
    });
    
    if (problemas.length > 0) {
      console.log(`\n⚠️  Problemas encontrados (primeiros 10):`);
      problemas.slice(0, 10).forEach(p => console.log(`  - ${p}`));
    }
  }

  // Testar RECEBIDO
  const sheetNameRecebido = workbook.SheetNames.includes("RECEBIDO") ? "RECEBIDO" : "GERAL A RECEBER";
  if (workbook.SheetNames.includes(sheetNameRecebido)) {
    console.log("\n" + "=".repeat(80));
    console.log(`TESTANDO: ${sheetNameRecebido}`);
    console.log("=".repeat(80));
    const sheet = workbook.Sheets[sheetNameRecebido];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    let count = 0;
    let problemas = [];
    const filiaisEncontradas = new Set();
    
    for (const row of data) {
      if (!row["NOME"] && !row["VALOR"]) continue; // Pular linhas vazias
      
      count++;
      
      if (row["CODFILIAL"]) {
        const cod = String(row["CODFILIAL"]).trim();
        // Remover zeros à esquerda se houver
        const codNum = parseInt(cod);
        if (!isNaN(codNum)) {
          filiaisEncontradas.add(codNum);
        } else {
          filiaisEncontradas.add(cod);
        }
      }
      
      if (count <= 3) {
        const registro = {
          cliente: row["NOME"] || null,
          historico: row["HISTÓRICO"] || row["HISTORICO"] || null,
          valor: row["VALOR"] || null,
          valorRecebido: row["VPAGO"] || null,
          codFilial: row["CODFILIAL"] ? (() => {
            const cod = String(row["CODFILIAL"]).trim();
            const num = parseInt(cod);
            return isNaN(num) ? null : num;
          })() : null,
          dataLancamento: row["DTEMISSAO"] || null,
          dataVencimento: row["DTVENC"] || null,
          dataRecebimento: row["DTPAG"] || null,
          mes: row["MÊS"] || null,
        };
        
        resultados.contasAReceber.push(registro);
        
        if (!registro.cliente) problemas.push(`Registro ${count}: NOME ausente`);
        if (!registro.valor) problemas.push(`Registro ${count}: VALOR ausente`);
      }
    }
    
    console.log(`✅ Total de registros processados: ${count}`);
    console.log(`\nEstatísticas:`);
    console.log(`  - Filiais encontradas: ${Array.from(filiaisEncontradas).sort((a, b) => {
      const aNum = typeof a === 'number' ? a : parseInt(a) || 999;
      const bNum = typeof b === 'number' ? b : parseInt(b) || 999;
      return aNum - bNum;
    }).join(", ")}`);
    
    console.log(`\nPrimeiros 3 registros detalhados:`);
    resultados.contasAReceber.forEach((r, i) => {
      console.log(`\n  Registro ${i + 1}:`);
      console.log(`    Cliente: ${r.cliente || "❌ AUSENTE"}`);
      console.log(`    Histórico: ${r.historico || "❌ AUSENTE"}`);
      console.log(`    Valor: ${r.valor || "❌ AUSENTE"}`);
      console.log(`    Valor Recebido: ${r.valorRecebido || "❌ AUSENTE"}`);
      console.log(`    Filial: ${r.codFilial || "❌ AUSENTE"}`);
      console.log(`    Mês: ${r.mes || "❌ AUSENTE"}`);
      console.log(`    Data Emissão: ${r.dataLancamento || "❌ AUSENTE"}`);
      console.log(`    Data Vencimento: ${r.dataVencimento || "❌ AUSENTE"}`);
      console.log(`    Data Recebimento: ${r.dataRecebimento || "❌ AUSENTE"}`);
    });
    
    if (problemas.length > 0) {
      console.log(`\n⚠️  Problemas encontrados (primeiros 10):`);
      problemas.slice(0, 10).forEach(p => console.log(`  - ${p}`));
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("✅ TESTE CONCLUÍDO");
  console.log("=".repeat(80));
  console.log(`\nResumo:`);
  console.log(`  - Plano de Contas: ${resultados.planoContas.length} amostras`);
  console.log(`  - Centros de Custo: ${resultados.centrosCusto.length} amostras`);
  console.log(`  - Fornecedores: ${resultados.fornecedores.length} amostras`);
  console.log(`  - Contas a Pagar: ${resultados.contasAPagar.length} amostras`);
  console.log(`  - Contas a Receber: ${resultados.contasAReceber.length} amostras`);

} catch (error) {
  console.error("\n❌ Erro ao testar parser:", error.message);
  console.error(error.stack);
  process.exit(1);
}

