// Check actual DB schema for serviciohistorial
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ernwvzifnfjpkpazfumb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVybnd2emlmbmZqcGtwYXpmdW1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUyMTU4MCwiZXhwIjoyMDk0MDk3NTgwfQ.9cptLm6LzK6TVy5fRNJ75QkqMsoc0IWxb0MnKy39shM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('=== Checking serviciohistorial table columns ===');
  const { data: cols, error: colErr } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'serviciohistorial'
      ORDER BY ordinal_position;
    `
  });
  if (colErr) {
    console.log('RPC not available, trying direct query...');
    const { data, error } = await supabase
      .from('serviciohistorial')
      .select('*')
      .limit(1);
    if (error) {
      console.log('Error querying serviciohistorial:', error.message);
    } else {
      console.log('Columns found:', Object.keys(data[0] || {}).join(', '));
    }
  } else {
    console.log('Columns:', cols);
  }

  console.log('\n=== Checking if trigger exists ===');
  // Just query for existing records
  const { data: hist, error: histErr } = await supabase
    .from('serviciohistorial')
    .select('*')
    .limit(5);
  
  if (histErr) {
    console.log('Error:', histErr.message);
  } else {
    console.log(`Found ${hist.length} records`);
    if (hist.length > 0) {
      console.log('Sample:', JSON.stringify(hist[0], null, 2));
      console.log('All keys in first record:', Object.keys(hist[0]));
    }
  }
}

main().catch(console.error);
