import * as XLSX from "xlsx";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Função toCents do parser
function toCents(value) {
  if (value === null || value === undefined || value === "") return 0;
  const num = typeof value === "string" ? parseFloat(value.replace(/[^\d.-]/g, "").replace(",", ".")) : Number(value);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

const planilhaPath = join(__dirname, "..", "planilha-nova.xls");

console.log("=".repeat(80));
console.log("TESTE DE CONVERSÃO DE VALORES MONETÁRIOS");
console.log("=".repeat(80));

try {
  const buffer = readFileSync(planilhaPath);
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

  // Testar PAGO
  if (workbook.SheetNames.includes("PAGO")) {
    console.log("\n📊 TESTANDO ABA: PAGO\n");
    const sheet = workbook.Sheets["PAGO"];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    let count = 0;
    let problemas = [];
    const exemplos = [];
    
    for (const row of data) {
      if (!row["VALOR"] && !row["VPAGO"]) continue;
      count++;
      
      if (count <= 10) {
        const valorOriginal = row["VALOR"];
        const valorPagoOriginal = row["VPAGO"];
        const valorConvertido = toCents(valorOriginal);
        const valorPagoConvertido = toCents(valorPagoOriginal);
        
        exemplos.push({
          original: valorOriginal,
          tipo: typeof valorOriginal,
          convertido: valorConvertido,
          convertidoReais: (valorConvertido / 100).toFixed(2),
          pagoOriginal: valorPagoOriginal,
          pagoConvertido: valorPagoConvertido,
          pagoReais: (valorPagoConvertido / 100).toFixed(2),
        });
        
        // Verificar se a conversão está correta
        if (typeof valorOriginal === "string") {
          const valorLimpo = valorOriginal.replace(/[^\d.,-]/g, "").replace(",", ".");
          const valorEsperado = Math.round(parseFloat(valorLimpo) * 100);
          if (valorConvertido !== valorEsperado && valorEsperado > 0) {
            problemas.push({
              linha: count,
              original: valorOriginal,
              esperado: valorEsperado,
              obtido: valorConvertido,
            });
          }
        }
      }
    }
    
    console.log(`Total de registros: ${count}`);
    console.log(`\nPrimeiros 10 exemplos de conversão:\n`);
    exemplos.forEach((ex, i) => {
      console.log(`  ${i + 1}. VALOR:`);
      console.log(`     Original: "${ex.original}" (tipo: ${ex.tipo})`);
      console.log(`     Convertido: ${ex.convertido} centavos = R$ ${ex.convertidoReais}`);
      console.log(`     VPAGO:`);
      console.log(`     Original: "${ex.pagoOriginal}"`);
      console.log(`     Convertido: ${ex.pagoConvertido} centavos = R$ ${ex.pagoReais}`);
      console.log("");
    });
    
    if (problemas.length > 0) {
      console.log(`\n⚠️  Problemas encontrados (${problemas.length}):`);
      problemas.slice(0, 5).forEach(p => {
        console.log(`  Linha ${p.linha}: "${p.original}" -> Esperado: ${p.esperado}, Obtido: ${p.obtido}`);
      });
    } else {
      console.log(`\n✅ Nenhum problema encontrado na conversão!`);
    }
  }

  // Testar RECEBIDO
  if (workbook.SheetNames.includes("RECEBIDO")) {
    console.log("\n" + "=".repeat(80));
    console.log("📊 TESTANDO ABA: RECEBIDO\n");
    const sheet = workbook.Sheets["RECEBIDO"];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    let count = 0;
    let problemas = [];
    const exemplos = [];
    
    for (const row of data) {
      if (!row["VALOR"] && !row["VPAGO"]) continue;
      count++;
      
      if (count <= 10) {
        const valorOriginal = row["VALOR"];
        const valorRecebidoOriginal = row["VPAGO"];
        const valorConvertido = toCents(valorOriginal);
        const valorRecebidoConvertido = toCents(valorRecebidoOriginal);
        
        exemplos.push({
          original: valorOriginal,
          tipo: typeof valorOriginal,
          convertido: valorConvertido,
          convertidoReais: (valorConvertido / 100).toFixed(2),
          recebidoOriginal: valorRecebidoOriginal,
          recebidoConvertido: valorRecebidoConvertido,
          recebidoReais: (valorRecebidoConvertido / 100).toFixed(2),
        });
      }
    }
    
    console.log(`Total de registros: ${count}`);
    console.log(`\nPrimeiros 10 exemplos de conversão:\n`);
    exemplos.forEach((ex, i) => {
      console.log(`  ${i + 1}. VALOR:`);
      console.log(`     Original: "${ex.original}" (tipo: ${ex.tipo})`);
      console.log(`     Convertido: ${ex.convertido} centavos = R$ ${ex.convertidoReais}`);
      console.log(`     VPAGO:`);
      console.log(`     Original: "${ex.recebidoOriginal}"`);
      console.log(`     Convertido: ${ex.recebidoConvertido} centavos = R$ ${ex.recebidoReais}`);
      console.log("");
    });
  }

  console.log("\n" + "=".repeat(80));
  console.log("✅ TESTE DE VALORES CONCLUÍDO");
  console.log("=".repeat(80));

} catch (error) {
  console.error("\n❌ Erro:", error.message);
  process.exit(1);
}

