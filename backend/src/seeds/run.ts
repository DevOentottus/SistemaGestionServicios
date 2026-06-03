import "dotenv/config";
import bcrypt from "bcryptjs";
import { db, schema } from "@/db/connection.js";

async function seed() {
  console.log("🌱 Iniciando seed...");

  // ── Crear usuario Admin Sistema ──
  const passwordHash = bcrypt.hashSync("admin123", 10);

  const [adminSistema] = await db
    .insert(schema.usuarios)
    .values({
      usuario_username: "admin.sistema",
      usuario_contrasena: passwordHash,
      usuario_rol: "sistema",
      usuario_nombres: "Admin",
      usuario_apellido_paterno: "Sistema",
      usuario_activo: true,
    })
    .onConflictDoNothing({ target: schema.usuarios.usuario_username })
    .returning();

  if (adminSistema) {
    console.log(`✅ Admin Sistema creado: ${adminSistema.usuario_username}`);
  } else {
    console.log("ℹ️ Admin Sistema ya existe");
  }

  // ── Crear usuario Administrador de Negocio ──
  const [adminNegocio] = await db
    .insert(schema.usuarios)
    .values({
      usuario_username: "admin",
      usuario_contrasena: passwordHash,
      usuario_rol: "administrador",
      usuario_nombres: "Administrador",
      usuario_apellido_paterno: "Negocio",
      usuario_activo: true,
    })
    .onConflictDoNothing({ target: schema.usuarios.usuario_username })
    .returning();

  if (adminNegocio) {
    console.log(`✅ Admin Negocio creado: ${adminNegocio.usuario_username}`);
  }

  // ── Crear área de ejemplo ──
  const [area] = await db
    .insert(schema.areas)
    .values({
      area_nombre: "Soporte Técnico",
    })
    .onConflictDoNothing({ target: schema.areas.area_nombre })
    .returning();

  if (area) {
    console.log(`✅ Área creada: ${area.area_nombre}`);
  }

  console.log("🌱 Seed completado.");
  console.log("\n📋 Credenciales por defecto:");
  console.log("   Admin Sistema: admin.sistema / admin123");
  console.log("   Admin Negocio: admin / admin123");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Error en seed:", err);
  process.exit(1);
});
