import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://ernwvzifnfjpkpazfumb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVybnd2emlmbmZqcGtwYXpmdW1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUyMTU4MCwiZXhwIjoyMDk0MDk3NTgwfQ.9cptLm6LzK6TVy5fRNJ75QkqMsoc0IWxb0MnKy39shM"
);

const hash = "$2b$10$jsj92bpABJFOomF5l/sMJOnVKxo.hrCLtDWQejspiiKs6THXLmhC.";

async function cleanAll() {
  const tables = [
    "evaluacionesdesempeno", "serviciohistorial", "auditoria", "instrucciones",
    "solicitudesinternas", "anuncios", "calificaciones", "serviciocomentarios",
    "tareacomentarios", "tareaasignaciones", "tareas", "serviciocolaboradores",
    "servicios", "plantillatareas", "plantillas", "areacolaboradores",
    "areas", "usuarios", "clientes"
  ];
  for (const t of tables) {
    await supabase.from(t).delete().neq("true", "true").catch(() => {});
    // Use the approach that actually works: delete all by selecting and deleting
  }
  console.log("✅ Cleaned all tables");
}

async function seed() {
  console.log("--- Seeding database ---\n");

  // Clean all tables in reverse dependency order using raw approach
  // Use individual deletes
  const tablesReverse = [
    "evaluacionesdesempeno", "serviciohistorial", "auditoria", "instrucciones",
    "solicitudesinternas", "anuncios", "calificaciones", "serviciocomentarios",
    "tareacomentarios", "tareaasignaciones", "tareas", "serviciocolaboradores",
    "servicios", "plantillatareas", "plantillas", "areacolaboradores",
    "areas", "usuarios", "clientes"
  ];
  for (const t of tablesReverse) {
    const { data } = await supabase.from(t).select("*");
    if (data && data.length > 0) {
      const ids = data.map((r) => r[Object.keys(r)[0]]);
      for (const id of ids) {
        await supabase.from(t).delete().eq(Object.keys(data[0])[0], id);
      }
    }
  }
  console.log("✅ All tables cleaned");

  // === CLIENTES ===
  const { data: clientes } = await supabase.from("clientes").insert([
    { cliente_dni: "71234567", cliente_apellido_paterno: "García", cliente_apellido_materno: "Pérez", cliente_nombres: "Juan Carlos", cliente_telefono: "987654321" },
    { cliente_dni: "72345678", cliente_apellido_paterno: "López", cliente_apellido_materno: "Ramírez", cliente_nombres: "María Elena", cliente_telefono: "987654322" },
    { cliente_dni: "73456789", cliente_apellido_paterno: "Torres", cliente_apellido_materno: "Vega", cliente_nombres: "Pedro Miguel", cliente_telefono: "987654323" },
    { cliente_dni: "74567890", cliente_apellido_paterno: "Castillo", cliente_apellido_materno: "Mora", cliente_nombres: "Lucía Fernanda", cliente_telefono: "987654324" },
  ]).select();
  console.log("✅ Clientes insertados");

  // === USUARIOS ===
  const { data: usuarios } = await supabase.from("usuarios").insert([
    { usuario_dni: "76055638", usuario_nombres: "Luciana Xiomara", usuario_apellido_paterno: "Chuquitucto", usuario_apellido_materno: "Muñoz", usuario_telefono: "972404972", usuario_correo: "luciana@sts.com", usuario_rol: "Administrador", usuario_username: "lucchuq01", usuario_contrasena: hash, usuario_activo: true, usuario_disponible: true },
    { usuario_dni: "87654321", usuario_nombres: "Carlos", usuario_apellido_paterno: "López", usuario_apellido_materno: "Martínez", usuario_telefono: "999000001", usuario_correo: "carlos.lopez@sts.com", usuario_rol: "Encargado", usuario_username: "clopez01", usuario_contrasena: hash, usuario_activo: true, usuario_disponible: true },
    { usuario_dni: "11223344", usuario_nombres: "Pedro", usuario_apellido_paterno: "Torres", usuario_apellido_materno: "Ríos", usuario_telefono: "999000002", usuario_correo: "pedro.torres@sts.com", usuario_rol: "Colaborador", usuario_username: "ptorres01", usuario_contrasena: hash, usuario_activo: true, usuario_disponible: true },
    { usuario_dni: "99887766", usuario_nombres: "María", usuario_apellido_paterno: "Gómez", usuario_apellido_materno: "Luna", usuario_telefono: "999000003", usuario_correo: "maria.gomez@sts.com", usuario_rol: "Colaborador", usuario_username: "mgomez01", usuario_contrasena: hash, usuario_activo: true, usuario_disponible: true },
  ]).select();
  console.log("✅ Usuarios insertados");

  const c1 = clientes[0].cliente_id, c2 = clientes[1].cliente_id, c3 = clientes[2].cliente_id, c4 = clientes[3].cliente_id;
  const u1 = usuarios[0].usuario_id, u2 = usuarios[1].usuario_id, u3 = usuarios[2].usuario_id, u4 = usuarios[3].usuario_id;

  // === AREAS ===
  const { data: areas } = await supabase.from("areas").insert([
    { area_nombre: "Soporte Técnico", area_descripcion: "Mantenimiento y reparación de equipos", area_encargado_id: u2 },
    { area_nombre: "Redes y Comunicaciones", area_descripcion: "Instalación y configuración de redes", area_encargado_id: u2 },
    { area_nombre: "Software", area_descripcion: "Soporte de software y sistemas", area_encargado_id: u2 },
  ]).select();
  console.log("✅ Areas insertadas");
  const a1 = areas[0].area_id, a2 = areas[1].area_id, a3 = areas[2].area_id;

  // === AREA COLABORADORES ===
  await supabase.from("areacolaboradores").insert([
    { area_id: a1, colaborador_id: u3, areacolaborador_es_principal: true },
    { area_id: a1, colaborador_id: u4, areacolaborador_es_principal: false },
    { area_id: a2, colaborador_id: u4, areacolaborador_es_principal: true },
    { area_id: a3, colaborador_id: u3, areacolaborador_es_principal: false },
  ]);
  console.log("✅ AreaColaboradores insertados");

  // === PLANTILLAS ===
  const { data: plantillas } = await supabase.from("plantillas").insert([
    { plantilla_nombre: "Mantenimiento Preventivo", plantilla_descripcion: "Inspección, limpieza y pruebas de equipos", plantilla_activa: true },
    { plantilla_nombre: "Instalación de Equipos", plantilla_descripcion: "Instalación física, configuración y pruebas", plantilla_activa: true },
    { plantilla_nombre: "Diagnóstico y Reparación", plantilla_descripcion: "Diagnóstico, cotización y reparación", plantilla_activa: true },
    { plantilla_nombre: "Calibración", plantilla_descripcion: "Calibración de instrumentos de medición", plantilla_activa: true },
  ]).select();
  console.log("✅ Plantillas insertadas");
  const p1 = plantillas[0].plantilla_id, p2 = plantillas[1].plantilla_id, p3 = plantillas[2].plantilla_id, p4 = plantillas[3].plantilla_id;

  // === PLANTILLA TAREAS ===
  await supabase.from("plantillatareas").insert([
    { plantilla_id: p1, plantillatarea_titulo: "Inspección inicial de equipos", plantillatarea_orden: 1 },
    { plantilla_id: p1, plantillatarea_titulo: "Limpieza de componentes", plantillatarea_orden: 2 },
    { plantilla_id: p1, plantillatarea_titulo: "Verificación de conexiones", plantillatarea_orden: 3 },
    { plantilla_id: p1, plantillatarea_titulo: "Pruebas de funcionamiento", plantillatarea_orden: 4 },
    { plantilla_id: p1, plantillatarea_titulo: "Informe técnico", plantillatarea_orden: 5 },
    { plantilla_id: p2, plantillatarea_titulo: "Recepción y verificación de equipos", plantillatarea_orden: 1 },
    { plantilla_id: p2, plantillatarea_titulo: "Preparación del área", plantillatarea_orden: 2 },
    { plantilla_id: p2, plantillatarea_titulo: "Instalación física", plantillatarea_orden: 3 },
    { plantilla_id: p2, plantillatarea_titulo: "Configuración y puesta en marcha", plantillatarea_orden: 4 },
    { plantilla_id: p2, plantillatarea_titulo: "Pruebas de aceptación", plantillatarea_orden: 5 },
    { plantilla_id: p3, plantillatarea_titulo: "Diagnóstico inicial", plantillatarea_orden: 1 },
    { plantilla_id: p3, plantillatarea_titulo: "Identificación de falla", plantillatarea_orden: 2 },
    { plantilla_id: p3, plantillatarea_titulo: "Reparación / Reemplazo", plantillatarea_orden: 3 },
    { plantilla_id: p3, plantillatarea_titulo: "Prueba post-reparación", plantillatarea_orden: 4 },
    { plantilla_id: p3, plantillatarea_titulo: "Entrega al cliente", plantillatarea_orden: 5 },
    { plantilla_id: p4, plantillatarea_titulo: "Recepción de instrumentos", plantillatarea_orden: 1 },
    { plantilla_id: p4, plantillatarea_titulo: "Verificación pre-calibración", plantillatarea_orden: 2 },
    { plantilla_id: p4, plantillatarea_titulo: "Proceso de calibración", plantillatarea_orden: 3 },
    { plantilla_id: p4, plantillatarea_titulo: "Verificación post-calibración", plantillatarea_orden: 4 },
    { plantilla_id: p4, plantillatarea_titulo: "Emisión de certificados", plantillatarea_orden: 5 },
  ]);
  console.log("✅ PlantillaTareas insertadas");

  // === SERVICIOS ===
  const { data: servicios } = await supabase.from("servicios").insert([
    { cliente_id: c1, area_id: a1, tecnico_principal_id: u3, plantilla_id: p1, servicio_codigo: "SRV-001", servicio_nombre: "Mantenimiento Laptop Lenovo", servicio_descripcion: "Cambio de batería y revisión de placa para Laptop Lenovo ThinkPad", servicio_estado: "completado", servicio_fecha_inicio: "2026-05-01", servicio_hora_inicio: "09:00", servicio_fecha_fin: "2026-05-02", servicio_hora_fin: "15:00", servicio_tiempo_estimado: 480, servicio_descripcion_equipo: "Laptop Lenovo ThinkPad", servicio_serie_equipo: "SN123456" },
    { cliente_id: c2, area_id: a2, tecnico_principal_id: u3, plantilla_id: p3, servicio_codigo: "SRV-002", servicio_nombre: "Configuración de Red", servicio_descripcion: "Evaluación de interferencias y configuración de red inalámbrica", servicio_estado: "en_progreso", servicio_fecha_inicio: "2026-05-03", servicio_hora_inicio: "10:30", servicio_tiempo_estimado: 240, servicio_descripcion_equipo: "Router Cisco", servicio_serie_equipo: "RT-78901" },
    { cliente_id: c3, area_id: a3, tecnico_principal_id: u4, plantilla_id: p2, servicio_codigo: "SRV-003", servicio_nombre: "Instalación SO y Drivers", servicio_descripcion: "Instalación de sistema operativo Windows 11 y drivers actualizados", servicio_estado: "pendiente", servicio_fecha_inicio: "2026-05-05", servicio_hora_inicio: "08:00", servicio_tiempo_estimado: 180, servicio_descripcion_equipo: "Desktop HP Pavilion", servicio_serie_equipo: "DP-45678" },
    { cliente_id: c1, area_id: a1, tecnico_principal_id: u3, servicio_codigo: "SRV-004", servicio_nombre: "Cancelación - Revisión de PC", servicio_descripcion: "Cliente canceló el servicio de revisión general", servicio_estado: "bloqueado", servicio_fecha_inicio: "2026-05-04", servicio_hora_inicio: "11:00", servicio_descripcion_equipo: "PC Armada", servicio_serie_equipo: "PC-99999" },
  ]).select();
  console.log("✅ Servicios insertados");

  const s1 = servicios[0].servicio_id, s2 = servicios[1].servicio_id, s3 = servicios[2].servicio_id, s4 = servicios[3].servicio_id;

  // === SERVICIO COLABORADORES ===
  await supabase.from("serviciocolaboradores").insert([
    { servicio_id: s1, colaborador_id: u3 },
    { servicio_id: s1, colaborador_id: u4 },
    { servicio_id: s2, colaborador_id: u3 },
    { servicio_id: s3, colaborador_id: u4 },
  ]);
  console.log("✅ ServicioColaboradores insertados");

  // === TAREAS ===
  const { data: tareasS1 } = await supabase.from("tareas").insert([
    { servicio_id: s1, tarea_titulo: "Inspección inicial de equipos", tarea_orden: 1, tarea_estado: "completado", tarea_fecha_completado: "2026-05-01", tarea_hora_completado: "09:30", tarea_completado_por: u3, tarea_tiempo_real: 30 },
    { servicio_id: s1, tarea_titulo: "Desmontaje y revisión de componentes", tarea_orden: 2, tarea_estado: "completado", tarea_fecha_completado: "2026-05-01", tarea_hora_completado: "11:00", tarea_completado_por: u3, tarea_tiempo_real: 90 },
    { servicio_id: s1, tarea_titulo: "Reemplazo de batería", tarea_orden: 3, tarea_estado: "completado", tarea_fecha_completado: "2026-05-01", tarea_hora_completado: "14:00", tarea_completado_por: u4, tarea_tiempo_real: 60 },
    { servicio_id: s1, tarea_titulo: "Pruebas de funcionamiento", tarea_orden: 4, tarea_estado: "completado", tarea_fecha_completado: "2026-05-02", tarea_hora_completado: "10:00", tarea_completado_por: u3, tarea_tiempo_real: 45 },
    { servicio_id: s1, tarea_titulo: "Informe final y entrega", tarea_orden: 5, tarea_estado: "completado", tarea_fecha_completado: "2026-05-02", tarea_hora_completado: "15:00", tarea_completado_por: u4, tarea_tiempo_real: 30 },
  ]).select();

  const { data: tareasS2 } = await supabase.from("tareas").insert([
    { servicio_id: s2, tarea_titulo: "Diagnóstico de interferencias", tarea_orden: 1, tarea_estado: "completado", tarea_fecha_completado: "2026-05-03", tarea_hora_completado: "11:00", tarea_completado_por: u3, tarea_tiempo_real: 60 },
    { servicio_id: s2, tarea_titulo: "Análisis de configuración actual", tarea_orden: 2, tarea_estado: "completado", tarea_fecha_completado: "2026-05-03", tarea_hora_completado: "14:00", tarea_completado_por: u3, tarea_tiempo_real: 45 },
    { servicio_id: s2, tarea_titulo: "Reconfiguración de equipos", tarea_orden: 3, tarea_estado: "en_progreso" },
    { servicio_id: s2, tarea_titulo: "Pruebas de conectividad", tarea_orden: 4, tarea_estado: "pendiente" },
    { servicio_id: s2, tarea_titulo: "Entrega de informe", tarea_orden: 5, tarea_estado: "pendiente" },
  ]).select();

  await supabase.from("tareas").insert([
    { servicio_id: s3, tarea_titulo: "Revisión de requisitos del sistema", tarea_orden: 1, tarea_estado: "pendiente" },
    { servicio_id: s3, tarea_titulo: "Backup de datos existentes", tarea_orden: 2, tarea_estado: "pendiente" },
    { servicio_id: s3, tarea_titulo: "Instalación de SO", tarea_orden: 3, tarea_estado: "pendiente" },
    { servicio_id: s3, tarea_titulo: "Instalación de drivers", tarea_orden: 4, tarea_estado: "pendiente" },
    { servicio_id: s3, tarea_titulo: "Actualización de seguridad", tarea_orden: 5, tarea_estado: "pendiente" },
    { servicio_id: s3, tarea_titulo: "Entrega al cliente", tarea_orden: 6, tarea_estado: "pendiente" },
  ]);

  await supabase.from("tareas").insert([
    { servicio_id: s4, tarea_titulo: "Revisión inicial", tarea_orden: 1, tarea_estado: "pendiente" },
  ]);
  console.log("✅ Tareas insertadas");

  // === COMMENTS ===
  await supabase.from("tareacomentarios").insert([
    { tarea_id: tareasS1[0].tarea_id, usuario_id: u3, tareacomentario_contenido: "Se detectaron capacitores con signos de desgaste. Recomiendo revisión adicional." },
  ]);

  await supabase.from("serviciocomentarios").insert([
    { servicio_id: s1, usuario_id: u3, serviciocomentario_contenido: "Servicio completado exitosamente. Cliente satisfecho con el resultado." },
    { servicio_id: s2, usuario_id: u3, serviciocomentario_contenido: "Se necesita autorización para continuar con la reconfiguración del router central." },
  ]);
  console.log("✅ Comentarios insertados");

  // === CALIFICACIONES ===
  await supabase.from("calificaciones").insert([
    { servicio_id: s1, cliente_id: c1, calificacion_puntaje: 5, calificacion_comentario: "Excelente servicio, rápido y eficiente.", calificacion_sugerencia: "Agregar opción de seguimiento en tiempo real vía WhatsApp", calificacion_observacion: "El técnico llegó temprano y terminó antes de lo previsto." },
  ]);
  console.log("✅ Calificaciones insertadas");

  // === ANUNCIOS ===
  await supabase.from("anuncios").insert([
    { usuario_id: u1, anuncio_titulo: "Reunión semanal de equipo", anuncio_contenido: "Se convoca a reunión todos los viernes a las 4:00 PM en sala de conferencias.", anuncio_activo: true },
    { usuario_id: u1, anuncio_titulo: "Nuevos EPP disponibles", anuncio_contenido: "Equipos de protección personal disponibles en almacén. Pasar a recoger.", anuncio_activo: true },
  ]);

  // === SOLICITUDES ===
  await supabase.from("solicitudesinternas").insert([
    { usuario_id: u3, solicitud_tipo: "herramienta", solicitud_descripcion: "Solicito multímetro digital para calibración de equipos", solicitud_estado: "pendiente" },
    { usuario_id: u4, solicitud_tipo: "apoyo", solicitud_descripcion: "Necesito apoyo para instalación de servidor en cliente Minera del Sur", solicitud_estado: "en_proceso" },
  ]);

  // === INSTRUCCIONES ===
  await supabase.from("instrucciones").insert([
    { usuario_remitente_id: u1, area_destino_id: a1, instruccion_contenido: "Priorizar servicios de clientes con contrato premium esta semana." },
    { usuario_remitente_id: u1, area_destino_id: a2, instruccion_contenido: "Actualizar inventario de equipos de red antes del viernes." },
  ]);

  // === AUDITORIA ===
  await supabase.from("auditoria").insert([
    { usuario_id: u3, auditoria_tabla: "Tareas", auditoria_registro_id: tareasS1[0].tarea_id, auditoria_accion: "INSERT", auditoria_detalle: '{"nuevo":{"tarea_id":' + tareasS1[0].tarea_id + ',"titulo":"Inspección inicial","estado":"pendiente"}}' },
    { usuario_id: u3, auditoria_tabla: "Tareas", auditoria_registro_id: tareasS1[0].tarea_id, auditoria_accion: "UPDATE", auditoria_detalle: '{"anterior":{"estado":"pendiente"},"nuevo":{"estado":"completado"}}' },
  ]);

  // === SERVICIO HISTORIAL ===
  await supabase.from("serviciohistorial").insert([
    { servicio_id: s1, serviciohistorial_estado_anterior: "pendiente", serviciohistorial_estado_nuevo: "en_progreso", usuario_id: u3 },
    { servicio_id: s1, serviciohistorial_estado_nuevo: "completado", serviciohistorial_estado_anterior: "en_progreso", usuario_id: u3 },
    { servicio_id: s2, serviciohistorial_estado_nuevo: "en_progreso", serviciohistorial_estado_anterior: "pendiente", usuario_id: u3 },
  ]);

  // === EVALUACIONES ===
  await supabase.from("evaluacionesdesempeno").insert([
    { colaborador_id: u3, evaluacion_fecha: "2026-05-11", evaluacion_tareas_completadas: 5, evaluacion_tareas_asignadas: 5, evaluacion_eficiencia_porcentaje: 100.00, evaluacion_tiempo_promedio_minutos: 55.00 },
    { colaborador_id: u4, evaluacion_fecha: "2026-05-11", evaluacion_tareas_completadas: 3, evaluacion_tareas_asignadas: 4, evaluacion_eficiencia_porcentaje: 75.00, evaluacion_tiempo_promedio_minutos: 45.00 },
  ]);
  
  console.log("\n🎉 SEED COMPLETADO EXITOSAMENTE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Usuarios (contraseña: 12345678):");
  console.log("  lucchuq01 - Administrador");
  console.log("  clopez01  - Encargado");
  console.log("  ptorres01 - Colaborador");
  console.log("  mgomez01  - Colaborador");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Servicios: SRV-001 a SRV-004");
  console.log("Plantillas: 4 con tareas");
}

seed().catch(console.error);
