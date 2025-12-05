import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Compilar drizzle/schema.ts para JavaScript
const schemaPath = join(rootDir, 'drizzle/schema.ts');
const outputPath = join(rootDir, 'drizzle/schema.js');

if (existsSync(schemaPath)) {
  try {
    // Usar esbuild para compilar o schema
    execSync(
      `npx esbuild "${schemaPath}" --outfile="${outputPath}" --format=esm --platform=node --bundle=false --packages=external`,
      { 
        stdio: 'inherit',
        cwd: rootDir
      }
    );
    console.log('✓ Schema compilado com sucesso');
  } catch (error) {
    console.warn('⚠ Erro ao compilar schema, continuando...');
    console.warn(error.message);
  }
} else {
  console.warn('⚠ Schema não encontrado em:', schemaPath);
}

