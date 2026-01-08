import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const url = "https://s3.us-east-1.wasabisys.com/uploads.ticket4u.com.br/blackbird/FINANCEIRO GERAL - GRC.xls";
const outputPath = join(__dirname, "..", "planilha-nova.xls");

console.log("Baixando planilha...");
console.log(`URL: ${url}`);
console.log(`Salvando em: ${outputPath}\n`);

try {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erro HTTP: ${response.status} ${response.statusText}`);
  }
  
  const buffer = await response.arrayBuffer();
  writeFileSync(outputPath, Buffer.from(buffer));
  
  console.log(`✅ Planilha baixada com sucesso!`);
  console.log(`Tamanho: ${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB`);
} catch (error) {
  console.error("❌ Erro ao baixar planilha:", error.message);
  process.exit(1);
}

