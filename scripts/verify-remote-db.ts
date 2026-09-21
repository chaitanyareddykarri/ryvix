import { Client } from 'pg';

async function verifyRemoteDatabase() {
  console.log('============================================================');
  console.log('RYVIX LIVE CLOUD SUPABASE DATABASE INSPECTION & VERIFICATION');
  console.log('Target: db.tsoyrpgifovzwqtgpkkb.supabase.co:5432');
  console.log('============================================================\n');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Missing DATABASE_URL environment variable. Set DATABASE_URL before running inspection.');
  }
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('✓ Successfully connected to live remote PostgreSQL instance.\n');

  // 1. Applied Migrations
  const migrationsRes = await client.query(
    'SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version ASC;'
  );
  console.log(`--- APPLIED MIGRATIONS (${migrationsRes.rows.length}) ---`);
  migrationsRes.rows.forEach((r) => console.log(` • [${r.version}] ${r.name}`));
  console.log('');

  // 2. Tables in public schema
  const tablesRes = await client.query(
    `SELECT table_name 
     FROM information_schema.tables 
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name;`
  );
  console.log(`--- PUBLIC TABLES (${tablesRes.rows.length}) ---`);
  tablesRes.rows.forEach((r, idx) => console.log(` ${idx + 1}. ${r.table_name}`));
  console.log('');

  // 3. Row Level Security on Public Tables
  const rlsRes = await client.query(
    `SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r'
     ORDER BY c.relname;`
  );
  console.log(`--- ROW LEVEL SECURITY (RLS) STATUS ---`);
  let unsecureTables = 0;
  rlsRes.rows.forEach((r) => {
    const status = r.rls_enabled ? 'ENABLED' : 'DISABLED ❌';
    if (!r.rls_enabled) unsecureTables++;
    console.log(` • ${r.table_name}: ${status}`);
  });
  console.log(`Total RLS Verified: ${rlsRes.rows.length - unsecureTables}/${rlsRes.rows.length} enabled.\n`);

  // 4. RLS Policies count and sample
  const policiesRes = await client.query(
    `SELECT tablename, policyname, cmd, qual
     FROM pg_policies 
     WHERE schemaname = 'public'
     ORDER BY tablename, policyname;`
  );
  console.log(`--- RLS POLICIES DEFINED (${policiesRes.rows.length}) ---`);
  policiesRes.rows.forEach((r) => console.log(` • ${r.tablename} -> [${r.cmd}] ${r.policyname}`));
  console.log('');

  // 5. Triggers
  const triggersRes = await client.query(
    `SELECT trigger_name, event_manipulation, event_object_table, action_statement
     FROM information_schema.triggers
     WHERE trigger_schema = 'public' OR event_object_table = 'users'
     ORDER BY event_object_table, trigger_name;`
  );
  console.log(`--- TRIGGERS CONFIGURED (${triggersRes.rows.length}) ---`);
  triggersRes.rows.forEach((r) => console.log(` • Table: ${r.event_object_table} | Trigger: ${r.trigger_name} | Event: ${r.event_manipulation}`));
  console.log('');

  // 6. Indexes count
  const indexesRes = await client.query(
    `SELECT count(*) as total_indexes FROM pg_indexes WHERE schemaname = 'public';`
  );
  console.log(`--- TOTAL INDEXES IN PUBLIC SCHEMA: ${indexesRes.rows[0].total_indexes} ---\n`);

  await client.end();
  console.log('============================================================');
  console.log('REMOTE CLOUD INSPECTION COMPLETED SUCCESSFULLY');
  console.log('============================================================');
}

verifyRemoteDatabase().catch((err) => {
  console.error('Remote verification failed:', err);
  process.exit(1);
});
