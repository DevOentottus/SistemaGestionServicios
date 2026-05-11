import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "https://ernwvzifnfjpkpazfumb.supabase.co",
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVybnd2emlmbmZqcGtwYXpmdW1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUyMTU4MCwiZXhwIjoyMDk0MDk3NTgwfQ.9cptLm6LzK6TVy5fRNJ75QkqMsoc0IWxb0MnKy39shM"
);

const hash = "$2b$10$jsj92bpABJFOomF5l/sMJOnVKxo.hrCLtDWQejspiiKs6THXLmhC.";

async function testRoles() {
  // First, delete previous test users
  await supabase.from("usuarios").delete().ilike("usuario_username", "test%");

  const roles = ["Admin", "Administrador", "admin", "Encargado", "encargado", "Colaborador", "colaborador"];
  for (const role of roles) {
    const { data, error } = await supabase.from("usuarios").insert([
      { usuario_dni: "99", usuario_nombres: "Test", usuario_rol: role, usuario_username: "test" + role, usuario_contrasena: hash },
    ]).select();
    console.log(`Role "${role}":`, error ? `❌ ${error.message}` : "✅ OK");
  }

  // Clean up
  await supabase.from("usuarios").delete().ilike("usuario_username", "test%");
}

testRoles().catch(console.error);
