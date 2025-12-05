import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

console.log('Connecting to PostgreSQL...');

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  max: 1,
});

try {
  console.log('Reading migration file...');
  const migrationSQL = readFileSync(join(__dirname, 'drizzle/migrations/0001_add_tipo_vinculo_to_folha.sql'), 'utf8');
  
  // Split by semicolon and filter empty statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (statement.length === 0) continue;
    
    console.log(`[${i + 1}/${statements.length}] Executing...`);
    try {
      await sql.unsafe(statement);
      console.log(`✓ Success\n`);
    } catch (error) {
      // Ignore "already exists" errors
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log(`⚠ Skipped (already exists)\n`);
      } else {
        console.error(`✗ Error: ${error.message}\n`);
        throw error;
      }
    }
  }

  console.log('✅ Migration applied successfully!');
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  await sql.end();
}

