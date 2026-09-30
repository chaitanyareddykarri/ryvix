import fs from 'node:fs';
import { createRequire } from 'node:module';
import { loadRuntimeEnvironment, hasCloudModelCredential } from './runtime-environment.mjs';
const require = createRequire(import.meta.url);
// Never override deployment-injected settings or print their values.
loadRuntimeEnvironment();
const cloudModelConfigured = hasCloudModelCredential();
console.log(`Cloud coding model credential: ${cloudModelConfigured ? 'configured (provider availability not tested)' : 'missing'}`);
if (!cloudModelConfigured) process.exitCode = 1;
const required = ['DATABASE_URL', 'AUTH_CHALLENGE_SECRET', 'PREVIEW_BASE_DOMAIN',
  'PREVIEW_SIGNING_SECRET', 'RYVIX_PUBLIC_URL', 'RYVIX_AGENT_RELEASE_MANIFEST',
  'RYVIX_WORKSPACE_NODE_IMAGE', 'RYVIX_WORKSPACE_EGRESS_IMAGE'];
for (const name of required) {
  console.log(`${name}: ${process.env[name] ? 'configured' : 'missing'}`);
  if (!process.env[name]) process.exitCode = 1;
}
if (!process.env.DATABASE_URL) process.exitCode = 1;
else {
  const { Client } = require('pg');
  const url = new URL(process.env.DATABASE_URL);
  // pg connection-string SSL options must not replace certificate verification.
  for (const name of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(name);
  const client = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: true, ...(process.env.DATABASE_CA_CERT ? { ca: process.env.DATABASE_CA_CERT } : {}) } });
  try {
    await client.connect();
    await client.query('BEGIN READ ONLY');
    const result = await client.query(`SELECT to_regclass('public.task_artifacts') IS NOT NULL AS task_artifacts,
      to_regclass('public.connector_telemetry_receipts') IS NOT NULL AS signed_telemetry,
      to_regclass('public.auth_challenge_limits') IS NOT NULL AS auth_challenge_limits,
      to_regclass('public.repository_jobs') IS NOT NULL AS repository_jobs,
      to_regclass('supabase_migrations.schema_migrations') IS NOT NULL AS migration_history`);
    console.log('Database verified-TLS read-only probe: passed');
    console.log(JSON.stringify(result.rows[0]));
    if (Object.values(result.rows[0]).some(value => value !== true)) process.exitCode = 1;
    if (result.rows[0].migration_history) {
      const history = await client.query('SELECT version FROM supabase_migrations.schema_migrations ORDER BY version');
      const applied = new Set(history.rows.map(row => String(row.version)));
      const pending = fs.readdirSync('supabase/migrations').filter(name => /^\d+_.*\.sql$/.test(name))
        .filter(name => !applied.has(name.split('_')[0])).sort();
      console.log(`Migrations absent from live ledger: ${pending.length ? pending.join(', ') : 'none'}`);
      if (pending.length) process.exitCode = 1;
    }
    await client.query('ROLLBACK');
  } catch (error) {
    console.log(`Database verified-TLS read-only probe: failed (${String(error.code || 'CONNECTION_FAILED').replace(/[^A-Z0-9_]/gi, '').slice(0,64)})`);
    process.exitCode = 1;
  } finally { await client.end().catch(() => {}); }
}
