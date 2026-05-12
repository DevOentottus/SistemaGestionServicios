import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import {
  BarChart2, Download, TrendingUp, Users, MapPin, CheckCircle2,
  Clock, FileText, Filter, Loader2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, PieChart, Pie, Cell, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

type ReportType = "colaborador" | "area" | "servicios";

type Area = { area_id: number; area_nombre: string };
type Usuario = { usuario_id: number; usuario_nombres: string; usuario_apellido_paterno: string | null; usuario_rol: string; usuario_activo: boolean };
type Servicio = { servicio_id: number; servicio_codigo: string | null; servicio_descripcion: string | null; servicio_estado: string; area_id: number | null };
type Tarea = { tarea_id: number; servicio_id: number; tarea_titulo: string; tarea_estado: string; tarea_completado_por: number | null };
type AreaColaborador = { area_id: number; colaborador_id: number };
type ServicioColaborador = { servicio_id: number; colaborador_id: number };

function computeProgreso(servicioId: number, tareas: Tarea[]): number {
  const srvTareas = tareas.filter((t) => t.servicio_id === servicioId);
  if (srvTareas.length === 0) return 0;
  const completadas = srvTareas.filter((t) => t.tarea_estado === "completado").length;
  return Math.round((completadas / srvTareas.length) * 100);
}

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [areas, setAreas] = useState<Area[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [areaColaboradores, setAreaColaboradores] = useState<AreaColaborador[]>([]);
  const [servicioColaboradores, setServicioColaboradores] = useState<ServicioColaborador[]>([]);

  const [reportType, setReportType] = useState<ReportType>("area");
  const [period, setPeriod] = useState("mes");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [a, u, s, t, ac, sc] = await Promise.all([
        supabase.from("areas").select("area_id, area_nombre"),
        supabase.from("usuarios").select("usuario_id, usuario_nombres, usuario_apellido_paterno, usuario_rol, usuario_activo"),
        supabase.from("servicios").select("servicio_id, servicio_codigo, servicio_descripcion, servicio_estado, area_id"),
        supabase.from("tareas").select("tarea_id, servicio_id, tarea_titulo, tarea_estado, tarea_completado_por"),
        supabase.from("areacolaboradores").select("area_id, colaborador_id"),
        supabase.from("serviciocolaboradores").select("servicio_id, colaborador_id"),
      ]);
      if (a.error || u.error || s.error || t.error || ac.error || sc.error)
        throw (a.error || u.error || s.error || t.error || ac.error || sc.error);

      setAreas((a.data ?? []) as Area[]);
      setUsuarios((u.data ?? []) as Usuario[]);
      setServicios((s.data ?? []) as Servicio[]);
      setTareas((t.data ?? []) as Tarea[]);
      setAreaColaboradores((ac.data ?? []) as AreaColaborador[]);
      setServicioColaboradores((sc.data ?? []) as ServicioColaborador[]);
    } catch (err) {
      console.error("Error cargando reportes:", err);
    } finally {
      setLoading(false);
    }
  };

  const activos = usuarios.filter(
    (u) => u.usuario_activo && u.usuario_rol === "Colaborador"
  );

  const areaData = areas.map((a) => {
    const aServices = servicios.filter((s) => s.area_id === a.area_id);
    const completed = aServices.filter(
      (s) => s.servicio_estado === "completado"
    ).length;

    const avgProgress =
      aServices.length > 0
        ? Math.round(
            aServices.reduce((sum, srv) => sum + computeProgreso(srv.servicio_id, tareas), 0) /
              aServices.length
          )
        : 0;

    return {
      name: a.area_nombre,
      total: aServices.length,
      completados: completed,
      "En progreso": aServices.filter((s) => s.servicio_estado === "en_progreso").length,
      productividad: avgProgress,
      colaboradores: areaColaboradores.filter((ac) => ac.area_id === a.area_id).length,
    };
  });

  const colabData = activos.map((c) => {
    const shortName = c.usuario_nombres.split(" ")[0];
    const serviciosDelUsuario = servicioColaboradores
      .filter((sc) => sc.colaborador_id === c.usuario_id)
      .map((sc) => sc.servicio_id);
    const userTasks = tareas.filter((t) =>
      serviciosDelUsuario.includes(t.servicio_id)
    );
    const completed = userTasks.filter(
      (t) => t.tarea_estado === "completado"
    ).length;
    const efficiency =
      userTasks.length > 0
        ? Math.round((completed / userTasks.length) * 100)
        : 0;

    const userAreas = areaColaboradores.filter(
      (ac) => ac.colaborador_id === c.usuario_id
    );
    const areaNombres = userAreas
      .map(
        (ua) => areas.find((a) => a.area_id === ua.area_id)?.area_nombre ?? ""
      )
      .filter(Boolean)
      .join(", ");

    return {
      name: shortName,
      area: areaNombres,
      completadas: completed,
      pendientes: userTasks.filter((t) => t.tarea_estado !== "completado").length,
      eficiencia: efficiency,
      servicios: serviciosDelUsuario.length,
    };
  });

  const trendData = [
    { semana: "Sem 1", completados: 3, iniciados: 5, bloqueados: 1 },
    { semana: "Sem 2", completados: 4, iniciados: 6, bloqueados: 0 },
    { semana: "Sem 3", completados: 2, iniciados: 4, bloqueados: 2 },
    { semana: "Sem 4", completados: 5, iniciados: 7, bloqueados: 1 },
  ];

  const pieData = [
    { name: "Completados", value: servicios.filter((s) => s.servicio_estado === "completado").length, color: "#16A34A" },
    { name: "En progreso", value: servicios.filter((s) => s.servicio_estado === "en_progreso").length, color: "#2563EB" },
    { name: "Pendientes", value: servicios.filter((s) => s.servicio_estado === "pendiente").length, color: "#F59E0B" },
    { name: "Bloqueados", value: servicios.filter((s) => s.servicio_estado === "bloqueado").length, color: "#DC2626" },
  ];

  const radarData = areas.map((a) => {
    const aServices = servicios.filter((s) => s.area_id === a.area_id);
    const avgProg =
      aServices.length > 0
        ? Math.round(
            aServices.reduce(
              (sum, srv) => sum + computeProgreso(srv.servicio_id, tareas),
              0
            ) / aServices.length
          )
        : 0;
    return {
      area: a.area_nombre.substring(0, 8),
      productividad: avgProg,
      volumen: aServices.length * 20,
      personal: areaColaboradores.filter((ac) => ac.area_id === a.area_id).length * 25,
    };
  });

  const handleExport = (format: "excel" | "pdf") => {
    alert(
      `Exportando reporte en formato ${format.toUpperCase()}...\n(Funcionalidad de exportación en implementación)`
    );
  };

  const completedCount = servicios.filter(
    (s) => s.servicio_estado === "completado"
  ).length;
  const totalCount = servicios.length;
  const avgDays = completedCount > 0 ? "3.2 días" : "—";
  const efficiency =
    totalCount > 0
      ? Math.round((completedCount / totalCount) * 100) + "%"
      : "0%";

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin w-8 h-8 text-blue-900" />
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-gray-900 font-bold text-2xl">Reportes</h1>
          <p className="text-gray-500 text-sm">
            Análisis de rendimiento y productividad
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport("excel")}
            className="flex items-center gap-2 border border-green-600 text-green-700 hover:bg-green-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
          >
            <Download className="w-4 h-4" /> Excel
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="flex items-center gap-2 border border-red-600 text-red-700 hover:bg-red-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
          >
            <FileText className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Filter className="w-4 h-4" />
          <span className="font-semibold">Tipo de reporte:</span>
        </div>
        {([
          { id: "area" as const, label: "Por Área", icon: MapPin },
          { id: "colaborador" as const, label: "Por Colaborador", icon: Users },
          { id: "servicios" as const, label: "Tendencia", icon: TrendingUp },
        ]).map((r) => (
          <button
            key={r.id}
            onClick={() => setReportType(r.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition ${
              reportType === r.id
                ? "bg-blue-900 text-white"
                : "border border-gray-200 text-gray-600 hover:border-blue-300"
            }`}
            style={{ fontWeight: reportType === r.id ? 600 : 400 }}
          >
            <r.icon className="w-4 h-4" />
            {r.label}
          </button>
        ))}
        <div className="ml-auto">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
          >
            <option value="semana">Esta semana</option>
            <option value="mes">Este mes</option>
            <option value="trimestre">Este trimestre</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total servicios", value: totalCount, icon: BarChart2, color: "bg-blue-900" },
          { label: "Completados", value: completedCount, icon: CheckCircle2, color: "bg-green-600" },
          { label: "Tiempo promedio", value: avgDays, icon: Clock, color: "bg-yellow-500" },
          { label: "Eficiencia global", value: efficiency, icon: TrendingUp, color: "bg-purple-600" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
          >
            <div
              className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center mb-3`}
            >
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-3xl text-gray-900 mb-0.5 font-bold">
              {stat.value}
            </p>
            <p className="text-gray-500 text-xs mb-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {reportType === "area" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-gray-800 mb-4 font-semibold">
              Servicios por Área
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={areaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="total"
                  fill="#1d4ed8"
                  radius={[4, 4, 0, 0]}
                  name="Total"
                />
                <Bar
                  dataKey="completados"
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                  name="Completados"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-gray-800 mb-4 font-semibold">
              Distribución de Estados
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-gray-800 font-semibold">Detalle por Área</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {[
                      "Área",
                      "Total Servicios",
                      "Completados",
                      "En Progreso",
                      "Colaboradores",
                      "Productividad",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left text-xs text-gray-500 px-4 py-3 font-semibold"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {areaData.map((row) => (
                    <tr key={row.name} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                        {row.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {row.total}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-semibold">
                          {row.completados}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-semibold">
                          {row["En progreso"]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {row.colaboradores}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full"
                              style={{ width: `${row.productividad}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-700 font-semibold">
                            {row.productividad}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {reportType === "colaborador" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-gray-800 mb-4 font-semibold">
              Tareas por Colaborador
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={colabData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="completadas"
                  fill="#16A34A"
                  radius={[4, 4, 0, 0]}
                  name="Completadas"
                />
                <Bar
                  dataKey="pendientes"
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                  name="Pendientes"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-gray-800 mb-4 font-semibold">
              Radar de Desempeño por Área
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="area" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fontSize: 10 }} />
                <Radar
                  name="Productividad"
                  dataKey="productividad"
                  stroke="#1d4ed8"
                  fill="#1d4ed8"
                  fillOpacity={0.3}
                />
                <Radar
                  name="Personal"
                  dataKey="personal"
                  stroke="#F59E0B"
                  fill="#F59E0B"
                  fillOpacity={0.2}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-gray-800 font-semibold">
                Reporte por Colaborador
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {[
                      "Colaborador",
                      "Área",
                      "Tareas Completadas",
                      "Tareas Pendientes",
                      "Servicios",
                      "Eficiencia",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left text-xs text-gray-500 px-4 py-3 font-semibold"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {colabData.map((row) => (
                    <tr key={row.name} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                        {row.name}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 bg-gray-50 rounded-lg">
                        {row.area}
                      </td>
                      <td className="px-4 py-3 text-sm text-green-700 font-semibold">
                        {row.completadas}
                      </td>
                      <td className="px-4 py-3 text-sm text-yellow-700 font-semibold">
                        {row.pendientes}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {row.servicios}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                row.eficiencia >= 70
                                  ? "bg-green-500"
                                  : row.eficiencia >= 40
                                  ? "bg-yellow-400"
                                  : "bg-gray-300"
                              }`}
                              style={{ width: `${row.eficiencia}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold">
                            {row.eficiencia}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {reportType === "servicios" && (
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-gray-800 mb-4 font-semibold">
              Tendencia Semanal de Servicios
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="semana" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="completados"
                  stroke="#16A34A"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Completados"
                />
                <Line
                  type="monotone"
                  dataKey="iniciados"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Iniciados"
                />
                <Line
                  type="monotone"
                  dataKey="bloqueados"
                  stroke="#DC2626"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4 }}
                  name="Bloqueados"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
