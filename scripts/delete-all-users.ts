import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Ryvix Script: Delete All Users & Reset Auth Accounts to Zero
 * 
 * Cleans out auth.users, cascading to sessions, identities, and mfa factors,
 * allowing a completely clean state to test fresh user onboarding and 6-digit OTP signup.
 */
async function deleteAllUsers() {
  console.log('============================================================');
  console.log('RYVIX DATABASE RESET: PURGE ALL USERS (MAKE USERS ZERO)');
  console.log('============================================================\n');

  // Load DATABASE_URL from .env.local
  const envPath = path.resolve(process.cwd(), '.env.local');
  let connectionString = process.env.DATABASE_URL;

  if (!connectionString && fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      if (line.startsWith('DATABASE_URL=')) {
        connectionString = line.replace('DATABASE_URL=', '').trim();
        if (connectionString.startsWith('"') || connectionString.startsWith("'")) {
          connectionString = connectionString.slice(1, -1);
        }
      }
    }
  }

  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL not found in environment or .env.local');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✓ Connected to Supabase PostgreSQL.\n');

    // 1. Inspect current users
    const beforeRes = await client.query('SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC');
    console.log(`Current users in auth.users (${beforeRes.rowCount} total):`);
    for (const u of beforeRes.rows) {
      console.log(`  - [${u.email}] (ID: ${u.id}, Created: ${u.created_at})`);
    }

    if (beforeRes.rowCount === 0) {
      console.log('\n✓ There are already 0 users. Database is completely fresh!');
      return;
    }

    console.log('\nPurging all users from auth.users (cascades to auth.identities, auth.sessions)...');
    const deleteRes = await client.query('DELETE FROM auth.users');
    console.log(`✓ Deleted ${deleteRes.rowCount} user(s).`);

    // Also clean public.users if table exists
    try {
      const pubDelete = await client.query('DELETE FROM public.users');
      console.log(`✓ Cleaned public.users (${pubDelete.rowCount} rows removed).`);
    } catch (e: any) {
      // Table might not exist or already be empty
    }

    // 2. Verify final count is 0
    const afterRes = await client.query('SELECT count(*) FROM auth.users');
    const count = parseInt(afterRes.rows[0].count, 10);
    console.log(`\n============================================================`);
    console.log(`FINAL VERIFICATION: auth.users count = ${count}`);
    if (count === 0) {
      console.log('STATUS: ZERO USERS ACTIVE! You can now create a fresh account.');
    } else {
      console.warn(`WARNING: ${count} users still remain.`);
    }
    console.log('============================================================\n');
  } catch (err: any) {
    console.error('❌ Database error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

deleteAllUsers();
