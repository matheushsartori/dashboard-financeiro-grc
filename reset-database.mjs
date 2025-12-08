import pg from 'pg';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL || "postgres://9cf28c34e048704614c47f64c97a99624e427315da0314f6c8c6c876281ad906:sk_AOFdtqL7dzWDPc5HxCLOH@db.prisma.io:5432/postgres?sslmode=require";

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.error('   Configure no arquivo .env:');
  console.error('   DATABASE_URL="postgres://user:password@host:5432/database?sslmode=require"');
  process.exit(1);
}

console.log('🔌 Conectando ao banco de dados...');

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
  console.log('✅ Conectado com sucesso!\n');

  console.log('⚠️  ATENÇÃO: Este script vai DELETAR TODAS as tabelas e dados!');
  console.log('   Pressione Ctrl+C para cancelar ou aguarde 3 segundos...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Lista de tabelas na ordem correta (respeitando foreign keys)
  const tabelas = [
    'saldos_bancarios',
    'folha_pagamento',
    'contas_a_receber',
    'contas_a_pagar',
    'uploads',
    'fornecedores',
    'centros_custo',
    'plano_contas',
    'users'
  ];

  console.log('🗑️  Deletando todas as tabelas...\n');
  for (const tabela of tabelas) {
    try {
      await client.query(`DROP TABLE IF EXISTS "${tabela}" CASCADE;`);
      console.log(`   ✓ Tabela ${tabela} deletada`);
    } catch (error) {
      console.log(`   ⚠️  Erro ao deletar ${tabela}: ${error.message}`);
    }
  }

  // Deletar tipos ENUM
  console.log('\n🗑️  Deletando tipos ENUM...\n');
  const enums = ['fixo_variavel', 'plano_contas_tipo', 'role', 'upload_status'];
  for (const enumType of enums) {
    try {
      await client.query(`DROP TYPE IF EXISTS "${enumType}" CASCADE;`);
      console.log(`   ✓ Tipo ${enumType} deletado`);
    } catch (error) {
      console.log(`   ⚠️  Erro ao deletar ${enumType}: ${error.message}`);
    }
  }

  // Deletar índices que possam ter ficado
  console.log('\n🗑️  Limpando índices...\n');
  try {
    await client.query(`
      DROP INDEX IF EXISTS "idx_contas_a_pagar_cod_filial" CASCADE;
      DROP INDEX IF EXISTS "idx_contas_a_receber_cod_filial" CASCADE;
    `);
    console.log('   ✓ Índices deletados');
  } catch (error) {
    console.log(`   ⚠️  Erro ao deletar índices: ${error.message}`);
  }

  console.log('\n📦 Aplicando migration inicial: 0000_good_madame_hydra.sql\n');
  const migrationPath = join(__dirname, 'drizzle/0000_good_madame_hydra.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf8');
  
  const statements = migrationSQL
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`   Encontrados ${statements.length} statements SQL\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (statement.length === 0) continue;
    
    console.log(`   [${i + 1}/${statements.length}] Executando...`);
    try {
      await client.query(statement);
      console.log(`   ✓ Sucesso\n`);
    } catch (error) {
      console.error(`   ❌ Erro: ${error.message}\n`);
      throw error;
    }
  }

  // Aplicar migrations adicionais
  const migrationsDir = join(__dirname, 'drizzle/migrations');
  
  if (existsSync(migrationsDir)) {
    const migrationFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ordem: 0001, 0002, etc.
    
    for (const migrationFile of migrationFiles) {
      console.log(`\n📦 Aplicando migration: ${migrationFile}\n`);
      const migrationContent = readFileSync(join(migrationsDir, migrationFile), 'utf8');
      
      const migrationStatements = migrationContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (let i = 0; i < migrationStatements.length; i++) {
        const statement = migrationStatements[i];
        if (statement.length === 0) continue;
        
        console.log(`   [${i + 1}/${migrationStatements.length}] Executando...`);
        try {
          await client.query(statement);
          console.log(`   ✓ Sucesso\n`);
        } catch (error) {
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate') || 
              (error.message.includes('column') && error.message.includes('already exists'))) {
            console.log(`   ⚠️  Ignorado (já existe)\n`);
          } else {
            console.error(`   ❌ Erro: ${error.message}\n`);
            throw error;
          }
        }
      }
    }
  }

  // Verificação final
  console.log('\n📊 Verificação final da estrutura do banco:\n');
  
  const tabelasVerificacao = [
    'users',
    'uploads',
    'plano_contas',
    'centros_custo',
    'fornecedores',
    'contas_a_pagar',
    'contas_a_receber',
    'folha_pagamento',
    'saldos_bancarios'
  ];

  for (const tabela of tabelasVerificacao) {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      );
    `, [tabela]);
    
    if (result.rows[0].exists) {
      console.log(`   ✓ Tabela ${tabela} existe`);
      
      // Verificar colunas importantes
      if (tabela === 'contas_a_pagar' || tabela === 'contas_a_receber') {
        const colunas = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = 'cod_filial'
        `, [tabela]);
        
        if (colunas.rows.length > 0) {
          console.log(`      ✓ Coluna cod_filial existe em ${tabela}`);
        } else {
          console.log(`      ❌ Coluna cod_filial NÃO existe em ${tabela}`);
        }
      }
      
      if (tabela === 'folha_pagamento') {
        const colunas = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = 'tipo_vinculo'
        `, [tabela]);
        
        if (colunas.rows.length > 0) {
          console.log(`      ✓ Coluna tipo_vinculo existe em ${tabela}`);
        } else {
          console.log(`      ❌ Coluna tipo_vinculo NÃO existe em ${tabela}`);
        }
      }
    } else {
      console.log(`   ❌ Tabela ${tabela} NÃO existe`);
    }
  }

  // Verificar índices
  console.log('\n📊 Verificando índices:\n');
  const indexes = await client.query(`
    SELECT indexname, tablename
    FROM pg_indexes 
    WHERE tablename IN ('contas_a_pagar', 'contas_a_receber')
      AND indexname LIKE '%cod_filial%'
  `);
  
  if (indexes.rows.length > 0) {
    console.log('   ✓ Índices encontrados:');
    indexes.rows.forEach(idx => {
      console.log(`      - ${idx.indexname} na tabela ${idx.tablename}`);
    });
  } else {
    console.log('   ⚠️  Nenhum índice encontrado');
  }

  console.log('\n✅ Banco de dados resetado e recriado com sucesso!');
  console.log('   Todas as tabelas foram criadas e as migrations aplicadas.');
  console.log('   Agora você pode importar suas planilhas novamente.\n');

} catch (error) {
  console.error('\n❌ Erro ao resetar banco de dados:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  await client.end();
  console.log('🔌 Conexão encerrada.');
}

