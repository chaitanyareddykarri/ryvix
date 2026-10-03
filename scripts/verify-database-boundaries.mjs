import fs from 'node:fs';
import { loadRuntimeEnvironment } from './runtime-environment.mjs';
import pg from 'pg';

// Read-only rollout checks. Never print environment values or raw driver errors.
loadRuntimeEnvironment();
let client;
try {
  const url = new URL(process.env.DATABASE_URL);
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
  client = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: true, ...(process.env.DATABASE_CA_CERT ? { ca: process.env.DATABASE_CA_CERT } : {}) } });
  await client.connect();
  await client.query('BEGIN READ ONLY');
  await client.query("SET LOCAL statement_timeout='15s'");
  const failures = [];
  const check = (name, passed) => { console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`); if (!passed) failures.push(name); };
  const ledger = await client.query('SELECT version FROM supabase_migrations.schema_migrations');
  const applied = new Set(ledger.rows.map(row => String(row.version)));
  const pending = fs.readdirSync('supabase/migrations').filter(file => /^\d+_.*\.sql$/.test(file))
    .filter(file => !applied.has(file.split('_')[0]));
  check('Every numbered migration is recorded', pending.length === 0);
  const rls = await client.query(`SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relrowsecurity`);
  check('RLS enabled on every public table', rls.rows.length === 0);
  const maintenance = await client.query(`SELECT c.relname,b.role_name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN (VALUES ('anon'),('authenticated')) b(role_name)
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
    AND (has_table_privilege(b.role_name,c.oid,'TRUNCATE') OR has_table_privilege(b.role_name,c.oid,'TRIGGER')
      OR has_table_privilege(b.role_name,c.oid,'REFERENCES'))`);
  check('Browser roles have no table-maintenance privileges', maintenance.rows.length === 0);
  for (const role of ['anon', 'authenticated']) {
    const vault = await client.query(`SELECT has_schema_privilege($1,'vault','USAGE') AS schema_access,
      EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='vault' AND has_function_privilege($1,p.oid,'EXECUTE')) AS function_access,
      EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='vault' AND c.relkind IN ('r','v','m') AND has_table_privilege($1,c.oid,'SELECT')) AS secret_access`, [role]);
    check(`${role}: no Vault access`, Object.values(vault.rows[0]).every(value => value === false));
    for (const table of ['auth_challenge_limits','repository_jobs','connector_enrollments','connector_telemetry_receipts','connector_credentials','deployment_events','chat_request_budgets','channel_accounts','channel_inbox','learning_checkpoints','learning_deployments','server_commands','deployment_targets','deployment_runtime_observations','cloud_recovery_requests','whatsapp_alert_outbox','whatsapp_alert_receipts','release_requests','email_notification_preferences','email_notification_outbox','experience_settings','experience_events','experience_lessons','personal_memories','experience_predictions','repository_knowledge_settings','repository_knowledge_files','whatsapp_phone_links','whatsapp_phone_challenges']) {
      const result = await client.query(`SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE') AS allowed`, [role, `public.${table}`]);
      check(`${role}: ${table} is backend-only`, !result.rows[0].allowed);
    }
    for (const table of ['tasks','plans','approval_requests','workspace_sessions','pull_requests','connectors','telemetry_metric_rollups','repositories',
      'projects','environments','organization_members','api_keys','servers','services_inventory','security_events','incidents','chat_conversations','chat_turns',
      'recovery_plans','recovery_runs','plan_steps','tool_calls','health_checks','audit_events','organization_audit_events','learning_examples']) {
      const result = await client.query(`SELECT has_table_privilege($1,$2,'INSERT,UPDATE,DELETE') AS allowed`, [role, `public.${table}`]);
      check(`${role}: no direct ${table} mutations`, !result.rows[0].allowed);
    }
    const profile = await client.query(`SELECT has_column_privilege($1,'public.profiles','organization_id','UPDATE') AS org,
      has_column_privilege($1,'public.profiles','role','UPDATE') AS role`, [role]);
    check(`${role}: profile tenancy and role cannot be edited`, !profile.rows[0].org && !profile.rows[0].role);
  }
  await client.query('ROLLBACK');
  console.log(`Database boundary checks: ${failures.length} failure(s). No data changed.`);
  if (failures.length) process.exitCode = 1;
} catch (error) {
  console.error(`Database boundary verification failed (${String(error.code || 'CHECK_FAILED').replace(/[^a-z0-9_]/gi, '').slice(0, 64)}).`);
  process.exitCode = 1;
} finally { await client?.end().catch(() => {}); }
