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
  const migrationSQL = readFileSync(join(__dirname, 'drizzle/0000_good_madame_hydra.sql'), 'utf8');
  
  // Split by statement breakpoint
  const statements = migrationSQL
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Found ${statements.length} SQL statements to execute`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`Executing statement ${i + 1}/${statements.length}...`);
    try {
      await sql.unsafe(statement);
      console.log(`✓ Statement ${i + 1} executed successfully`);
    } catch (error) {
      // Ignore "already exists" errors
      if (error.message.includes('already exists')) {
        console.log(`⚠ Statement ${i + 1} skipped (already exists)`);
      } else {
        throw error;
      }
    }
  }

  console.log('\n✅ All migrations applied successfully!');
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  await sql.end();
}
