import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://ernwvzifnfjpkpazfumb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVybnd2emlmbmZqcGtwYXpmdW1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUyMTU4MCwiZXhwIjoyMDk0MDk3NTgwfQ.9cptLm6LzK6TVy5fRNJ75QkqMsoc0IWxb0MnKy39shM"
);

const hash = "$2b$10$jsj92bpABJFOomF5l/sMJOnVKxo.hrCLtDWQejspiiKs6THXLmhC.";

async function main() {
  console.log("--- Cargando datos existentes ---\n");

  const { data: existingClientes } = await supabase.from("clientes").select("*");
  const { data: existingUsuarios } = await supabase.from("usuarios").select("*");
  const { data: existingAreas } = await supabase.from("areas").select("*");
  const { data: existingServicios } = await supabase.from("servicios").select("*");
  const { data: existingPlantillas } = await supabase.from("plantillas").select("*");

  console.log(`Clientes existentes: ${existingClientes?.length ?? 0}`);
  console.log(`Usuarios existentes: ${existingUsuarios?.length ?? 0}`);
  console.log(`Areas existentes: ${existingAreas?.length ?? 0}`);
  console.log(`Servicios existentes: ${existingServicios?.length ?? 0}`);
  console.log(`Plantillas existentes: ${existingPlantillas?.length ?? 0}`);

  const lastCode = existingServicios?.length
    ? Math.max(...existingServicios.map(function(s) {
        var m = s.servicio_codigo?.match(/SRV-(\d+)/);
        return m ? parseInt(m[1], 10) : 0;
      }))
    : 4;

  console.log(`\nÚltimo código SRV: SRV-${String(lastCode).padStart(3, "0")}`);

  // ==========================================
  // INSERT MORE CLIENTES
  // ==========================================
  const { data: newClientes } = await supabase.from("clientes").insert([
    { cliente_dni: "75678901", cliente_apellido_paterno: "Quispe", cliente_apellido_materno: "Huamán", cliente_nombres: "Roberto Carlos", cliente_telefono: "987654325" },
    { cliente_dni: "76789012", cliente_apellido_paterno: "Paredes", cliente_apellido_materno: "Mendoza", cliente_nombres: "Carmen Rosa", cliente_telefono: "987654326" },
    { cliente_dni: "77890123", cliente_apellido_paterno: "Rojas", cliente_apellido_materno: "Salazar", cliente_nombres: "Jorge Luis", cliente_telefono: "987654327" },
    { cliente_dni: "78901234", cliente_apellido_paterno: "Mendoza", cliente_apellido_materno: "Córdova", cliente_nombres: "Ana Patricia", cliente_telefono: "987654328" },
    { cliente_dni: "79012345", cliente_apellido_paterno: "Cárdenas", cliente_apellido_materno: "Pizarro", cliente_nombres: "Diego Armando", cliente_telefono: "987654329" },
    { cliente_dni: "70123456", cliente_apellido_paterno: "Huerta", cliente_apellido_materno: "Zambrano", cliente_nombres: "Rosa María", cliente_telefono: "987654330" },
  ]).select();
  console.log(`✅ ${newClientes.length} nuevos clientes insertados`);

  // ==========================================
  // INSERT MORE USUARIOS (técnicos)
  // ==========================================
  const { data: newUsuarios } = await supabase.from("usuarios").insert([
    { usuario_dni: "55667788", usuario_nombres: "Alex", usuario_apellido_paterno: "Sánchez", usuario_apellido_materno: "Torres", usuario_telefono: "999000004", usuario_correo: "alex.sanchez@sts.com", usuario_rol: "Colaborador", usuario_username: "asanchez01", usuario_contrasena: hash, usuario_activo: true, usuario_disponible: true },
    { usuario_dni: "66778899", usuario_nombres: "Diana", usuario_apellido_paterno: "Huamán", usuario_apellido_materno: "López", usuario_telefono: "999000005", usuario_correo: "diana.huaman@sts.com", usuario_rol: "Colaborador", usuario_username: "dhuaman01", usuario_contrasena: hash, usuario_activo: true, usuario_disponible: true },
    { usuario_dni: "77889900", usuario_nombres: "Miguel", usuario_apellido_paterno: "Ñaupari", usuario_apellido_materno: "Gutiérrez", usuario_telefono: "999000006", usuario_correo: "miguel.nau@sts.com", usuario_rol: "Colaborador", usuario_username: "mnau01", usuario_contrasena: hash, usuario_activo: true, usuario_disponible: true },
  ]).select();
  console.log(`✅ ${newUsuarios.length} nuevos usuarios insertados`);

  // Combine
  var allClientes = (existingClientes || []).concat(newClientes);
  var allUsuarios = (existingUsuarios || []).concat(newUsuarios);
  var allAreas = existingAreas || [];
  var allPlantillas = existingPlantillas || [];

  var adminId = null;
  var encargadoId = null;
  for (var i = 0; i < allUsuarios.length; i++) {
    var u = allUsuarios[i];
    if (u.usuario_rol === "Administrador") adminId = u.usuario_id;
    if (u.usuario_rol === "Encargado") encargadoId = u.usuario_id;
  }
  var tecnicos = allUsuarios.filter(function(u) {
    return u.usuario_rol === "Colaborador" || u.usuario_rol === "Encargado";
  });

  var a1 = null, a2 = null, a3 = null;
  for (var i = 0; i < allAreas.length; i++) {
    var a = allAreas[i];
    if (a.area_nombre === "Soporte Técnico") a1 = a.area_id;
    if (a.area_nombre === "Redes y Comunicaciones") a2 = a.area_id;
    if (a.area_nombre === "Software") a3 = a.area_id;
  }

  if (!adminId || !encargadoId || !a1 || !a2 || !a3) {
    console.error("Faltan datos base (admin, encargado, areas). Verifica que el seed original se haya ejecutado.");
    process.exit(1);
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function randomTecnico() { return pick(tecnicos).usuario_id; }

  // ==========================================
  // Area-Colaboradores for new techs
  // ==========================================
  var newTecUids = [];
  for (var i = 0; i < newUsuarios.length; i++) {
    if (newUsuarios[i].usuario_rol === "Colaborador") newTecUids.push(newUsuarios[i].usuario_id);
  }
  if (newTecUids.length > 0) {
    var acInserts = [];
    for (var i = 0; i < newTecUids.length; i++) {
      acInserts.push({ area_id: a1, colaborador_id: newTecUids[i], areacolaborador_es_principal: false });
      acInserts.push({ area_id: a2, colaborador_id: newTecUids[i], areacolaborador_es_principal: false });
    }
    await supabase.from("areacolaboradores").insert(acInserts);
    console.log(`✅ AreaColaboradores para ${newTecUids.length} nuevos técnicos`);
  }

  // ==========================================
  // 20 NEW SERVICES
  // ==========================================
  var today = new Date();
  function fmtDate(d) { return d.toISOString().split("T")[0]; }
  function subDays(n) { var d = new Date(today); d.setDate(d.getDate() - n); return d; }
  function addDays(d, n) { var r = new Date(d); r.setDate(r.getDate() + n); return r; }

  var codeCounter = lastCode;
  function nextCode() {
    codeCounter++;
    var padded = String(codeCounter).padStart(3, "0");
    return "SRV-" + padded;
  }

  var p0 = allPlantillas[0] ? allPlantillas[0].plantilla_id : null;
  var p1 = allPlantillas[1] ? allPlantillas[1].plantilla_id : null;
  var p2 = allPlantillas[2] ? allPlantillas[2].plantilla_id : null;
  var p3 = allPlantillas[3] ? allPlantillas[3].plantilla_id : null;

  var c4 = allClientes[4].cliente_id, c5 = allClientes[5].cliente_id;
  var c6 = allClientes[6].cliente_id, c7 = allClientes[7].cliente_id;
  var c8 = allClientes[8].cliente_id, c9 = allClientes[9].cliente_id;
  var c0 = allClientes[0].cliente_id, c1 = allClientes[1].cliente_id;
  var c2 = allClientes[2].cliente_id, c3 = allClientes[3].cliente_id;

  var t0 = tecnicos[0].usuario_id;
  var t1 = tecnicos[1] ? tecnicos[1].usuario_id : t0;
  var t2 = tecnicos[2] ? tecnicos[2].usuario_id : t0;
  var t3 = tecnicos[3] ? tecnicos[3].usuario_id : t0;
  var t4 = tecnicos[4] ? tecnicos[4].usuario_id : t0;

  var newServices = [
    // -- COMPLETADOS (7) --
    { servicio_codigo: nextCode(), cliente_id: c4, area_id: a1, tecnico_principal_id: t0, plantilla_id: p0,
      servicio_nombre: "Mantenimiento Desktop HP Elite", servicio_descripcion: "Limpieza interna, cambio de pasta térmica y diagnóstico de overheating",
      servicio_estado: "completado", servicio_fecha_inicio: fmtDate(subDays(14)), servicio_hora_inicio: "08:30",
      servicio_fecha_fin: fmtDate(subDays(13)), servicio_hora_fin: "16:00", servicio_tiempo_estimado: 480,
      servicio_descripcion_equipo: "Desktop HP EliteDesk 800", servicio_serie_equipo: "HP-ELT-001" },

    { servicio_codigo: nextCode(), cliente_id: c5, area_id: a3, tecnico_principal_id: t1, plantilla_id: p2,
      servicio_nombre: "Diagnóstico y Reparación Servidor", servicio_descripcion: "Falla en fuente de poder del servidor principal, reemplazo y pruebas de estrés",
      servicio_estado: "completado", servicio_fecha_inicio: fmtDate(subDays(12)), servicio_hora_inicio: "09:00",
      servicio_fecha_fin: fmtDate(subDays(10)), servicio_hora_fin: "18:00", servicio_tiempo_estimado: 720,
      servicio_descripcion_equipo: "Servidor Dell PowerEdge T340", servicio_serie_equipo: "DELL-SRV-443" },

    { servicio_codigo: nextCode(), cliente_id: c0, area_id: a2, tecnico_principal_id: t2, plantilla_id: p1,
      servicio_nombre: "Instalación Cables Estructurados", servicio_descripcion: "Cableado Cat6 para nueva oficina, 15 puntos de red y certificación",
      servicio_estado: "completado", servicio_fecha_inicio: fmtDate(subDays(9)), servicio_hora_inicio: "07:00",
      servicio_fecha_fin: fmtDate(subDays(7)), servicio_hora_fin: "17:00", servicio_tiempo_estimado: 960,
      servicio_descripcion_equipo: "Cableado estructurado", servicio_serie_equipo: "N/A" },

    { servicio_codigo: nextCode(), cliente_id: c6, area_id: a1, tecnico_principal_id: randomTecnico(), plantilla_id: p0,
      servicio_nombre: "Mantenimiento Laptop ASUS", servicio_descripcion: "Pantalla dañada por golpe, reemplazo de display y bisagras",
      servicio_estado: "completado", servicio_fecha_inicio: fmtDate(subDays(8)), servicio_hora_inicio: "10:00",
      servicio_fecha_fin: fmtDate(subDays(6)), servicio_hora_fin: "14:00", servicio_tiempo_estimado: 360,
      servicio_descripcion_equipo: "Laptop ASUS VivoBook 15", servicio_serie_equipo: "ASUS-VB-882" },

    { servicio_codigo: nextCode(), cliente_id: c1, area_id: a3, tecnico_principal_id: randomTecnico(), plantilla_id: p3,
      servicio_nombre: "Actualización ERP Contable", servicio_descripcion: "Migración de versión contable 2.1 a 3.0, respaldo de BD y pruebas",
      servicio_estado: "completado", servicio_fecha_inicio: fmtDate(subDays(6)), servicio_hora_inicio: "08:00",
      servicio_fecha_fin: fmtDate(subDays(4)), servicio_hora_fin: "16:30", servicio_tiempo_estimado: 540,
      servicio_descripcion_equipo: "Servidor Dell PowerEdge R240", servicio_serie_equipo: "DELL-R240-112" },

    { servicio_codigo: nextCode(), cliente_id: c7, area_id: a1, tecnico_principal_id: randomTecnico(), plantilla_id: null,
      servicio_nombre: "Reparación Fuente de Poder", servicio_descripcion: "Fuente quemada, reemplazo de capacitor y fusible, prueba de voltajes",
      servicio_estado: "completado", servicio_fecha_inicio: fmtDate(subDays(5)), servicio_hora_inicio: "11:00",
      servicio_fecha_fin: fmtDate(subDays(5)), servicio_hora_fin: "15:00", servicio_tiempo_estimado: 240,
      servicio_descripcion_equipo: "PC Gamer Armada", servicio_serie_equipo: "GAMER-556" },

    { servicio_codigo: nextCode(), cliente_id: c2, area_id: a2, tecnico_principal_id: randomTecnico(), plantilla_id: null,
      servicio_nombre: "Migración a Fibra Óptica", servicio_descripcion: "Cambio de cobre a fibra óptica, configuración de ONT y router",
      servicio_estado: "completado", servicio_fecha_inicio: fmtDate(subDays(4)), servicio_hora_inicio: "09:00",
      servicio_fecha_fin: fmtDate(subDays(3)), servicio_hora_fin: "13:00", servicio_tiempo_estimado: 300,
      servicio_descripcion_equipo: "Fibra óptica FTTH", servicio_serie_equipo: "N/A" },

    // -- EN_PROGRESO (5) --
    { servicio_codigo: nextCode(), cliente_id: c8, area_id: a1, tecnico_principal_id: randomTecnico(), plantilla_id: p2,
      servicio_nombre: "Reparación Laptop HP Pantalla", servicio_descripcion: "Pantalla no enciende, diagnóstico de flex y backlight",
      servicio_estado: "en_progreso", servicio_fecha_inicio: fmtDate(subDays(3)), servicio_hora_inicio: "08:30",
      servicio_tiempo_estimado: 480,
      servicio_descripcion_equipo: "Laptop HP Pavilion 14", servicio_serie_equipo: "HP-PAV-331" },

    { servicio_codigo: nextCode(), cliente_id: c3, area_id: a2, tecnico_principal_id: randomTecnico(), plantilla_id: p1,
      servicio_nombre: "Configuración VPN Corporativa", servicio_descripcion: "Implementación de túneles VPN site-to-site para sucursal",
      servicio_estado: "en_progreso", servicio_fecha_inicio: fmtDate(subDays(2)), servicio_hora_inicio: "10:00",
      servicio_tiempo_estimado: 360,
      servicio_descripcion_equipo: "Router MikroTik CCR1036", servicio_serie_equipo: "MIK-CCR-221" },

    { servicio_codigo: nextCode(), cliente_id: c9, area_id: a3, tecnico_principal_id: randomTecnico(), plantilla_id: p0,
      servicio_nombre: "Recuperación de Datos", servicio_descripcion: "Disco duro con bad sectors, clonación y recuperación",
      servicio_estado: "en_progreso", servicio_fecha_inicio: fmtDate(subDays(2)), servicio_hora_inicio: "14:00",
      servicio_tiempo_estimado: 540,
      servicio_descripcion_equipo: "Disco WD Blue 1TB", servicio_serie_equipo: "WD-1TB-889" },

    { servicio_codigo: nextCode(), cliente_id: c4, area_id: a1, tecnico_principal_id: randomTecnico(), plantilla_id: null,
      servicio_nombre: "Armado PC Estación Diseño", servicio_descripcion: "Armado de estación de trabajo para diseño gráfico",
      servicio_estado: "en_progreso", servicio_fecha_inicio: fmtDate(subDays(1)), servicio_hora_inicio: "09:00",
      servicio_tiempo_estimado: 600,
      servicio_descripcion_equipo: "PC personalizada", servicio_serie_equipo: "N/A" },

    { servicio_codigo: nextCode(), cliente_id: c5, area_id: a3, tecnico_principal_id: randomTecnico(), plantilla_id: null,
      servicio_nombre: "Instalación NAS Synology", servicio_descripcion: "Configuración de NAS Synology, RAID 5 y usuarios de red",
      servicio_estado: "en_progreso", servicio_fecha_inicio: fmtDate(subDays(1)), servicio_hora_inicio: "11:00",
      servicio_tiempo_estimado: 420,
      servicio_descripcion_equipo: "NAS Synology DS1522+", servicio_serie_equipo: "SYN-DS-552" },

    // -- PENDIENTES (5) --
    { servicio_codigo: nextCode(), cliente_id: c6, area_id: a1, tecnico_principal_id: randomTecnico(), plantilla_id: p0,
      servicio_nombre: "Mantenimiento Preventivo General", servicio_descripcion: "Revisión general de 10 equipos de cómputo en oficina principal",
      servicio_estado: "pendiente", servicio_fecha_inicio: fmtDate(addDays(today, 1)), servicio_hora_inicio: "08:00",
      servicio_tiempo_estimado: 960,
      servicio_descripcion_equipo: "Múltiples equipos", servicio_serie_equipo: "N/A" },

    { servicio_codigo: nextCode(), cliente_id: c7, area_id: a2, tecnico_principal_id: randomTecnico(), plantilla_id: p1,
      servicio_nombre: "Instalación Punto de Acceso", servicio_descripcion: "Instalación de AP Ubiquiti para mejorar cobertura en almacén",
      servicio_estado: "pendiente", servicio_fecha_inicio: fmtDate(addDays(today, 2)), servicio_hora_inicio: "09:00",
      servicio_tiempo_estimado: 240,
      servicio_descripcion_equipo: "Ubiquiti UniFi 6 Pro", servicio_serie_equipo: "UBQ-U6-774" },

    { servicio_codigo: nextCode(), cliente_id: c0, area_id: a3, tecnico_principal_id: randomTecnico(), plantilla_id: null,
      servicio_nombre: "Actualización Windows Server", servicio_descripcion: "Actualizar Windows Server 2016 a 2022 con migración de roles",
      servicio_estado: "pendiente", servicio_fecha_inicio: fmtDate(addDays(today, 3)), servicio_hora_inicio: "22:00",
      servicio_tiempo_estimado: 480,
      servicio_descripcion_equipo: "Servidor Dell PowerEdge T440", servicio_serie_equipo: "DELL-T440-998" },

    { servicio_codigo: nextCode(), cliente_id: c8, area_id: a1, tecnico_principal_id: randomTecnico(), plantilla_id: null,
      servicio_nombre: "Cambio de Teclado y Batería", servicio_descripcion: "Reemplazo de teclado y batería hinchada en laptop Lenovo",
      servicio_estado: "pendiente", servicio_fecha_inicio: fmtDate(addDays(today, 3)), servicio_hora_inicio: "10:00",
      servicio_tiempo_estimado: 180,
      servicio_descripcion_equipo: "Laptop Lenovo ThinkPad X1", servicio_serie_equipo: "LEN-TP-X1-441" },

    { servicio_codigo: nextCode(), cliente_id: c9, area_id: a2, tecnico_principal_id: randomTecnico(), plantilla_id: null,
      servicio_nombre: "Auditoría de Seguridad Red", servicio_descripcion: "Escaneo de vulnerabilidades, revisión de firewalls y hardening",
      servicio_estado: "pendiente", servicio_fecha_inicio: fmtDate(addDays(today, 5)), servicio_hora_inicio: "08:00",
      servicio_tiempo_estimado: 720,
      servicio_descripcion_equipo: "Infraestructura de red", servicio_serie_equipo: "N/A" },

    // -- BLOQUEADOS (3) --
    { servicio_codigo: nextCode(), cliente_id: c1, area_id: a1, tecnico_principal_id: randomTecnico(), plantilla_id: null,
      servicio_nombre: "Reparación Placa Madre", servicio_descripcion: "Placa madre con cortocircuito, pendiente de autorización para repuestos",
      servicio_estado: "bloqueado", servicio_fecha_inicio: fmtDate(subDays(7)), servicio_hora_inicio: "10:00",
      servicio_tiempo_estimado: 480,
      servicio_descripcion_equipo: "Desktop Lenovo ThinkCentre", servicio_serie_equipo: "LEN-TC-221" },

    { servicio_codigo: nextCode(), cliente_id: c2, area_id: a3, tecnico_principal_id: randomTecnico(), plantilla_id: null,
      servicio_nombre: "Migración Base de Datos SQL", servicio_descripcion: "Migración de SQL Server 2014 a 2019, cliente no entrega acceso",
      servicio_estado: "bloqueado", servicio_fecha_inicio: fmtDate(subDays(10)), servicio_hora_inicio: "09:00",
      servicio_tiempo_estimado: 600,
      servicio_descripcion_equipo: "Servidor BD EPSON", servicio_serie_equipo: "EPS-DB-771" },

    { servicio_codigo: nextCode(), cliente_id: c3, area_id: a1, tecnico_principal_id: randomTecnico(), plantilla_id: null,
      servicio_nombre: "Reparación Monitor LED", servicio_descripcion: "Monitor Samsung con líneas verticales, esperando controlador T-con",
      servicio_estado: "bloqueado", servicio_fecha_inicio: fmtDate(subDays(4)), servicio_hora_inicio: "15:00",
      servicio_tiempo_estimado: 120,
      servicio_descripcion_equipo: "Monitor Samsung 27\" LED", servicio_serie_equipo: "SAM-LED-663" },
  ];

  console.log(`Insertando ${newServices.length} nuevos servicios...`);
  const { data: insertedServicios, error: servError } = await supabase.from("servicios").insert(newServices).select();
  if (servError) { console.error("Error insertando servicios:", servError); process.exit(1); }
  console.log(`✅ ${insertedServicios.length} servicios insertados`);

  // ==========================================
  // SERVICIO COLABORADORES
  // ==========================================
  var scInserts = [];
  for (var i = 0; i < insertedServicios.length; i++) {
    var s = insertedServicios[i];
    var selectedTecs = new Set();
    selectedTecs.add(s.tecnico_principal_id);
    var numExtra = 1 + Math.round(Math.random());
    while (selectedTecs.size < numExtra + 1) {
      selectedTecs.add(randomTecnico());
    }
    var iter = selectedTecs.values();
    for (var j = 0; j < selectedTecs.size; j++) {
      scInserts.push({ servicio_id: s.servicio_id, colaborador_id: iter.next().value });
    }
  }
  await supabase.from("serviciocolaboradores").insert(scInserts);
  console.log(`✅ ${scInserts.length} relaciones servicio-colaborador insertadas`);

  // ==========================================
  // TAREAS
  // ==========================================
  var tareaTemplates = [
    ["Diagnóstico inicial", "Revisión de componentes", "Pruebas de funcionamiento", "Informe técnico"],
    ["Preparación del área", "Instalación física", "Configuración inicial", "Pruebas de aceptación"],
    ["Análisis de requisitos", "Ejecución de cambios", "Verificación de resultados", "Documentación"],
    ["Inspección visual", "Limpieza profunda", "Reemplazo de piezas", "Prueba final", "Entrega"],
  ];

  var tareasToInsert = [];
  for (var i = 0; i < insertedServicios.length; i++) {
    var s = insertedServicios[i];
    var template = pick(tareaTemplates);
    var isComplete = s.servicio_estado === "completado";
    var isInProgress = s.servicio_estado === "en_progreso";
    var isBlocked = s.servicio_estado === "bloqueado";

    for (var j = 0; j < template.length; j++) {
      var titulo = template[j];
      var tareaEstado = "pendiente";
      var tareaFechaCompletado = null;
      var tareaCompletadoPor = null;
      var tareaTiempoReal = null;

      if (isComplete) {
        tareaEstado = "completado";
        tareaFechaCompletado = s.servicio_fecha_fin;
        tareaCompletadoPor = s.tecnico_principal_id;
        tareaTiempoReal = Math.round((s.servicio_tiempo_estimado || 240) / template.length) + Math.floor(Math.random() * 30);
      } else if (isInProgress && j === 0) {
        tareaEstado = "completado";
        tareaFechaCompletado = s.servicio_fecha_inicio;
        tareaCompletadoPor = s.tecnico_principal_id;
        tareaTiempoReal = 30 + Math.floor(Math.random() * 60);
      } else if (isInProgress && j === 1) {
        tareaEstado = "en_progreso";
      } else if (isBlocked && j === 0) {
        tareaEstado = "completado";
        tareaFechaCompletado = s.servicio_fecha_inicio;
        tareaCompletadoPor = s.tecnico_principal_id;
        tareaTiempoReal = 45 + Math.floor(Math.random() * 30);
      }

      tareasToInsert.push({
        servicio_id: s.servicio_id,
        tarea_titulo: titulo,
        tarea_orden: j + 1,
        tarea_estado: tareaEstado,
        tarea_fecha_completado: tareaFechaCompletado,
        tarea_completado_por: tareaCompletadoPor,
        tarea_tiempo_real: tareaTiempoReal,
      });
    }
  }

  const { data: insertedTareas } = await supabase.from("tareas").insert(tareasToInsert).select();
  if (!insertedTareas) { console.error("Error insertando tareas"); process.exit(1); }
  console.log(`✅ ${insertedTareas.length} tareas insertadas`);

  // ==========================================
  // COMENTARIOS DE SERVICIO
  // ==========================================
  var servComentarios = [
    { estado: "completado", contenido: "Servicio completado satisfactoriamente. Cliente conforme con el resultado." },
    { estado: "completado", contenido: "Se realizaron todas las tareas programadas. Equipo funcionando al 100%." },
    { estado: "completado", contenido: "Reparación exitosa. Se entregó equipo con garantía de 30 días." },
    { estado: "en_progreso", contenido: "Se avanzó con el diagnóstico. Pendiente de autorización para continuar." },
    { estado: "en_progreso", contenido: "Técnico en campo realizando las pruebas correspondientes." },
    { estado: "bloqueado", contenido: "Servicio detenido. Cliente debe aprobar presupuesto para continuar." },
    { estado: "bloqueado", contenido: "Pendiente de llegada de repuestos. Se estima 3 días hábiles." },
    { estado: "bloqueado", contenido: "Cliente no entrega información necesaria para proceder." },
  ];

  var comInserts = [];
  for (var i = 0; i < insertedServicios.length; i++) {
    var s = insertedServicios[i];
    var matches = [];
    for (var j = 0; j < servComentarios.length; j++) {
      if (servComentarios[j].estado === s.servicio_estado) matches.push(servComentarios[j]);
    }
    if (matches.length > 0) {
      comInserts.push({
        servicio_id: s.servicio_id,
        usuario_id: s.tecnico_principal_id,
        serviciocomentario_contenido: pick(matches).contenido,
      });
    }
  }
  if (comInserts.length > 0) {
    await supabase.from("serviciocomentarios").insert(comInserts);
    console.log(`✅ ${comInserts.length} comentarios de servicio insertados`);
  }

  // ==========================================
  // COMENTARIOS DE TAREA
  // ==========================================
  var tareaComInserts = [];
  var completedTareasCount = 0;
  for (var i = 0; i < insertedTareas.length && completedTareasCount < 10; i++) {
    if (insertedTareas[i].tarea_estado === "completado") {
      tareaComInserts.push({
        tarea_id: insertedTareas[i].tarea_id,
        usuario_id: insertedTareas[i].tarea_completado_por,
        tareacomentario_contenido: "Tarea completada sin inconvenientes.",
      });
      completedTareasCount++;
    }
  }
  if (tareaComInserts.length > 0) {
    await supabase.from("tareacomentarios").insert(tareaComInserts);
    console.log(`✅ ${tareaComInserts.length} comentarios de tarea insertados`);
  }

  // ==========================================
  // CALIFICACIONES
  // ==========================================
  var califData = [
    { puntaje: 5, comentario: "Excelente servicio, muy profesionales.", sugerencia: "", observacion: "El técnico fue muy atento y explicó todo el proceso." },
    { puntaje: 4, comentario: "Buen servicio, pero demoró un poco más de lo esperado.", sugerencia: "Mejorar comunicación de tiempos", observacion: "Tuvimos que llamar varias veces para saber el estado." },
    { puntaje: 5, comentario: "Rápidos y eficientes. Recomendados.", sugerencia: "Nada, todo perfecto", observacion: "Dejaron todo limpio y ordenado después del trabajo." },
    { puntaje: 4, comentario: "Solucionaron el problema, volvería a contratarlos.", sugerencia: "Agendar con más anticipación", observacion: "El equipo usó protectores en los pisos, se agradece." },
    { puntaje: 3, comentario: "Cumplieron pero hubo algunos retrasos.", sugerencia: "Mejorar puntualidad", observacion: "Llegaron 2 horas después de lo acordado." },
  ];

  var califInserts = [];
  var completadosCount = 0;
  for (var i = 0; i < insertedServicios.length && completadosCount < 5; i++) {
    if (insertedServicios[i].servicio_estado === "completado") {
      var s = insertedServicios[i];
      var cal = califData[completadosCount];
      califInserts.push({
        servicio_id: s.servicio_id,
        cliente_id: s.cliente_id,
        calificacion_puntaje: cal.puntaje,
        calificacion_comentario: cal.comentario,
        calificacion_sugerencia: cal.sugerencia,
        calificacion_observacion: cal.observacion,
      });
      completadosCount++;
    }
  }
  if (califInserts.length > 0) {
    await supabase.from("calificaciones").insert(califInserts);
    console.log(`✅ ${califInserts.length} calificaciones insertadas`);
  }

  // ==========================================
  // SERVICIO HISTORIAL
  // ==========================================
  var histInserts = [];
  for (var i = 0; i < insertedServicios.length; i++) {
    var s = insertedServicios[i];
    if (s.servicio_estado !== "pendiente") {
      var firstState = s.servicio_estado === "bloqueado" ? "bloqueado" : "en_progreso";
      histInserts.push({
        servicio_id: s.servicio_id,
        serviciohistorial_estado_anterior: "pendiente",
        serviciohistorial_estado_nuevo: firstState,
        usuario_id: s.tecnico_principal_id,
      });
    }
    if (s.servicio_estado === "completado") {
      histInserts.push({
        servicio_id: s.servicio_id,
        serviciohistorial_estado_anterior: "en_progreso",
        serviciohistorial_estado_nuevo: "completado",
        usuario_id: s.tecnico_principal_id,
      });
    }
    if (s.servicio_estado === "bloqueado") {
      histInserts.push({
        servicio_id: s.servicio_id,
        serviciohistorial_estado_anterior: "en_progreso",
        serviciohistorial_estado_nuevo: "bloqueado",
        usuario_id: s.tecnico_principal_id,
      });
    }
  }
  if (histInserts.length > 0) {
    await supabase.from("serviciohistorial").insert(histInserts);
    console.log(`✅ ${histInserts.length} registros de historial insertados`);
  }

  // ==========================================
  // ANUNCIOS
  // ==========================================
  await supabase.from("anuncios").insert([
    { usuario_id: adminId, anuncio_titulo: "Mantenimiento programado - Servidores", anuncio_contenido: "Este sábado 16 de mayo se realizará mantenimiento a los servidores de 10:00 PM a 2:00 AM.", anuncio_activo: true },
    { usuario_id: adminId, anuncio_titulo: "Nuevo formato de informes", anuncio_contenido: "A partir del lunes usar el nuevo formato de informe técnico disponible en la carpeta compartida.", anuncio_activo: true },
    { usuario_id: encargadoId, anuncio_titulo: "Inventario de herramientas", anuncio_contenido: "Favor de realizar inventario de herramientas antes del viernes.", anuncio_activo: true },
  ]);
  console.log("✅ 3 nuevos anuncios insertados");

  // ==========================================
  // SOLICITUDES INTERNAS
  // ==========================================
  await supabase.from("solicitudesinternas").insert([
    { usuario_id: t1, solicitud_tipo: "herramienta", solicitud_descripcion: "Solicito kit de destornilladores de precisión para reparación de laptops", solicitud_estado: "pendiente" },
    { usuario_id: t2, solicitud_tipo: "capacitacion", solicitud_descripcion: "Solicito capacitación en configuración de firewalls Fortinet", solicitud_estado: "pendiente" },
    { usuario_id: t0, solicitud_tipo: "apoyo", solicitud_descripcion: "Necesito apoyo para instalación de cableado estructurado en piso 4", solicitud_estado: "en_proceso" },
  ]);
  console.log("✅ 3 nuevas solicitudes internas insertadas");

  // ==========================================
  // EVALUACIONES
  // ==========================================
  var evalInserts = [];
  var evalMonth = today.getMonth() + 1;
  var evalYear = today.getFullYear();
  var evalDay = Math.min(today.getDate(), 28);
  var evalDate = evalYear + "-" + String(evalMonth).padStart(2, "0") + "-" + String(evalDay).padStart(2, "0");

  for (var i = 0; i < newUsuarios.length; i++) {
    var completadas = 2 + Math.floor(Math.random() * 4);
    var asignadas = completadas + Math.floor(Math.random() * 2);
    var eficiencia = Math.round((completadas / asignadas) * 100);
    evalInserts.push({
      colaborador_id: newUsuarios[i].usuario_id,
      evaluacion_fecha: evalDate,
      evaluacion_tareas_completadas: completadas,
      evaluacion_tareas_asignadas: asignadas,
      evaluacion_eficiencia_porcentaje: eficiencia,
      evaluacion_tiempo_promedio_minutos: 40 + Math.floor(Math.random() * 40),
    });
  }
  if (evalInserts.length > 0) {
    await supabase.from("evaluacionesdesempeno").insert(evalInserts);
    console.log(`✅ ${evalInserts.length} evaluaciones insertadas`);
  }

  // ==========================================
  // INSTRUCCIONES
  // ==========================================
  await supabase.from("instrucciones").insert([
    { usuario_remitente_id: encargadoId, area_destino_id: a1, instruccion_contenido: "Dar prioridad a los servicios de mantenimiento preventivo esta semana." },
    { usuario_remitente_id: encargadoId, area_destino_id: a3, instruccion_contenido: "Actualizar todos los equipos con los parches de seguridad de mayo." },
  ]);
  console.log("✅ 2 nuevas instrucciones insertadas");

  // ==========================================
  // AUDITORIA
  // ==========================================
  var audInserts = [];
  for (var i = 0; i < Math.min(insertedServicios.length, 5); i++) {
    var s = insertedServicios[i];
    audInserts.push({
      usuario_id: s.tecnico_principal_id,
      auditoria_tabla: "Servicios",
      auditoria_registro_id: s.servicio_id,
      auditoria_accion: "INSERT",
      auditoria_detalle: JSON.stringify({ nuevo: { servicio_id: s.servicio_id, codigo: s.servicio_codigo, estado: s.servicio_estado } }),
    });
  }
  if (audInserts.length > 0) {
    await supabase.from("auditoria").insert(audInserts);
    console.log(`✅ ${audInserts.length} registros de auditoría insertados`);
  }

  // Summary
  console.log("\n═══════════════════════════════════════");
  console.log("🎉 SEED COMPLEMENTARIO COMPLETADO");
  console.log("═══════════════════════════════════════");
  console.log("Total servicios antes: " + (existingServicios?.length ?? 0));
  console.log("Total servicios agregados: " + insertedServicios.length);
  console.log("Total servicios ahora: " + ((existingServicios?.length ?? 0) + insertedServicios.length));
  console.log("Tareas agregadas: " + insertedTareas.length);
  console.log("Nuevos clientes: " + newClientes.length);
  console.log("Nuevos técnicos: " + newUsuarios.length);
  console.log("═══════════════════════════════════════\n");
}

main().catch(console.error);
