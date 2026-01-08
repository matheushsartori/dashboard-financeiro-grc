import { cp } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const drizzleDir = 'drizzle';
const distDrizzleDir = 'dist/drizzle';

if (existsSync(drizzleDir)) {
  await cp(drizzleDir, distDrizzleDir, { recursive: true });
  console.log('✓ Copied drizzle directory to dist');
} else {
  console.warn('⚠ drizzle directory not found');
}





