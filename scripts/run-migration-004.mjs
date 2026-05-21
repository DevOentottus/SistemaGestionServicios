// Run migration 004 via Supabase REST API (service_role key for DDL)
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabase = createClient(
  'https://ernwvzifnfjpkpazfumb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVybnd2emlmbmZqcGtwYXpmdW1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUyMTU4MCwiZXhwIjoyMDk0MDk3NTgwfQ.9cptLm6LzK6TVy5fRNJ75QkqMsoc0IWxb0MnKy39shM'
);

// Supabase free tier doesn't expose raw SQL execution directly via REST.
// We need to use the management API or execute via pg_js.
// Alternative: use the SQL editor in Supabase dashboard, or use pg client.
// For now, output the SQL and provide instructions.

const sql = readFileSync(
  join(__dirname, '..', 'migrations', '004_service_historial_auto.sql'),
  'utf8'
);

console.log('='.repeat(60));
console.log('MIGRATION 004: Service Historial Auto-Registration');
console.log('='.repeat(60));
console.log('\n⚠️  Supabase REST API does not support DDL statements directly.');
console.log('\nRun this SQL in your Supabase Dashboard → SQL Editor:\n');
console.log('-'.repeat(60));
console.log(sql);
console.log('-'.repeat(60));
console.log('\n📋 OR use the Supabase CLI:\n');
console.log('  supabase db execute --file migrations/004_service_historial_auto.sql\n');
console.log('📋 OR connect via psql:\n');
console.log('  psql "$SUPABASE_DB_URL" -f migrations/004_service_historial_auto.sql\n');

// Try via the exec_sql RPC if it exists (some Supabase projects have it)
console.log('Trying exec_sql RPC...');
const { data, error } = await supabase.rpc('exec_sql', { sql_text: sql });
if (error) {
  console.log(`❌ exec_sql RPC not available: ${error.message}`);
  console.log('\n👉 Please run the SQL manually in Supabase Dashboard SQL Editor.');
} else {
  console.log('✅ Migration executed successfully!');
  console.log(JSON.stringify(data, null, 2));
}
