import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

console.log('Connecting to PostgreSQL with pg driver...');

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

try {
  await client.connect();
  console.log('✓ Connected successfully');

  console.log('Reading migration file...');
  const migrationSQL = readFileSync(join(__dirname, 'drizzle/0000_good_madame_hydra.sql'), 'utf8');
  
  // Split by statement breakpoint
  const statements = migrationSQL
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`[${i + 1}/${statements.length}] Executing...`);
    try {
      await client.query(statement);
      console.log(`✓ Success\n`);
    } catch (error) {
      // Ignore "already exists" errors
      if (error.message.includes('already exists')) {
        console.log(`⚠ Skipped (already exists)\n`);
      } else {
        console.error(`✗ Error: ${error.message}\n`);
        throw error;
      }
    }
  }

  console.log('✅ All migrations applied successfully!');
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  await client.end();
}
