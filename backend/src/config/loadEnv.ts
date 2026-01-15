import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

// Ensure we load the backend env file regardless of where the process was started from.
// We intentionally allow backend/.env to override existing values to avoid stale/incorrect
// DATABASE_URL coming from a different cwd/env file or a task terminal environment.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendEnvPath = path.resolve(__dirname, '..', '..', '.env');

if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath, override: true });
}