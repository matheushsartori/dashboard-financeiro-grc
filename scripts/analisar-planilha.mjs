import * as XLSX from "xlsx";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Caminho da planilha - tentar planilha nova primeiro, depois a antiga
const planilhaPath = join(__dirname, "..", "planilha-nova.xls");
const planilhaPathFallback = join(__dirname, "..", "planilha.xlsx");

console.log("=".repeat(80));
console.log("ANÁLISE COMPLETA DA PLANILHA EXCEL");
console.log("=".repeat(80));

// Verificar qual arquivo existe
let arquivoFinal = planilhaPath;
try {
  readFileSync(planilhaPath);
} catch {
  try {
    readFileSync(planilhaPathFallback);
    arquivoFinal = planilhaPathFallback;
  } catch {
    console.error(`❌ Nenhuma planilha encontrada!`);
    console.error(`   Tentado: ${planilhaPath}`);
    console.error(`   Tentado: ${planilhaPathFallback}`);
    process.exit(1);
  }
}

console.log(`\nArquivo: ${arquivoFinal}\n`);

try {
  // Ler o arquivo
  const buffer = readFileSync(arquivoFinal);
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

  console.log(`Total de abas: ${workbook.SheetNames.length}\n`);
  console.log("Abas encontradas:", workbook.SheetNames.join(", "));
  console.log("\n" + "=".repeat(80) + "\n");

  // Analisar cada aba
  for (const sheetName of workbook.SheetNames) {
    console.log(`\n${"#".repeat(80)}`);
    console.log(`# ABA: ${sheetName}`);
    console.log(`${"#".repeat(80)}\n`);

    const sheet = workbook.Sheets[sheetName];
    
    // Converter para JSON com header
    const data = XLSX.utils.sheet_to_json(sheet, { 
      header: 1,
      defval: null,
      raw: false 
    });

    if (data.length === 0) {
      console.log("⚠️  Aba vazia!\n");
      continue;
    }

    // Primeira linha como cabeçalho
    const headers = data[0] || [];
    const rows = data.slice(1);

    console.log(`Total de linhas (incluindo cabeçalho): ${data.length}`);
    console.log(`Total de registros: ${rows.length}`);
    console.log(`Total de colunas: ${headers.length}\n`);

    // Listar colunas
    console.log("COLUNAS:");
    console.log("-".repeat(80));
    
    const colunasInfo = [];

    for (let i = 0; i < headers.length; i++) {
      const colunaNome = headers[i];
      if (!colunaNome && colunaNome !== 0) {
        // Tentar detectar coluna sem nome
        const colunaLetra = XLSX.utils.encode_col(i);
        console.log(`\n[${i}] Coluna ${colunaLetra} (sem nome no cabeçalho)`);
        continue;
      }

      const colunaNomeStr = String(colunaNome).trim();
      if (!colunaNomeStr) continue;

      // Extrair valores da coluna
      const valores = rows
        .map(row => row[i])
        .filter(val => val !== null && val !== undefined && val !== "");

      const valoresUnicos = [...new Set(valores.map(v => String(v).trim()))];
      const valoresAmostra = valoresUnicos.slice(0, 10);
      const totalNulos = rows.length - valores.length;
      const percentualNulos = ((totalNulos / rows.length) * 100).toFixed(2);

      // Detectar tipo de dado
      let tipoDado = "mixed";
      const tiposEncontrados = new Set();
      
      valores.forEach(val => {
        if (val instanceof Date) {
          tiposEncontrados.add("date");
        } else if (typeof val === "number") {
          tiposEncontrados.add("number");
        } else if (typeof val === "boolean") {
          tiposEncontrados.add("boolean");
        } else {
          tiposEncontrados.add("string");
        }
      });

      if (tiposEncontrados.size === 1) {
        tipoDado = Array.from(tiposEncontrados)[0];
      } else if (tiposEncontrados.size > 1) {
        tipoDado = `mixed (${Array.from(tiposEncontrados).join(", ")})`;
      }

      // Verificar se parece ser numérico (mesmo sendo string)
      const pareceNumerico = valores.length > 0 && valores.every(v => {
        const str = String(v);
        return !isNaN(parseFloat(str)) && isFinite(parseFloat(str));
      });

      if (pareceNumerico && tipoDado === "string") {
        tipoDado = "numeric_string";
      }

      // Verificar se parece ser data (mesmo sendo string)
      const pareceData = valores.length > 0 && valores.some(v => {
        const str = String(v);
        return /^\d{1,2}\/\d{1,2}\/\d{4}/.test(str) || 
               /^\d{4}-\d{2}-\d{2}/.test(str) ||
               str.match(/\d{1,2}\/\d{1,2}\/\d{4}/);
      });

      if (pareceData && tipoDado === "string") {
        tipoDado = "date_string";
      }

      colunasInfo.push({
        indice: i,
        nome: colunaNomeStr,
        tipo: tipoDado,
        totalValores: valores.length,
        totalNulos,
        percentualNulos: parseFloat(percentualNulos),
        valoresUnicos: valoresUnicos.length,
        valoresAmostra,
      });

      console.log(`\n[${i}] ${colunaNomeStr}`);
      console.log(`    Tipo: ${tipoDado}`);
      console.log(`    Valores não nulos: ${valores.length} / ${rows.length} (${(100 - parseFloat(percentualNulos)).toFixed(2)}%)`);
      console.log(`    Valores nulos: ${totalNulos} (${percentualNulos}%)`);
      console.log(`    Valores únicos: ${valoresUnicos.length}`);
      
      if (valoresAmostra.length > 0) {
        console.log(`    Amostra de valores:`);
        valoresAmostra.forEach((val, idx) => {
          const displayVal = String(val).length > 50 
            ? String(val).substring(0, 50) + "..." 
            : String(val);
          console.log(`      ${idx + 1}. ${displayVal}`);
        });
        if (valoresUnicos.length > 10) {
          console.log(`      ... e mais ${valoresUnicos.length - 10} valores únicos`);
        }
      }
    }

    // Análise adicional
    console.log("\n" + "-".repeat(80));
    console.log("ANÁLISE ADICIONAL:");
    console.log("-".repeat(80));

    // Verificar colunas completamente vazias
    const colunasVazias = colunasInfo.filter(c => c.totalValores === 0);
    if (colunasVazias.length > 0) {
      console.log(`\n⚠️  Colunas completamente vazias (${colunasVazias.length}):`);
      colunasVazias.forEach(c => {
        console.log(`    - ${c.nome} (índice ${c.indice})`);
      });
    }

    // Verificar colunas com muitos nulos (>50%)
    const colunasComMuitosNulos = colunasInfo.filter(c => c.percentualNulos > 50 && c.totalValores > 0);
    if (colunasComMuitosNulos.length > 0) {
      console.log(`\n⚠️  Colunas com mais de 50% de valores nulos (${colunasComMuitosNulos.length}):`);
      colunasComMuitosNulos.forEach(c => {
        console.log(`    - ${c.nome}: ${c.percentualNulos.toFixed(2)}% nulos`);
      });
    }

    // Verificar colunas duplicadas (mesmos valores)
    const colunasDuplicadas = [];
    for (let i = 0; i < colunasInfo.length; i++) {
      for (let j = i + 1; j < colunasInfo.length; j++) {
        const col1 = colunasInfo[i];
        const col2 = colunasInfo[j];
        if (col1.valoresUnicos === col2.valoresUnicos && 
            col1.valoresAmostra.length > 0 &&
            col1.valoresAmostra.every((v, idx) => v === col2.valoresAmostra[idx])) {
          colunasDuplicadas.push([col1.nome, col2.nome]);
        }
      }
    }
    if (colunasDuplicadas.length > 0) {
      console.log(`\n⚠️  Possíveis colunas duplicadas:`);
      colunasDuplicadas.forEach(([col1, col2]) => {
        console.log(`    - ${col1} e ${col2}`);
      });
    }

    // Verificar padrões específicos por aba
    if (sheetName.includes("PAGO") || sheetName.includes("PAGAR")) {
      console.log(`\n📋 Análise específica para aba de PAGAMENTOS:`);
      const codFilialCol = colunasInfo.find(c => 
        c.nome.toUpperCase().includes("CODFILIAL") || 
        c.nome.toUpperCase().includes("FILIAL")
      );
      if (codFilialCol) {
        console.log(`    - Filiais encontradas: ${codFilialCol.valoresAmostra.join(", ")}`);
      }

      const despesaAnaliticoCol = colunasInfo.find(c => 
        c.nome.toUpperCase().includes("DESPESA ANALÍTICO") ||
        c.nome.toUpperCase().includes("DESPESA ANALITICO")
      );
      if (despesaAnaliticoCol) {
        console.log(`    - Códigos de despesa analítica únicos: ${despesaAnaliticoCol.valoresUnicos}`);
      }
    }

    if (sheetName.includes("RECEBIDO") || sheetName.includes("RECEBER")) {
      console.log(`\n📋 Análise específica para aba de RECEBIMENTOS:`);
      const codFilialCol = colunasInfo.find(c => 
        c.nome.toUpperCase().includes("CODFILIAL") || 
        c.nome.toUpperCase().includes("FILIAL")
      );
      if (codFilialCol) {
        console.log(`    - Filiais encontradas: ${codFilialCol.valoresAmostra.join(", ")}`);
      }
    }

    if (sheetName.includes("FOLHA")) {
      console.log(`\n📋 Análise específica para aba de FOLHA DE PAGAMENTO:`);
      const nomeCol = colunasInfo.find(c => 
        c.nome.toUpperCase().includes("NOME")
      );
      if (nomeCol) {
        console.log(`    - Total de funcionários: ${nomeCol.valoresUnicos}`);
      }
    }

    console.log("\n" + "=".repeat(80));
  }

  console.log("\n✅ Análise concluída!\n");

} catch (error) {
  console.error("\n❌ Erro ao analisar planilha:", error.message);
  console.error(error.stack);
  process.exit(1);
}

