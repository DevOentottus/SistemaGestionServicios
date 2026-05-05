// ============ Modelo de Datos Unificado ============

export type Role = "Administrador" | "Encargado" | "Colaborador" | "Cliente";

export interface Collaborator {
  id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  correo: string;
  idInterno: string;
  username: string;
  area: string;
  areaSecundaria?: string;
  rol: Role;
  activo: boolean;
  esEncargadoPrincipal?: boolean;
  esEncargadoSecundario?: boolean;
}

export interface Area {
  id: string;
  nombre: string;
  encargado: string;
  colaboradores: string[];
  descripcion: string;
}

export interface TaskNote {
  id: string;
  autor: string;
  rol: string;
  texto: string;
  tipo: "instruccion" | "comentario" | "observacion";
  fecha: string;
}

export interface Task {
  id: string;
  nombre: string;
  completada: boolean;
  fechaCompletada?: string;
  responsable?: string;
  orden: number;
  notas?: TaskNote[];
}

export interface ServiceTemplate {
  id: string;
  nombre: string;
  descripcion: string;
  area: string;
  tareas: string[];
  activo: boolean;
  fechaCreacion: string;
}

export interface Comment {
  id: string;
  autor: string;
  rol?: string;
  texto: string;
  fecha: string;
}

export interface Service {
  id: string;
  codigo: string;
  cliente: string;
  telefonoCliente?: string;
  descripcion: string;
  area: string;
  tecnicos: string[];
  fechaInicio: string;
  horaInicio?: string;
  fechaFin?: string;
  horaFin?: string;
  horaEstimadaFin?: string;      // formato "HH:MM"
  inicioReal?: string;
  estado: "Pendiente" | "En progreso" | "Completado" | "Bloqueado";
  tareas: Task[];
  comentarios: Comment[];
  progreso: number;
}

export interface Announcement {
  id: string;
  titulo: string;
  contenido: string;
  autor: string;
  fecha: string;
  tipo: "global" | "area";
  areaDestino?: string;
}

export interface InternalRequest {
  id: string;
  tipo: "apoyo" | "herramienta" | "instruccion";
  solicitante: string;
  destinatario: string;
  contenido: string;
  fecha: string;
  estado: "pendiente" | "atendido";
}

export interface AuditLog {
  id: string;
  usuario: string;
  accion: string;
  modulo: string;
  detalle: string;
  fecha: string;
}

// ============ Inserción de registros ============

// ============ COLABORADORES ============
export const colaboradores: Collaborator[] = [
  { id: "c1", dni: "74521896", nombres: "Pedro", apellidos: "Torres Vega", telefono: "987654321", correo: "ptorres@techservice.com", idInterno: "EMP-001", username: "ptorres01", area: "Electrónica", rol: "Colaborador", activo: true },
  { id: "c2", dni: "85632147", nombres: "Lucía", apellidos: "Castillo Mora", telefono: "987123456", correo: "lcastillo@techservice.com", idInterno: "EMP-002", username: "lcastillo01", area: "Mecánica", rol: "Colaborador", activo: true },
  { id: "c3", dni: "96325874", nombres: "Roberto", apellidos: "García Ruiz", telefono: "945678321", correo: "rgarcia@techservice.com", idInterno: "EMP-003", username: "rgarcia01", area: "Software", rol: "Colaborador", activo: true },
  { id: "c4", dni: "12365478", nombres: "Sandra", apellidos: "Vargas López", telefono: "978456123", correo: "svargas@techservice.com", idInterno: "EMP-004", username: "svargas01", area: "Electrónica", areaSecundaria: "Software", rol: "Colaborador", activo: true },
  { id: "c5", dni: "65478912", nombres: "Miguel", apellidos: "Fernández Ríos", telefono: "965412378", correo: "mfernandez@techservice.com", idInterno: "EMP-005", username: "mfernandez01", area: "Mecánica", rol: "Colaborador", activo: false },
  { id: "c6", dni: "32145698", nombres: "Juan", apellidos: "López Sánchez", telefono: "987654000", correo: "jlopez@techservice.com", idInterno: "EMP-006", username: "jlopez01", area: "Electrónica", rol: "Encargado", activo: true, esEncargadoPrincipal: true },
  { id: "c7", dni: "78945612", nombres: "María", apellidos: "Ramírez Castro", telefono: "956321478", correo: "mramirez@techservice.com", idInterno: "EMP-007", username: "mramirez01", area: "Mecánica", areaSecundaria: "Electrónica", rol: "Encargado", activo: true, esEncargadoPrincipal: true, esEncargadoSecundario: false },
  { id: "c8", dni: "45612378", nombres: "Carlos", apellidos: "Herrera Luna", telefono: "912345678", correo: "cherrera@techservice.com", idInterno: "EMP-008", username: "cherrera01", area: "Software", rol: "Colaborador", activo: true },
];

// ============ ÁREAS ============
export const areas: Area[] = [
  { id: "a1", nombre: "Electrónica", encargado: "Juan López Sánchez", colaboradores: ["c1", "c4"], descripcion: "Servicio técnico de equipos electrónicos y componentes" },
  { id: "a2", nombre: "Mecánica", encargado: "María Ramírez Castro", colaboradores: ["c2", "c5"], descripcion: "Mantenimiento y reparación de sistemas mecánicos" },
  { id: "a3", nombre: "Software", encargado: "Roberto García Ruiz", colaboradores: ["c3", "c8"], descripcion: "Soporte técnico de software y sistemas informáticos" },
];

// ============ SERVICIOS ============
export const servicios: Service[] = [
  {
    id: "s1",
    codigo: "SRV-2024-001",
    cliente: "Empresa ABC S.A.",
    telefonoCliente: "51987654321",
    descripcion: "Mantenimiento preventivo de equipos industriales - Línea de producción A",
    area: "Electrónica",
    tecnicos: ["Pedro Torres Vega", "Sandra Vargas López"],
    fechaInicio: "2024-04-10",
    horaInicio: "08:00",
    horaEstimadaFin: "16:30",
    inicioReal: undefined,
    estado: "En progreso",
    progreso: 66,
    tareas: [
      {
        id: "t1", nombre: "Inspección inicial de equipos", completada: true,
        fechaCompletada: "2024-04-10 09:30", responsable: "Pedro Torres", orden: 1,
        notas: [
          { id: "n1", autor: "Pedro Torres", rol: "Colaborador", texto: "Se detectaron 3 capacitores quemados en el tablero principal.", tipo: "observacion", fecha: "2024-04-10 09:45" },
          { id: "n2", autor: "Juan López", rol: "Encargado", texto: "Priorizar la revisión del tablero secundario también.", tipo: "instruccion", fecha: "2024-04-10 10:00" },
        ],
      },
      {
        id: "t2", nombre: "Desmontaje y limpieza de componentes", completada: true,
        fechaCompletada: "2024-04-11 14:00", responsable: "Sandra Vargas", orden: 2,
        notas: [
          { id: "n3", autor: "Sandra Vargas", rol: "Colaborador", texto: "Limpieza completada. Se usó aire comprimido y alcohol isopropílico.", tipo: "comentario", fecha: "2024-04-11 14:10" },
        ],
      },
      { id: "t3", nombre: "Reemplazo de piezas defectuosas", completada: false, orden: 3, notas: [] },
      { id: "t4", nombre: "Pruebas de funcionamiento", completada: false, orden: 4, notas: [] },
      { id: "t5", nombre: "Informe final y entrega", completada: false, orden: 5, notas: [] },
    ],
    comentarios: [
      { id: "cm1", autor: "Pedro Torres", rol: "Colaborador", texto: "Se detectaron 3 capacitores quemados en el tablero principal. Solicitando repuestos.", fecha: "2024-04-10 10:15" },
      { id: "cm2", autor: "Juan López", rol: "Encargado", texto: "Repuestos aprobados, llegarán mañana por la tarde.", fecha: "2024-04-10 11:30" },
    ],
  },
  {
    id: "s2",
    codigo: "SRV-2024-002",
    cliente: "Corporación XYZ",
    descripcion: "Instalación de sistema de automatización - Sala de control",
    area: "Software",
    tecnicos: ["Roberto García Ruiz", "Carlos Herrera Luna"],
    fechaInicio: "2024-04-08",
    horaInicio: "09:00",
    estado: "Completado",
    progreso: 100,
    fechaFin: "2024-04-12",
    horaFin: "16:30",
    tareas: [
      { id: "t6", nombre: "Análisis de requerimientos", completada: true, fechaCompletada: "2024-04-08 09:00", responsable: "Roberto García", orden: 1, notas: [] },
      { id: "t7", nombre: "Configuración del servidor", completada: true, fechaCompletada: "2024-04-09 15:00", responsable: "Carlos Herrera", orden: 2, notas: [] },
      { id: "t8", nombre: "Instalación del software", completada: true, fechaCompletada: "2024-04-10 12:00", responsable: "Roberto García", orden: 3, notas: [] },
      { id: "t9", nombre: "Pruebas de integración", completada: true, fechaCompletada: "2024-04-11 16:00", responsable: "Carlos Herrera", orden: 4, notas: [] },
      { id: "t10", nombre: "Capacitación al cliente", completada: true, fechaCompletada: "2024-04-12 10:00", responsable: "Roberto García", orden: 5, notas: [] },
    ],
    comentarios: [
      { id: "cm3", autor: "Roberto García", rol: "Colaborador", texto: "Sistema instalado correctamente. Cliente conforme con la solución implementada.", fecha: "2024-04-12 11:00" },
    ],
  },
  {
    id: "s3",
    codigo: "SRV-2024-003",
    cliente: "Industrias Norte",
    descripcion: "Reparación de compresor industrial - Urgente",
    area: "Mecánica",
    tecnicos: ["Lucía Castillo Mora"],
    fechaInicio: "2024-04-13",
    horaInicio: "07:30",
    estado: "Bloqueado",
    progreso: 30,
    tareas: [
      { id: "t11", nombre: "Diagnóstico del compresor", completada: true, fechaCompletada: "2024-04-13 08:00", responsable: "Lucía Castillo", orden: 1, notas: [
        { id: "n4", autor: "María Ramírez", rol: "Encargado", texto: "Coordinar con proveedor ABC para repuestos importados.", tipo: "instruccion", fecha: "2024-04-13 09:00" },
      ] },
      { id: "t12", nombre: "Solicitud de repuestos especiales", completada: false, orden: 2, notas: [] },
      { id: "t13", nombre: "Reparación y ajuste", completada: false, orden: 3, notas: [] },
      { id: "t14", nombre: "Prueba de presión", completada: false, orden: 4, notas: [] },
    ],
    comentarios: [
      { id: "cm4", autor: "Lucía Castillo", rol: "Colaborador", texto: "BLOQUEADO: Repuestos especiales no disponibles en almacén. Se requiere importación.", fecha: "2024-04-13 10:00" },
    ],
  },
  {
    id: "s4",
    codigo: "SRV-2024-004",
    cliente: "Tech Solutions Perú",
    descripcion: "Mantenimiento correctivo de rack de servidores",
    area: "Software",
    tecnicos: ["Roberto García Ruiz"],
    fechaInicio: "2024-04-15",
    horaInicio: "10:00",
    estado: "Pendiente",
    progreso: 0,
    tareas: [
      { id: "t15", nombre: "Revisión del estado actual", completada: false, orden: 1, notas: [] },
      { id: "t16", nombre: "Limpieza interna de servidores", completada: false, orden: 2, notas: [] },
      { id: "t17", nombre: "Actualización de firmware", completada: false, orden: 3, notas: [] },
      { id: "t18", nombre: "Verificación de conectividad", completada: false, orden: 4, notas: [] },
    ],
    comentarios: [],
  },
  {
    id: "s5",
    codigo: "SRV-2024-005",
    cliente: "Minera del Sur",
    descripcion: "Calibración de instrumentos de medición - Laboratorio",
    area: "Electrónica",
    tecnicos: ["Pedro Torres Vega", "Sandra Vargas López"],
    fechaInicio: "2024-04-14",
    horaInicio: "08:30",
    estado: "En progreso",
    progreso: 50,
    tareas: [
      { id: "t19", nombre: "Recepción e inventario de instrumentos", completada: true, fechaCompletada: "2024-04-14 09:00", responsable: "Pedro Torres", orden: 1, notas: [] },
      { id: "t20", nombre: "Calibración de multímetros", completada: true, fechaCompletada: "2024-04-14 14:00", responsable: "Sandra Vargas", orden: 2, notas: [] },
      { id: "t21", nombre: "Calibración de osciloscopios", completada: false, orden: 3, notas: [] },
      { id: "t22", nombre: "Certificados de calibración", completada: false, orden: 4, notas: [] },
    ],
    comentarios: [],
  },
];

// ============ ANUNCIOS Y COMUNICACIÓN ============
export const anuncios: Announcement[] = [
  { id: "an1", titulo: "Reunión mensual de área", contenido: "Se convoca a todos los colaboradores a la reunión mensual del viernes 19 de abril a las 4:00 PM en la sala de conferencias. Asistencia obligatoria.", autor: "Admin - Carlos Mendoza", fecha: "2024-04-15 08:00", tipo: "global" },
  { id: "an2", titulo: "Nuevos EPPs disponibles", contenido: "Se han recibido los equipos de protección personal. Pasar por almacén a recoger sus implementos actualizados.", autor: "Admin - Carlos Mendoza", fecha: "2024-04-14 10:30", tipo: "global" },
  { id: "an3", titulo: "Protocolo de emergencia actualizado", contenido: "Se ha actualizado el protocolo de emergencia para el área de mecánica. Revisar el documento adjunto.", autor: "Juan López", fecha: "2024-04-13 14:00", tipo: "area", areaDestino: "Electrónica" },
];

export const solicitudes: InternalRequest[] = [
  { id: "req1", tipo: "herramienta", solicitante: "Pedro Torres", destinatario: "Almacén", contenido: "Solicito: Multímetro digital Fluke 87V para calibración urgente.", fecha: "2024-04-15 09:00", estado: "pendiente" },
  { id: "req2", tipo: "apoyo", solicitante: "Lucía Castillo", destinatario: "Juan López", contenido: "Necesito apoyo adicional para el servicio SRV-2024-003. El trabajo requiere al menos 2 técnicos.", fecha: "2024-04-13 11:00", estado: "atendido" },
  { id: "req3", tipo: "instruccion", solicitante: "María Ramírez", destinatario: "Lucía Castillo", contenido: "Para el servicio del compresor, coordinar directamente con el proveedor ABC para acelerar el pedido de repuestos.", fecha: "2024-04-13 15:00", estado: "pendiente" },
];

// ============ AUDITORÍA ============
export const auditLogs: AuditLog[] = [
  { id: "al1", usuario: "Pedro Torres", accion: "Completó tarea", modulo: "Servicios", detalle: "Tarea 'Inspección inicial de equipos' marcada como completada en SRV-2024-001", fecha: "2024-04-10 09:30" },
  { id: "al2", usuario: "Juan López", accion: "Añadió comentario", modulo: "Servicios", detalle: "Comentario añadido en servicio SRV-2024-001", fecha: "2024-04-10 11:30" },
  { id: "al3", usuario: "Admin - Carlos Mendoza", accion: "Creó colaborador", modulo: "Colaboradores", detalle: "Nuevo colaborador registrado: Carlos Herrera Luna (EMP-008)", fecha: "2024-04-09 08:00" },
  { id: "al4", usuario: "Roberto García", accion: "Completó tarea", modulo: "Servicios", detalle: "Tarea 'Instalación del software' completada en SRV-2024-002", fecha: "2024-04-10 12:00" },
  { id: "al5", usuario: "Lucía Castillo", accion: "Actualizó estado", modulo: "Servicios", detalle: "Estado del servicio SRV-2024-003 cambiado a 'Bloqueado'", fecha: "2024-04-13 10:00" },
  { id: "al6", usuario: "Admin - Carlos Mendoza", accion: "Publicó anuncio", modulo: "Comunicación", detalle: "Anuncio global publicado: 'Reunión mensual de área'", fecha: "2024-04-15 08:00" },
  { id: "al7", usuario: "Sandra Vargas", accion: "Completó tarea", modulo: "Servicios", detalle: "Tarea 'Calibración de multímetros' completada en SRV-2024-005", fecha: "2024-04-14 14:00" },
  { id: "al8", usuario: "Admin - Carlos Mendoza", accion: "Creó servicio", modulo: "Servicios", detalle: "Nuevo servicio creado: SRV-2024-004 para cliente Tech Solutions Perú", fecha: "2024-04-15 07:30" },
  { id: "al9", usuario: "María Ramírez", accion: "Asignó técnico", modulo: "Servicios", detalle: "Técnico Lucía Castillo asignada al servicio SRV-2024-003", fecha: "2024-04-12 16:00" },
  { id: "al10", usuario: "Admin - Carlos Mendoza", accion: "Cambió contraseña", modulo: "Usuarios", detalle: "Contraseña restablecida para usuario: rgarcia01", fecha: "2024-04-11 09:00" },
];

export const plantillas = [
  { id: "p1", nombre: "Mantenimiento Preventivo", tareas: ["Inspección inicial", "Limpieza de componentes", "Verificación de conexiones", "Pruebas de funcionamiento", "Informe técnico"] },
  { id: "p2", nombre: "Instalación de Equipos", tareas: ["Recepción y verificación de equipos", "Preparación del área", "Instalación física", "Configuración y puesta en marcha", "Pruebas de aceptación", "Entrega y capacitación"] },
  { id: "p3", nombre: "Diagnóstico y Reparación", tareas: ["Diagnóstico inicial", "Identificación de falla", "Cotización de reparación", "Reparación/Reemplazo", "Prueba post-reparación", "Entrega al cliente"] },
  { id: "p4", nombre: "Calibración", tareas: ["Recepción de instrumentos", "Verificación pre-calibración", "Proceso de calibración", "Verificación post-calibración", "Emisión de certificados", "Entrega de instrumentos"] },
];

export const plantillasServicio: ServiceTemplate[] = [
  {
    id: "tmpl1",
    nombre: "Mantenimiento Preventivo HVAC",
    descripcion: "Revisión trimestral de equipos de aire acondicionado",
    area: "Electrónica",
    tareas: [
      "Inspección visual de unidades",
      "Limpieza de filtros",
      "Verificación de presiones de gas",
      "Prueba de funcionamiento",
      "Reporte de hallazgos"
    ],
    activo: true,
    fechaCreacion: "10/01/2026"
  },
  {
    id: "tmpl2",
    nombre: "Instalación de Punto de Red",
    descripcion: "Instalación de punto de red estructurada categoría 6",
    area: "Software",
    tareas: [
      "Verificar ruta de cableado",
      "Instalar canaleta y cable UTP",
      "Ponchar conector RJ45",
      "Certificar cableado",
      "Configurar puerto en switch"
    ],
    activo: true,
    fechaCreacion: "05/02/2026"
  },
  {
    id: "tmpl3",
    nombre: "Limpieza de Oficinas",
    descripcion: "Limpieza profunda semanal",
    area: "Mecánica",
    tareas: [
      "Aspirado de alfombras",
      "Limpieza de escritorios y superficies",
      "Vaciado de papeleras",
      "Reposición de insumos de baño",
      "Desinfección de áreas comunes"
    ],
    activo: false,
    fechaCreacion: "01/03/2026"
  }
];