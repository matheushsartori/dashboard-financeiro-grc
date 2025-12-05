import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = join(__dirname, '..', 'dist');

function findJsFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  
  files.forEach(file => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      findJsFiles(filePath, fileList);
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function fixImports(filePath) {
  try {
    let content = readFileSync(filePath, 'utf8');
    let modified = false;
    
    const patterns = [
      // from "../drizzle/schema"
      { from: /from\s+['"]\.\.\/drizzle\/schema['"]/g, to: "from '../drizzle/schema.js'" },
      // from "../../drizzle/schema"
      { from: /from\s+['"]\.\.\/\.\.\/drizzle\/schema['"]/g, to: "from '../../drizzle/schema.js'" },
      // from "./drizzle/schema"
      { from: /from\s+['"]\.\/drizzle\/schema['"]/g, to: "from './drizzle/schema.js'" },
      // import ... from "../drizzle/schema"
      { from: /import\s+.*\s+from\s+['"]\.\.\/drizzle\/schema['"]/g, to: (match) => match.replace(/['"]\.\.\/drizzle\/schema['"]/, "'../drizzle/schema.js'") },
      // import ... from "../../drizzle/schema"
      { from: /import\s+.*\s+from\s+['"]\.\.\/\.\.\/drizzle\/schema['"]/g, to: (match) => match.replace(/['"]\.\.\/\.\.\/drizzle\/schema['"]/, "'../../drizzle/schema.js'") },
    ];
    
    patterns.forEach(({ from, to }) => {
      if (from.test(content)) {
        content = content.replace(from, to);
        modified = true;
      }
    });
    
    if (modified) {
      writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Corrigido: ${filePath}`);
    }
  } catch (error) {
    console.warn(`⚠ Erro ao processar ${filePath}:`, error.message);
  }
}

// Processar todos os arquivos .js no dist
try {
  const jsFiles = findJsFiles(distDir);
  console.log(`Encontrados ${jsFiles.length} arquivos .js para processar`);
  
  jsFiles.forEach(fixImports);
  
  console.log('✓ Imports do drizzle/schema corrigidos');
} catch (error) {
  console.warn('⚠ Erro ao processar arquivos:', error.message);
}

