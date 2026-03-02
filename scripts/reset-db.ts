import { neon } from '@neondatabase/serverless';
import 'dotenv/config';
import { Client } from 'pg';

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL is not set');
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Connecting to database...');
        await client.connect();

        console.log('Dropping schema public...');
        await client.query('DROP SCHEMA public CASCADE;');

        console.log('Recreating schema public...');
        await client.query('CREATE SCHEMA public;');
        await client.query('GRANT ALL ON SCHEMA public TO public;');

        console.log('Database reset successfully!');
    } catch (err) {
        console.error('Error resetting database:', err);
    } finally {
        await client.end();
    }
}

main();
