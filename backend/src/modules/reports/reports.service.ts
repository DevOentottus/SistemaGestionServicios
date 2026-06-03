import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { db, schema } from "@/db/connection.js";

interface ReporteBase {
  formato: "json" | "excel";
  fechaDesde?: string;
  fechaHasta?: string;
  areaId?: number;
}

// ═══════════════════════════════════════════
//  REPORTE DE EFICIENCIA
// ═══════════════════════════════════════════

export async function generarReporteEficiencia(params: ReporteBase & { areaId?: number }) {
  const conditions = [eq(schema.servicios.servicio_estado, "completado")];
  if (params.areaId) conditions.push(eq(schema.servicios.area_id, params.areaId));
  if (params.fechaDesde) conditions.push(gte(schema.servicios.servicio_fecha_fin, new Date(params.fechaDesde)));
  if (params.fechaHasta) conditions.push(lte(schema.servicios.servicio_fecha_fin, new Date(params.fechaHasta)));

  const servicios = await db
    .select()
    .from(schema.servicios)
    .where(and(...conditions));

  // Calcular métricas
  const totalServicios = servicios.length;
  const tiempoPromedio = totalServicios
    ? Math.round(
        servicios.reduce((acc, s) => acc + (s.servicio_tiempo_estimado ?? 0), 0) / totalServicios
      )
    : 0;

  const data = {
    fechaGeneracion: new Date().toISOString(),
    totalServicios,
    tiempoPromedioMinutos: tiempoPromedio,
    servicios,
    filtros: params,
  };

  if (params.formato === "excel") {
    return await generarExcelEficiencia(data);
  }

  return data;
}

async function generarExcelEficiencia(data: any): Promise<Buffer> {
  // En una implementación real usamos ExcelJS
  // Por ahora, retornamos un JSON string como placeholder
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Eficiencia");

  sheet.columns = [
    { header: "Código", key: "codigo", width: 15 },
    { header: "Descripción", key: "descripcion", width: 40 },
    { header: "Tiempo Estimado (min)", key: "tiempo", width: 20 },
    { header: "Fecha Inicio", key: "inicio", width: 20 },
    { header: "Fecha Fin", key: "fin", width: 20 },
  ];

  data.servicios.forEach((s: any) => {
    sheet.addRow({
      codigo: s.servicio_codigo,
      descripcion: s.servicio_descripcion,
      tiempo: s.servicio_tiempo_estimado,
      inicio: s.servicio_fecha_inicio,
      fin: s.servicio_fecha_fin,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ═══════════════════════════════════════════
//  REPORTE DE PRODUCTIVIDAD
// ═══════════════════════════════════════════

export async function generarReporteProductividad(params: ReporteBase) {
  const conditions = [eq(schema.servicios.servicio_estado, "completado")];
  if (params.fechaDesde) conditions.push(gte(schema.servicios.servicio_fecha_fin, new Date(params.fechaDesde)));
  if (params.fechaHasta) conditions.push(lte(schema.servicios.servicio_fecha_fin, new Date(params.fechaHasta)));

  const servicios = await db
    .select()
    .from(schema.servicios)
    .where(and(...conditions));

  // Colaboradores activos
  const colaboradores = await db
    .select()
    .from(schema.usuarios)
    .where(
      and(
        eq(schema.usuarios.usuario_activo, true),
        sql`${schema.usuarios.usuario_rol} IN ('colaborador', 'encargado')`
      )
    );

  const totalColaboradores = colaboradores.length;
  const totalServicios = servicios.length;
  const productividad = totalColaboradores > 0
    ? (totalServicios / totalColaboradores).toFixed(1)
    : "0";

  const data = {
    fechaGeneracion: new Date().toISOString(),
    totalServicios,
    totalColaboradoresActivos: totalColaboradores,
    productividadPromedio: `${productividad} servicios/colaborador`,
    colaboradores: colaboradores.map((c) => ({
      id: c.usuario_id,
      nombre: c.usuario_nombres,
      rol: c.usuario_rol,
    })),
  };

  if (params.formato === "excel") {
    return await generarExcelProductividad(data);
  }

  return data;
}

async function generarExcelProductividad(data: any): Promise<Buffer> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Productividad");

  sheet.addRow(["Productividad Promedio", data.productividadPromedio]);
  sheet.addRow(["Total Servicios", data.totalServicios]);
  sheet.addRow(["Colaboradores Activos", data.totalColaboradoresActivos]);
  sheet.addRow([]);
  sheet.addRow(["Colaborador", "Rol"]);

  data.colaboradores.forEach((c: any) => {
    sheet.addRow([c.nombre, c.rol]);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ═══════════════════════════════════════════
//  REPORTE DE TRAZABILIDAD
// ═══════════════════════════════════════════

export async function generarReporteTrazabilidad(servicioId?: number) {
  const conditions = [];
  if (servicioId) {
    conditions.push(eq(schema.auditoria.auditoria_tabla, "servicios"));
    conditions.push(eq(schema.auditoria.auditoria_id_registro, servicioId));
  }

  const logs = await db
    .select()
    .from(schema.auditoria)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.auditoria.auditoria_fecha))
    .limit(100);

  return {
    fechaGeneracion: new Date().toISOString(),
    totalRegistros: logs.length,
    logs,
  };
}
