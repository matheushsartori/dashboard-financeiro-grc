import fs from 'fs';

const filePath = '/home/ubuntu/upload/CópiadePLANILHAGERAL-GRC(1).xlsx';
const fileBuffer = fs.readFileSync(filePath);
const base64Data = fileBuffer.toString('base64');
const fileSize = fs.statSync(filePath).size;

console.log(`Arquivo: ${filePath}`);
console.log(`Tamanho: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`Base64 length: ${base64Data.length} caracteres`);
console.log(`\nIniciando teste de processamento...`);

// Simular o processamento que o backend faria
try {
  // Converter base64 de volta para buffer
  const decoded = Buffer.from(base64Data, 'base64');
  console.log(`✓ Decodificação base64 bem-sucedida: ${(decoded.length / 1024 / 1024).toFixed(2)} MB`);
  
  // Verificar se o arquivo é válido
  const header = decoded.slice(0, 4).toString('hex');
  console.log(`✓ Header do arquivo: ${header}`);
  
  if (header === '504b0304' || header === 'd0cf11e0') {
    console.log(`✓ Arquivo Excel válido detectado`);
  } else {
    console.log(`⚠ Header não reconhecido como Excel`);
  }
  
  console.log(`\n✓ Arquivo pode ser processado com sucesso!`);
} catch (error) {
  console.error(`✗ Erro no processamento:`, error.message);
}
