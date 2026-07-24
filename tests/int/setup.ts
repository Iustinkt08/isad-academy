import { execSync } from 'node:child_process'

/**
 * Points every int test at a dedicated, throwaway Postgres database (`isad_test`) instead
 * of the dev `isad` database — this MUST run (and finish) before `src/payload.config` is
 * ever imported, since that module reads `process.env.DATABASE_URI` at import time and
 * push-mode schema sync kicks in as soon as Payload connects.
 *
 * Import this module first, as a side effect, in every `*.int.spec.ts` file:
 *   import './setup'
 * ES module imports execute in source order, so as long as this import appears before the
 * `payload`/`payload.config` imports in a test file, the env var is guaranteed to be set in
 * time — no need for a global Vitest setupFile or a dynamic import.
 */

const TEST_DB_NAME = 'isad_test'
const TEST_DATABASE_URI = `postgres://postgres:postgres@localhost:5432/${TEST_DB_NAME}`

process.env.DATABASE_URI = TEST_DATABASE_URI
process.env.PAYLOAD_SECRET ||= 'int-test-secret-not-for-production-0123456789abcdef'

try {
  execSync(`docker exec isad-postgres psql -U postgres -c "CREATE DATABASE ${TEST_DB_NAME}"`, {
    stdio: 'pipe',
  })
} catch (err) {
  const message = err instanceof Error ? err.message : String(err)
  // Concurrent test files may race to create the DB — "already exists" is expected and fine.
  if (!message.includes('already exists')) {
    throw new Error(
      `Could not ensure throwaway Postgres database "${TEST_DB_NAME}" exists via ` +
        `"docker exec isad-postgres psql". Is the isad-postgres container running ` +
        `(docker compose up -d)? Original error:\n${message}`,
    )
  }
}
