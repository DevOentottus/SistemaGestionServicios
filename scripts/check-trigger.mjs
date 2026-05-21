import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ernwvzifnfjpkpazfumb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVybnd2emlmbmZqcGtwYXpmdW1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUyMTU4MCwiZXhwIjoyMDk0MDk3NTgwfQ.9cptLm6LzK6TVy5fRNJ75QkqMsoc0IWxb0MnKy39shM'
);

async function main() {
  // Check if the trigger exists by looking at the estructura of the table
  // via pg_catalog - use the sql endpoint for raw queries
  console.log('=== Checking DB triggers for serviciohistorial ===');
  
  // Try to query the Postgres information_schema triggers
  const url = 'https://ernwvzifnfjpkpazfumb.supabase.co/rest/v1/rpc/';
  
  // Just look at existing historial data to understand the pattern
  const { data: allHist, error: histErr } = await supabase
    .from('serviciohistorial')
    .select('*')
    .order('serviciohistorial_id', { ascending: false })
    .limit(10);
  
  if (histErr) {
    console.log('Error:', histErr.message);
    return;
  }
  
  console.log(`Total ${allHist.length} recent records:`);
  allHist.forEach(h => {
    console.log(`  #${h.serviciohistorial_id} | servicio=${h.servicio_id} | ${h.serviciohistorial_estado_anterior} → ${h.serviciohistorial_estado_nuevo} | usuario=${h.usuario_id} | ${h.serviciohistorial_fecha} ${h.serviciohistorial_hora || '—'}`);
  });

  // Check if there's a trigger that fires when updating servicios
  // Test update on a random servicio to see if it auto-creates historial entries
  // But better: query the SQL schema directly
  console.log('\n=== Attempting SQL query via the REST API ===');
  
  const sqlCheck = `
    SELECT trigger_name, event_manipulation, action_timing
    FROM information_schema.triggers
    WHERE event_object_table = 'servicios';
  `;
  
  // Supabase REST API doesn't support arbitrary SQL, try via the sql endpoint
  const response = await fetch('https://ernwvzifnfjpkpazfumb.supabase.co/rest/v1/', {
    method: 'GET',
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVybnd2emlmbmZqcGtwYXpmdW1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUyMTU4MCwiZXhwIjoyMDk0MDk3NTgwfQ.9cptLm6LzK6TVy5fRNJ75QkqMsoc0IWxb0MnKy39shM',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVybnd2emlmbmZqcGtwYXpmdW1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUyMTU4MCwiZXhwIjoyMDk0MDk3NTgwfQ.9cptLm6LzK6TVy5fRNJ75QkqMsoc0IWxb0MnKy39shM'
    }
  });
  
  console.log('REST API response status:', response.status);
  
  // Also check by looking at the tables to see what's available
  console.log('\n=== Checking tables via REST ===');
  const { data: tables, error: tblErr } = await supabase
    .from('servicios')
    .select('servicio_id, servicio_estado')
    .limit(3);
  
  if (tblErr) {
    console.log('Error querying servicios:', tblErr.message);
  } else {
    console.log('Servicios sample:', JSON.stringify(tables));
  }
}

main().catch(console.error);
