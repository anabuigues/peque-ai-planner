// Carga el .env.local de la raíz del monorepo (compartido con jobs) y arranca el CLI de Next.
// Los workers de Next heredan process.env.
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const envFile = resolve(import.meta.dirname, '../../../.env.local');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const require = createRequire(import.meta.url);
require('next/dist/bin/next');
