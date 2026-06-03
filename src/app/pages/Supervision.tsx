import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../auth/AuthContext";
import {
  Eye, CheckCircle2, Clock, AlertTriangle, TrendingUp, Award,
  ArrowUp, ArrowDown, Loader2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Area = { area_id: number; area_nombre: string; area_encargado_id: number | null };
type Usuario = { usuario_id: number; usuario_nombres: string; usuario_apellido_paterno: string | null; usuario_rol: string; usuario_activo: boolean };
type Servicio = { servicio_id: number; servicio_codigo: string | null; servicio_descripcion: string | null; servicio_estado: string; area_id: number | null };
type Tarea = { tarea_id: number; servicio_id: number; tarea_titulo: string; tarea_estado: string; tarea_completado_por: number | null };

export default function Supervision() {
  const { currentUser } = useAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAreaId, setSelectedAreaId] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [a, u, s, t] = await Promise.all([
        supabase.from("areas").select("area_id, area_nombre, area_encargado_id").order("area_nombre"),
        supabase.from("usuarios").select("usuario_id, usuario_nombres, usuario_apellido_paterno, usuario_rol, usuario_activo"),
        supabase.from("servicios").select("servicio_id, servicio_codigo, servicio_descripcion, servicio_estado, area_id").order("servicio_fecha_inicio", { ascending: false }),
        supabase.from("tareas").select("tarea_id, servicio_id, tarea_titulo, tarea_estado, tarea_completado_por"),
      ]);
      if (a.error || u.error || s.error || t.error) throw (a.error || u.error || s.error || t.error);

      const areasData = (a.data || []) as Area[];
      setAreas(areasData);

      const usuariosData = (u.data || []) as Usuario[];
      setUsuarios(usuariosData);

      if (areasData.length > 0 && !selectedAreaId) {
        if (currentUser?.rol === "Encargado") {
          const encargadoArea = areasData.find(ar => ar.area_encargado_id === Number(currentUser?.id_usuario));
          setSelectedAreaId(String(encargadoArea?.area_id || areasData[0].area_id));
        } else {
          setSelectedAreaId(String(areasData[0].area_id));
        }
      }

      setServicios((s.data || []) as Servicio[]);
      setTareas((t.data || []) as Tarea[]);
    } catch (err) {
      console.error("Error cargando supervisión:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin w-8 h-8 text-blue-900" /></div>;

  const selectedArea = areas.find(a => a.area_id === Number(selectedAreaId));

  const visibleServices = servicios.filter((s) => {
    if (currentUser?.rol === "Administrador") return true;
    if (currentUser?.rol === "Encargado") {
      const userArea = areas.find(a => a.area_encargado_id === Number(currentUser?.id_usuario));
      return s.area_id === Number(selectedAreaId) && userArea?.area_id === Number(selectedAreaId);
    }
    return false;
  });

  const areaCollaborators = usuarios.filter(u => {
    return u.usuario_activo && u.usuario_rol === "Colaborador";
  });

  const getServiceProgress = (servicioId: number): number => {
    const serviceTasks = tareas.filter(t => t.servicio_id === servicioId);
    if (serviceTasks.length === 0) return 0;
    const completed = serviceTasks.filter(t => t.tarea_estado === "completado").length;
    return Math.round((completed / serviceTasks.length) * 100);
  };

  const getCollaboratorStats = (userId: number) => {
    const allTasks = tareas.filter(t =>
      visibleServices.some(s => s.servicio_id === t.servicio_id) &&
      t.tarea_completado_por === userId
    );
    const completed = allTasks.filter((t) => t.tarea_estado === "completado").length;
    const pending = allTasks.filter((t) => t.tarea_estado !== "completado").length;
    const efficiency = allTasks.length > 0 ? Math.round((completed / allTasks.length) * 100) : 0;
    return { total: allTasks.length, completed, pending, efficiency };
  };

  const chartData = areaCollaborators.map((c) => {
    const shortName = c.usuario_nombres.split(" ")[0];
    const stats = getCollaboratorStats(c.usuario_id);
    return { name: shortName, completadas: stats.completed, pendientes: stats.pending, eficiencia: stats.efficiency };
  });

  const areaStats = {
    totalServices: visibleServices.length,
    enProgreso: visibleServices.filter((s) => s.servicio_estado === "En progreso").length,
    completados: visibleServices.filter((s) => s.servicio_estado === "Completado").length,
    bloqueados: visibleServices.filter((s) => s.servicio_estado === "Bloqueado").length,
    avgProgress: visibleServices.length > 0
      ? Math.round(visibleServices.reduce((sum, s) => sum + getServiceProgress(s.servicio_id), 0) / visibleServices.length)
      : 0,
  };

  const statusColors: Record<string, string> = {
    "En progreso": "text-blue-600 bg-blue-50",
    Completado: "text-green-600 bg-green-50",
    Pendiente: "text-yellow-600 bg-yellow-50",
    Bloqueado: "text-red-600 bg-red-50",
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-gray-900 font-bold text-2xl">Supervisión y Control</h1>
          <p className="text-gray-500 text-sm">Monitoreo de progreso por área y colaborador</p>
        </div>
        {currentUser?.rol === "Administrador" && (
          <div className="flex gap-2 flex-wrap">
            {areas.map((a) => (
              <button
                key={a.area_id}
                onClick={() => setSelectedAreaId(String(a.area_id))}
                className={`px-4 py-2 rounded-xl text-sm transition ${String(a.area_id) === selectedAreaId ? "bg-blue-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"}`}
                style={{ fontWeight: String(a.area_id) === selectedAreaId ? 600 : 400 }}
              >
                {a.area_nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Servicios", value: areaStats.totalServices, icon: Eye, color: "bg-blue-900" },
          { label: "En Progreso", value: areaStats.enProgreso, icon: Clock, color: "bg-blue-600" },
          { label: "Completados", value: areaStats.completados, icon: CheckCircle2, color: "bg-green-600" },
          { label: "Bloqueados", value: areaStats.bloqueados, icon: AlertTriangle, color: "bg-red-600" },
          { label: "Progreso Promedio", value: `${areaStats.avgProgress}%`, icon: TrendingUp, color: "bg-yellow-500" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className={`w-9 h-9 ${stat.color} rounded-xl flex items-center justify-center mb-2`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl text-gray-900 font-bold">{stat.value}</p>
            <p className="text-gray-500 text-xs">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-gray-800 font-semibold">Servicios del Área: {selectedArea?.area_nombre || "—"}</h3>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-semibold">{visibleServices.length} servicios</span>
            </div>
            <div className="divide-y divide-gray-50">
              {visibleServices.map((srv) => (
                <div key={srv.servicio_id} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900 font-semibold">{srv.servicio_codigo || "SIN-CODIGO"}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[srv.servicio_estado] || ""}`} style={{ fontWeight: 500 }}>{srv.servicio_estado}</span>
                      {srv.servicio_estado === "Bloqueado" && <AlertTriangle className="w-4 h-4 text-red-500" />}
                    </div>
                    <span className="text-sm text-gray-700 font-semibold">{getServiceProgress(srv.servicio_id)}%</span>
                  </div>
                  <p className="text-gray-600 text-xs mb-2 truncate">{srv.servicio_descripcion}</p>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full ${srv.servicio_estado === "Completado" ? "bg-green-500" : srv.servicio_estado === "Bloqueado" ? "bg-red-500" : "bg-blue-600"}`}
                      style={{ width: `${getServiceProgress(srv.servicio_id)}%` }}
                    />
                  </div>
                </div>
              ))}
              {visibleServices.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-sm">No hay servicios en esta área</div>
              )}
            </div>
          </div>

          {chartData.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="text-gray-800 mb-4 font-semibold">Desempeño por Colaborador</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="completadas" fill="#2563EB" radius={[4, 4, 0, 0]} name="Tareas completadas" />
                  <Bar dataKey="pendientes" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Tareas pendientes" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-gray-800 text-sm font-semibold">Rendimiento de Colaboradores</h3>
          {areaCollaborators.map((c) => {
            const shortName = c.usuario_nombres.split(" ")[0];
            const stats = getCollaboratorStats(c.usuario_id);
            return (
              <div key={c.usuario_id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{c.usuario_nombres[0]}{c.usuario_apellido_paterno?.[0] || ""}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 text-sm truncate font-semibold">{c.usuario_nombres} {c.usuario_apellido_paterno || ""}</p>
                    <p className="text-gray-400 text-xs">{c.usuario_rol}</p>
                  </div>
                  <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold ${
                    stats.efficiency >= 70 ? "bg-green-100 text-green-700" :
                    stats.efficiency >= 40 ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {stats.efficiency >= 70 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    {stats.efficiency}%
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: "Total", value: stats.total, color: "text-gray-700" },
                    { label: "Hechas", value: stats.completed, color: "text-green-700" },
                    { label: "Pend.", value: stats.pending, color: "text-yellow-700" },
                  ].map((s) => (
                    <div key={s.label} className="text-center bg-gray-50 rounded-lg p-2">
                      <p className={`text-base ${s.color} font-bold`}>{s.value}</p>
                      <p className="text-gray-400 text-xs">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Eficiencia</span>
                    <span className="font-semibold">{stats.efficiency}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        stats.efficiency >= 70 ? "bg-green-500" :
                        stats.efficiency >= 40 ? "bg-yellow-400" : "bg-gray-300"
                      }`}
                      style={{ width: `${stats.efficiency}%` }}
                    />
                  </div>
                </div>

                {stats.efficiency >= 80 && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-yellow-700 bg-yellow-50 rounded-lg px-2 py-1">
                    <Award className="w-3.5 h-3.5" />
                    <span style={{ fontWeight: 500 }}>Alto rendimiento</span>
                  </div>
                )}
              </div>
            );
          })}
          {areaCollaborators.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400 text-sm shadow-sm border border-gray-100">
              Sin colaboradores en esta área
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
