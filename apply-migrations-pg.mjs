import pg from 'pg';
import { readFileSync, readdirSync, existsSync } from 'fs';
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

console.log('Conectando ao PostgreSQL com driver pg...');

const useSSL = DATABASE_URL.includes('sslmode=require') || DATABASE_URL.includes('sslmode=prefer');

const client = new Client({
  connectionString: DATABASE_URL,
  ...(useSSL ? {
    ssl: {
      rejectUnauthorized: false
    }
  } : {})
});

try {
  await client.connect();
  console.log('✓ Connected successfully');

  console.log('\n📦 Applying migration: 0000_good_madame_hydra.sql');
  const migrationSQL = readFileSync(join(__dirname, 'drizzle/0000_good_madame_hydra.sql'), 'utf8');
  
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
      if (error.message.includes('already exists')) {
        console.log(`⚠ Skipped (already exists)\n`);
      } else {
        console.error(`✗ Error: ${error.message}\n`);
        throw error;
      }
    }
  }

  const migrationsDir = join(__dirname, 'drizzle/migrations');
  
  if (existsSync(migrationsDir)) {
    const migrationFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); 
    
    for (const migrationFile of migrationFiles) {
      console.log(`\n📦 Applying migration: ${migrationFile}`);
      const migrationContent = readFileSync(join(migrationsDir, migrationFile), 'utf8');
      
      const migrationStatements = migrationContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (let i = 0; i < migrationStatements.length; i++) {
        const statement = migrationStatements[i];
        if (statement.length === 0) continue;
        
        console.log(`  [${i + 1}/${migrationStatements.length}] Executing...`);
        try {
          await client.query(statement);
          console.log(`  ✓ Success\n`);
        } catch (error) {
          if (error.message.includes('already exists') || error.message.includes('duplicate') || error.message.includes('column') && error.message.includes('already exists')) {
            console.log(`  ⚠ Skipped (already exists)\n`);
          } else {
            console.error(`  ✗ Error: ${error.message}\n`);
            throw error;
          }
        }
      }
    }
  }

  console.log('\n✅ All migrations applied successfully!');
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  await client.end();
}
