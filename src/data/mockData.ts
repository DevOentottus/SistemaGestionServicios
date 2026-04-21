export type Role = 'admin' | 'encargado' | 'colaborador' | 'cliente';
export type ServiceStatus = 'pendiente' | 'en_curso' | 'completado' | 'cancelado';
export type TaskStatus = 'pendiente' | 'en_progreso' | 'completado';
export type RequestType = 'apoyo' | 'herramienta' | 'instruccion';
export type RequestStatus = 'pendiente' | 'resuelto';

export interface User {
  id: string;
  username: string;
  password: string;
  nombre: string;
  apellido: string;
  correo: string;
  role: Role;
  areaId?: string;
  active: boolean;
}

export interface Collaborator {
  id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  correo: string;
  idInterno: string;
  areaId: string;
  role: 'encargado' | 'colaborador';
  username: string;
  active: boolean;
}

export interface Area {
  id: string;
  nombre: string;
  descripcion: string;
  encargadoId: string;
  colaboradoresIds: string[];
  color: string;
}

export interface Task {
  id: string;
  nombre: string;
  descripcion: string;
  status: TaskStatus;
  responsableId?: string;
  fechaCompletado?: string;
  orden: number;
  estimadoHoras?: number;
}

export interface Comment {
  id: string;
  userId: string;
  texto: string;
  fecha: string;
}

export interface Service {
  id: string;
  codigo: string;
  cliente: string;
  clienteContacto?: string;
  descripcion: string;
  areaId: string;
  tecnicosAsignados: string[];
  fechaInicio: string;
  fechaFin?: string;
  fechaEstimada?: string;
  status: ServiceStatus;
  tasks: Task[];
  comentarios: Comment[];
  plantilla?: string;
  prioridad: 'baja' | 'media' | 'alta';
}

export interface Announcement {
  id: string;
  titulo: string;
  contenido: string;
  autorId: string;
  fecha: string;
  destinatarios: 'all' | string;
  importante: boolean;
}

export interface InternalRequest {
  id: string;
  tipo: RequestType;
  titulo: string;
  descripcion: string;
  solicitanteId: string;
  destinatarioId?: string;
  areaId?: string;
  fecha: string;
  status: RequestStatus;
}

export interface AuditEntry {
  id: string;
  userId: string;
  accion: string;
  entidad: string;
  entidadId: string;
  detalle: string;
  fecha: string;
}

export function calcularProgreso(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  const completadas = tasks.filter((t) => t.status === 'completado').length;
  return Math.round((completadas / tasks.length) * 100);
}

export const mockUsers: User[] = [
  { id: 'u1', username: 'admin', password: 'admin123', nombre: 'Juan', apellido: 'Pérez', correo: 'admin@empresa.com', role: 'admin', active: true },
  { id: 'u2', username: 'egarcia01', password: 'enc123', nombre: 'Elena', apellido: 'García', correo: 'egarcia@empresa.com', role: 'encargado', areaId: 'a1', active: true },
  { id: 'u3', username: 'psanchez01', password: 'enc123', nombre: 'Pedro', apellido: 'Sánchez', correo: 'psanchez@empresa.com', role: 'encargado', areaId: 'a2', active: true },
  { id: 'u4', username: 'clopez01', password: 'col123', nombre: 'Carlos', apellido: 'López', correo: 'clopez@empresa.com', role: 'colaborador', areaId: 'a1', active: true },
  { id: 'u5', username: 'rmartin01', password: 'col123', nombre: 'Rosa', apellido: 'Martínez', correo: 'rmartin@empresa.com', role: 'colaborador', areaId: 'a1', active: true },
  { id: 'u6', username: 'jramirez01', password: 'col123', nombre: 'José', apellido: 'Ramírez', correo: 'jramirez@empresa.com', role: 'colaborador', areaId: 'a2', active: true },
  { id: 'u7', username: 'ltorres01', password: 'enc123', nombre: 'Luis', apellido: 'Torres', correo: 'ltorres@empresa.com', role: 'encargado', areaId: 'a3', active: true },
  { id: 'u8', username: 'cliente01', password: 'cli123', nombre: 'Carlos', apellido: 'Mendoza', correo: 'cmendoza@gmail.com', role: 'cliente', active: true },
];

export const mockCollaborators: Collaborator[] = [
  { id: 'c1', dni: '12345678', nombres: 'Elena', apellidos: 'García Ruiz', telefono: '987654321', correo: 'egarcia@empresa.com', idInterno: 'TEC-001', areaId: 'a1', role: 'encargado', username: 'egarcia01', active: true },
  { id: 'c2', dni: '23456789', nombres: 'Carlos', apellidos: 'López Vega', telefono: '987654322', correo: 'clopez@empresa.com', idInterno: 'TEC-002', areaId: 'a1', role: 'colaborador', username: 'clopez01', active: true },
  { id: 'c3', dni: '34567890', nombres: 'Rosa', apellidos: 'Martínez Díaz', telefono: '987654323', correo: 'rmartin@empresa.com', idInterno: 'TEC-003', areaId: 'a1', role: 'colaborador', username: 'rmartin01', active: true },
  { id: 'c4', dni: '45678901', nombres: 'Pedro', apellidos: 'Sánchez Flores', telefono: '987654324', correo: 'psanchez@empresa.com', idInterno: 'TEC-004', areaId: 'a2', role: 'encargado', username: 'psanchez01', active: true },
  { id: 'c5', dni: '56789012', nombres: 'José', apellidos: 'Ramírez Castro', telefono: '987654325', correo: 'jramirez@empresa.com', idInterno: 'TEC-005', areaId: 'a2', role: 'colaborador', username: 'jramirez01', active: true },
  { id: 'c6', dni: '67890123', nombres: 'Luis', apellidos: 'Torres Huanca', telefono: '987654326', correo: 'ltorres@empresa.com', idInterno: 'TEC-006', areaId: 'a3', role: 'encargado', username: 'ltorres01', active: true },
  { id: 'c7', dni: '78901234', nombres: 'Ana', apellidos: 'Quintero Prado', telefono: '987654327', correo: 'aquintero@empresa.com', idInterno: 'TEC-007', areaId: 'a3', role: 'colaborador', username: 'aquintero01', active: false },
];

export const mockAreas: Area[] = [
  { id: 'a1', nombre: 'Electrónica', descripcion: 'Reparación de equipos electrónicos y dispositivos', encargadoId: 'c1', colaboradoresIds: ['c1', 'c2', 'c3'], color: '#2563EB' },
  { id: 'a2', nombre: 'Mecánica', descripcion: 'Mantenimiento y reparación de equipos mecánicos', encargadoId: 'c4', colaboradoresIds: ['c4', 'c5'], color: '#16A34A' },
  { id: 'a3', nombre: 'Software', descripcion: 'Instalación, configuración y soporte de software', encargadoId: 'c6', colaboradoresIds: ['c6', 'c7'], color: '#7C3AED' },
];

export const mockServices: Service[] = [
  {
    id: 's1', codigo: 'SRV-2024-001', cliente: 'Carlos Mendoza', clienteContacto: '987654000',
    descripcion: 'Revisión y reparación de laptop HP Pavilion con problemas de arranque y disco duro',
    areaId: 'a1', tecnicosAsignados: ['c2', 'c3'], fechaInicio: '2024-04-01', fechaEstimada: '2024-04-10',
    status: 'en_curso', prioridad: 'alta', plantilla: 'Reparación de Laptop',
    tasks: [
      { id: 't1', nombre: 'Diagnóstico inicial', descripcion: 'Evaluar el estado del equipo', status: 'completado', responsableId: 'c2', fechaCompletado: '2024-04-02T09:30:00', orden: 1, estimadoHoras: 1 },
      { id: 't2', nombre: 'Desmontaje y limpieza', descripcion: 'Limpiar internamente el equipo', status: 'completado', responsableId: 'c3', fechaCompletado: '2024-04-03T14:00:00', orden: 2, estimadoHoras: 2 },
      { id: 't3', nombre: 'Reemplazo de componentes', descripcion: 'Instalar disco SSD y memoria RAM', status: 'en_progreso', responsableId: 'c2', orden: 3, estimadoHoras: 3 },
      { id: 't4', nombre: 'Pruebas de funcionamiento', descripcion: 'Verificar el correcto funcionamiento', status: 'pendiente', orden: 4, estimadoHoras: 1 },
      { id: 't5', nombre: 'Entrega al cliente', descripcion: 'Documentar y entregar el equipo', status: 'pendiente', orden: 5, estimadoHoras: 0.5 },
    ],
    comentarios: [
      { id: 'cm1', userId: 'u2', texto: 'El disco duro tiene sectores dañados. Se recomienda reemplazo por SSD.', fecha: '2024-04-02T10:00:00' },
      { id: 'cm2', userId: 'u4', texto: 'Procederemos con el reemplazo del disco y reinstalación del sistema operativo.', fecha: '2024-04-03T09:00:00' },
    ],
  },
  {
    id: 's2', codigo: 'SRV-2024-002', cliente: 'María Rodríguez', clienteContacto: '987654001',
    descripcion: 'Reparación de impresora Epson L380 con problemas de alimentación de papel',
    areaId: 'a2', tecnicosAsignados: ['c5'], fechaInicio: '2024-03-20', fechaFin: '2024-03-25', fechaEstimada: '2024-03-26',
    status: 'completado', prioridad: 'media',
    tasks: [
      { id: 't6', nombre: 'Diagnóstico', descripcion: '', status: 'completado', responsableId: 'c5', fechaCompletado: '2024-03-21T10:00:00', orden: 1, estimadoHoras: 1 },
      { id: 't7', nombre: 'Limpieza de rodillos', descripcion: '', status: 'completado', responsableId: 'c5', fechaCompletado: '2024-03-22T11:00:00', orden: 2, estimadoHoras: 2 },
      { id: 't8', nombre: 'Calibración y prueba', descripcion: '', status: 'completado', responsableId: 'c5', fechaCompletado: '2024-03-25T15:00:00', orden: 3, estimadoHoras: 1 },
    ],
    comentarios: [{ id: 'cm3', userId: 'u3', texto: 'Rodillos con desgaste excesivo. Limpieza y ajuste completados correctamente.', fecha: '2024-03-25T16:00:00' }],
  },
  {
    id: 's3', codigo: 'SRV-2024-003', cliente: 'Empresa Tech SAC', clienteContacto: '987654002',
    descripcion: 'Instalación y configuración de sistema ERP empresarial con migración de datos',
    areaId: 'a3', tecnicosAsignados: ['c6', 'c7'], fechaInicio: '2024-04-05', fechaEstimada: '2024-04-20',
    status: 'en_curso', prioridad: 'alta',
    tasks: [
      { id: 't9', nombre: 'Análisis de requerimientos', descripcion: '', status: 'completado', responsableId: 'c6', fechaCompletado: '2024-04-06T12:00:00', orden: 1, estimadoHoras: 4 },
      { id: 't10', nombre: 'Configuración del servidor', descripcion: '', status: 'en_progreso', responsableId: 'c6', orden: 2, estimadoHoras: 6 },
      { id: 't11', nombre: 'Instalación del software', descripcion: '', status: 'pendiente', orden: 3, estimadoHoras: 4 },
      { id: 't12', nombre: 'Migración de datos', descripcion: '', status: 'pendiente', orden: 4, estimadoHoras: 8 },
      { id: 't13', nombre: 'Capacitación al personal', descripcion: '', status: 'pendiente', orden: 5, estimadoHoras: 4 },
      { id: 't14', nombre: 'Pruebas finales y entrega', descripcion: '', status: 'pendiente', orden: 6, estimadoHoras: 2 },
    ],
    comentarios: [],
  },
  {
    id: 's4', codigo: 'SRV-2024-004', cliente: 'Inmobiliaria Central', clienteContacto: '987654003',
    descripcion: 'Mantenimiento preventivo de servidor Dell PowerEdge R740',
    areaId: 'a1', tecnicosAsignados: ['c2'], fechaInicio: '2024-04-10', fechaEstimada: '2024-04-12',
    status: 'pendiente', prioridad: 'baja',
    tasks: [
      { id: 't15', nombre: 'Verificación de hardware', descripcion: '', status: 'pendiente', orden: 1, estimadoHoras: 2 },
      { id: 't16', nombre: 'Limpieza de componentes', descripcion: '', status: 'pendiente', orden: 2, estimadoHoras: 1.5 },
      { id: 't17', nombre: 'Actualización de firmware', descripcion: '', status: 'pendiente', orden: 3, estimadoHoras: 2 },
      { id: 't18', nombre: 'Pruebas de estrés', descripcion: '', status: 'pendiente', orden: 4, estimadoHoras: 3 },
    ],
    comentarios: [],
  },
  {
    id: 's5', codigo: 'SRV-2024-005', cliente: 'Hotel Gran Plaza', clienteContacto: '987654004',
    descripcion: 'Diagnóstico y reparación de TV Samsung 55" Smart TV con pantalla dañada',
    areaId: 'a1', tecnicosAsignados: ['c3'], fechaInicio: '2024-04-08', fechaEstimada: '2024-04-11',
    status: 'en_curso', prioridad: 'media',
    tasks: [
      { id: 't19', nombre: 'Diagnóstico de pantalla', descripcion: '', status: 'completado', responsableId: 'c3', fechaCompletado: '2024-04-08T11:00:00', orden: 1, estimadoHoras: 1 },
      { id: 't20', nombre: 'Reemplazo de panel LED', descripcion: '', status: 'completado', responsableId: 'c3', fechaCompletado: '2024-04-09T16:00:00', orden: 2, estimadoHoras: 3 },
      { id: 't21', nombre: 'Calibración de imagen', descripcion: '', status: 'completado', responsableId: 'c3', fechaCompletado: '2024-04-10T10:00:00', orden: 3, estimadoHoras: 1 },
      { id: 't22', nombre: 'Prueba final', descripcion: '', status: 'en_progreso', orden: 4, estimadoHoras: 0.5 },
      { id: 't23', nombre: 'Entrega', descripcion: '', status: 'pendiente', orden: 5, estimadoHoras: 0.5 },
    ],
    comentarios: [{ id: 'cm4', userId: 'u5', texto: 'Panel reemplazado exitosamente. Procediendo con calibración de color y brillo.', fecha: '2024-04-09T17:00:00' }],
  },
  {
    id: 's6', codigo: 'SRV-2024-006', cliente: 'Laboratorio MedPro', clienteContacto: '987654005',
    descripcion: 'Calibración de equipos de medición y análisis clínico',
    areaId: 'a2', tecnicosAsignados: ['c4', 'c5'], fechaInicio: '2024-03-28', fechaFin: '2024-04-02', fechaEstimada: '2024-04-05',
    status: 'completado', prioridad: 'alta',
    tasks: [
      { id: 't24', nombre: 'Inventario de equipos', descripcion: '', status: 'completado', responsableId: 'c4', fechaCompletado: '2024-03-29T09:00:00', orden: 1, estimadoHoras: 2 },
      { id: 't25', nombre: 'Calibración individual', descripcion: '', status: 'completado', responsableId: 'c5', fechaCompletado: '2024-03-31T17:00:00', orden: 2, estimadoHoras: 8 },
      { id: 't26', nombre: 'Documentación y certificados', descripcion: '', status: 'completado', responsableId: 'c4', fechaCompletado: '2024-04-02T15:00:00', orden: 3, estimadoHoras: 4 },
    ],
    comentarios: [],
  },
];

export const mockAnnouncements: Announcement[] = [
  { id: 'ann1', titulo: 'Reunión de equipo mensual', contenido: 'Se convoca a todos los colaboradores a la reunión mensual el día viernes 12 de abril a las 9:00 AM en la sala principal. Asistencia obligatoria.', autorId: 'u1', fecha: '2024-04-10T08:00:00', destinatarios: 'all', importante: true },
  { id: 'ann2', titulo: 'Nuevos protocolos de seguridad', contenido: 'Se han actualizado los protocolos de seguridad para el manejo de equipos electrónicos. Por favor revisen el manual en la intranet antes del lunes.', autorId: 'u1', fecha: '2024-04-08T10:00:00', destinatarios: 'all', importante: false },
  { id: 'ann3', titulo: 'Mantenimiento del sistema', contenido: 'El sistema estará en mantenimiento el sábado 13 de abril de 10 PM a 2 AM. Guarden su trabajo antes de esa hora.', autorId: 'u1', fecha: '2024-04-07T15:00:00', destinatarios: 'all', importante: true },
];

export const mockRequests: InternalRequest[] = [
  { id: 'req1', tipo: 'herramienta', titulo: 'Solicitud de multímetro digital', descripcion: 'Necesito un multímetro digital para el diagnóstico del servidor Dell. El actual tiene la pantalla dañada.', solicitanteId: 'u4', destinatarioId: 'u2', areaId: 'a1', fecha: '2024-04-09T11:00:00', status: 'pendiente' },
  { id: 'req2', tipo: 'apoyo', titulo: 'Apoyo técnico para instalación ERP', descripcion: 'Necesito apoyo adicional para completar la migración de datos antes del plazo establecido con el cliente.', solicitanteId: 'u7', destinatarioId: 'u1', areaId: 'a3', fecha: '2024-04-08T14:00:00', status: 'resuelto' },
  { id: 'req3', tipo: 'instruccion', titulo: 'Protocolo de calibración MedPro', descripcion: 'Por favor envíen el protocolo actualizado de calibración para los equipos del Laboratorio MedPro.', solicitanteId: 'u3', destinatarioId: 'u1', areaId: 'a2', fecha: '2024-04-05T09:00:00', status: 'resuelto' },
  { id: 'req4', tipo: 'apoyo', titulo: 'Asistencia en reparación TV Samsung', descripcion: 'El trabajo de reemplazo de panel requiere dos personas por seguridad. Solicito apoyo urgente.', solicitanteId: 'u5', destinatarioId: 'u2', areaId: 'a1', fecha: '2024-04-08T10:30:00', status: 'resuelto' },
];

export const mockAuditLog: AuditEntry[] = [
  { id: 'aud1', userId: 'u1', accion: 'CREAR', entidad: 'Servicio', entidadId: 's1', detalle: 'Servicio SRV-2024-001 creado para cliente Carlos Mendoza', fecha: '2024-04-01T08:00:00' },
  { id: 'aud2', userId: 'u4', accion: 'COMPLETAR', entidad: 'Tarea', entidadId: 't1', detalle: 'Tarea "Diagnóstico inicial" marcada como completada', fecha: '2024-04-02T09:30:00' },
  { id: 'aud3', userId: 'u5', accion: 'COMPLETAR', entidad: 'Tarea', entidadId: 't2', detalle: 'Tarea "Desmontaje y limpieza" marcada como completada', fecha: '2024-04-03T14:00:00' },
  { id: 'aud4', userId: 'u2', accion: 'COMENTAR', entidad: 'Servicio', entidadId: 's1', detalle: 'Nuevo comentario agregado en SRV-2024-001', fecha: '2024-04-02T10:00:00' },
  { id: 'aud5', userId: 'u1', accion: 'CREAR', entidad: 'Colaborador', entidadId: 'c7', detalle: 'Colaborador Ana Quintero (TEC-007) registrada en área Software', fecha: '2024-04-01T07:00:00' },
  { id: 'aud6', userId: 'u1', accion: 'DESACTIVAR', entidad: 'Colaborador', entidadId: 'c7', detalle: 'Colaborador Ana Quintero desactivada del sistema', fecha: '2024-04-05T17:00:00' },
  { id: 'aud7', userId: 'u3', accion: 'COMPLETAR', entidad: 'Servicio', entidadId: 's2', detalle: 'Servicio SRV-2024-002 marcado como completado', fecha: '2024-03-25T16:00:00' },
  { id: 'aud8', userId: 'u1', accion: 'PUBLICAR', entidad: 'Anuncio', entidadId: 'ann1', detalle: 'Anuncio "Reunión de equipo mensual" publicado a todos', fecha: '2024-04-10T08:00:00' },
  { id: 'aud9', userId: 'u5', accion: 'COMENTAR', entidad: 'Servicio', entidadId: 's5', detalle: 'Nuevo comentario en SRV-2024-005', fecha: '2024-04-09T17:00:00' },
  { id: 'aud10', userId: 'u4', accion: 'INICIAR', entidad: 'Tarea', entidadId: 't3', detalle: 'Tarea "Reemplazo de componentes" iniciada', fecha: '2024-04-04T09:00:00' },
  { id: 'aud11', userId: 'u1', accion: 'CREAR', entidad: 'Servicio', entidadId: 's3', detalle: 'Servicio SRV-2024-003 creado para Empresa Tech SAC', fecha: '2024-04-05T07:30:00' },
  { id: 'aud12', userId: 'u6', accion: 'COMPLETAR', entidad: 'Tarea', entidadId: 't9', detalle: 'Tarea "Análisis de requerimientos" completada', fecha: '2024-04-06T12:00:00' },
];
