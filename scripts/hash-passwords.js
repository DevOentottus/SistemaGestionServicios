/**
 * hash-passwords.js
 *
 * Migra contraseñas de texto plano a bcrypt hash en la tabla `usuarios`.
 *
 * Uso:
 *   1. Configurar VITE_SUPABASE_URL y VITE_SUPABASE_SERVICE_KEY en .env
 *   2. node scripts/hash-passwords.js
 *
 * Requiere la SERVICE_ROLE key de Supabase (no la anon key)
 * para poder ACTUALIZAR la tabla usuarios.
 * La encuentras en: Supabase Dashboard → Settings → API → service_role key
 */

const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(`
  ⚠️  Faltan variables de entorno.

  Agregá a tu .env:
    VITE_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...

  La SERVICE_KEY está en: Supabase Dashboard → Settings → API → service_role key
  `);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function hashPasswords() {
  console.log("🔍 Leyendo usuarios...");

  const { data: usuarios, error } = await supabase
    .from("usuarios")
    .select("usuario_id, usuario_username, usuario_contrasena");

  if (error) {
    console.error("Error al leer usuarios:", error.message);
    process.exit(1);
  }

  if (!usuarios || usuarios.length === 0) {
    console.log("ℹ️  No hay usuarios para migrar.");
    return;
  }

  let hasheados = 0;
  let omitidos = 0;

  for (const usuario of usuarios) {
    const pass = usuario.usuario_contrasena;

    // Si ya es un hash bcrypt, lo omitimos
    if (pass && (pass.startsWith("$2a$") || pass.startsWith("$2b$") || pass.startsWith("$2y$"))) {
      console.log(`  ⏭️  ${usuario.usuario_username} — ya está hasheado`);
      omitidos++;
      continue;
    }

    if (!pass) {
      console.log(`  ⏭️  ${usuario.usuario_username} — sin contraseña`);
      omitidos++;
      continue;
    }

    // Generar hash bcrypt
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(pass, salt);

    const { error: updateError } = await supabase
      .from("usuarios")
      .update({ usuario_contrasena: hash })
      .eq("usuario_id", usuario.usuario_id);

    if (updateError) {
      console.error(`  ❌ ${usuario.usuario_username} — error: ${updateError.message}`);
    } else {
      console.log(`  ✅ ${usuario.usuario_username} — texto plano → bcrypt`);
      hasheados++;
    }
  }

  console.log(`\n📊 Resumen:`);
  console.log(`   Hasheados: ${hasheados}`);
  console.log(`   Omitidos:  ${omitidos}`);
  console.log(`   Total:     ${usuarios.length}`);
}

hashPasswords().catch(console.error);
