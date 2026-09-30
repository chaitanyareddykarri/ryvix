// Compatibility entry point: use the authoritative numbered migrations and their ledger.
// The former concatenated SQL could silently skip security grants and bypass migration history.
console.error('This ad-hoc migration runner is disabled. Apply supabase/migrations through the established Supabase migration workflow, then verify database grants.');
process.exitCode = 1;
