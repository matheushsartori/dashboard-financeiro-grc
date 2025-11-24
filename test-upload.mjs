import fs from 'fs';
import fetch from 'node-fetch';

const filePath = '/home/ubuntu/upload/CópiadePLANILHAGERAL-GRC(1).xlsx';
const fileBuffer = fs.readFileSync(filePath);
const base64Data = fileBuffer.toString('base64');
const fileSize = fs.statSync(filePath).size;

console.log(`Arquivo: ${filePath}`);
console.log(`Tamanho: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`Base64 length: ${base64Data.length}`);

const payload = {
  fileName: 'PLANILHAGERAL-GRC.xlsx',
  fileSize: fileSize,
  fileData: base64Data
};

console.log('\nIniciando upload via API...');

try {
  const response = await fetch('http://localhost:3000/api/trpc/financial.uploadExcel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'manus_session=test-session-id' // Simular sessão
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  console.log('\nResposta da API:');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error('\nErro:', error.message);
}
