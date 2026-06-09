/**
 * dev.cjs — Entorno de desarrollo SGSST
 * 
 * Arranca PostgreSQL embebido + corre migraciones/seed + inicia el backend.
 * 
 * Uso: node dev.cjs
 *      node dev.cjs --no-seed    (salta el seed)
 *      node dev.cjs --no-migrate (salta migraciones)
 */

const EmbeddedPostgres = require('embedded-postgres').default;
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const PG_DIR = path.join(process.env.USERPROFILE, '.local', 'pg-sgsst');
const DB_NAME = 'sgsst';

async function main() {
  const args = process.argv.slice(2);
  const skipSeed = args.includes('--no-seed');
  const skipMigrate = args.includes('--no-migrate');

  // ── 1. Arrancar PostgreSQL ──
  console.log('\n[1/4] Iniciando PostgreSQL embebido...');
  const pg = new EmbeddedPostgres({
    databaseDir: path.join(PG_DIR, 'data'),
    binariesDir: path.join(PG_DIR, 'bin'),
    port: 5432,
    database: DB_NAME,
    user: 'postgres',
    password: 'postgres',
    persistent: true,
    logging: false,
  });

  // Inicializar si es primera vez
  if (!fs.existsSync(path.join(PG_DIR, 'data', 'PG_VERSION'))) {
    console.log('  → Primera vez: descargando e inicializando PostgreSQL...');
    await pg.initialise();
  }

  await pg.start();
  console.log('  ✓ PostgreSQL corriendo en localhost:5432');

  // Crear DB si no existe
  try {
    const client = pg.getPgClient();
    await client.connect();
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'`);
    if (res.rows.length === 0) {
      await pg.createDatabase(DB_NAME);
      console.log(`  ✓ Base de datos "${DB_NAME}" creada`);
    } else {
      console.log(`  ✓ Base de datos "${DB_NAME}" ya existe`);
    }
    await client.end();
  } catch (e) {
    // Si falla, intentar de todas formas
    console.log('  ⚠ No se pudo verificar DB:', e.message);
  }

  // ── 2. Migraciones ──
  if (!skipMigrate) {
    console.log('\n[2/4] Corriendo migraciones (drizzle-kit push)...');
    const migrate = spawn('npx', ['drizzle-kit', 'push'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_ENV: 'development' },
    });
    await new Promise((resolve, reject) => {
      migrate.on('close', (code) => {
        if (code === 0) {
          console.log('  ✓ Migraciones aplicadas');
          resolve();
        } else {
          console.log('  ⚠ Migraciones con código', code);
          resolve(); // seguir aunque falle
        }
      });
      migrate.on('error', reject);
    });
  } else {
    console.log('\n[2/4] Migraciones saltadas (--no-migrate)');
  }

  // ── 3. Seed ──
  if (!skipSeed) {
    console.log('\n[3/4] Sembrando datos iniciales...');
    const seed = spawn('npx', ['tsx', 'src/seeds/run.ts'], {
      stdio: 'inherit',
      shell: true,
    });
    await new Promise((resolve, reject) => {
      seed.on('close', (code) => {
        if (code === 0) {
          console.log('  ✓ Seed completado');
        } else {
          console.log('  ⚠ Seed con código', code);
        }
        resolve();
      });
      seed.on('error', reject);
    });
  } else {
    console.log('\n[3/4] Seed saltado (--no-seed)');
  }

  // ── 4. Backend ──
  console.log('\n[4/4] Iniciando backend Fastify...\n');
  const backend = spawn('npx', ['tsx', 'watch', 'src/app.ts'], {
    stdio: 'inherit',
    shell: true,
  });

  backend.on('close', async (code) => {
    console.log(`\nBackend finalizó con código ${code}. Deteniendo PostgreSQL...`);
    try { await pg.stop(); } catch {}
    process.exit(code || 0);
  });

  process.on('SIGINT', async () => {
    console.log('\nApagando...');
    backend.kill();
    try { await pg.stop(); } catch {}
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    backend.kill();
    try { await pg.stop(); } catch {}
    process.exit(0);
  });
}

main().catch((e) => {
  console.error('Error fatal:', e);
  process.exit(1);
});
