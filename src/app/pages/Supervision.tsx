import { useState } from "react";
import { servicios, colaboradores, areas } from "../data/mockData";
import { useAuth } from "../context/AuthContext";
import {
  Eye, User, CheckCircle2, Clock, AlertTriangle, TrendingUp, Award,
  ArrowUp, ArrowDown,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function Supervision() {
  const { currentUser } = useAuth();
  const [selectedArea, setSelectedArea] = useState(areas[0].nombre);

  // Filter services by area for Encargado
  const visibleServices = currentUser?.rol === "Encargado" && currentUser.area
    ? servicios.filter((s) => s.area === currentUser.area)
    : selectedArea ? servicios.filter((s) => s.area === selectedArea) : servicios;

  const areaCollaborators = colaboradores.filter((c) => c.area === selectedArea && c.activo);

  // Collaborator stats
  const getCollaboratorStats = (name: string) => {
    const allTasks = visibleServices.flatMap((s) =>
      s.tareas.filter((t) => t.responsable === name)
    );
    const completed = allTasks.filter((t) => t.completada).length;
    const pending = allTasks.filter((t) => !t.completada).length;
    const efficiency = allTasks.length > 0 ? Math.round((completed / allTasks.length) * 100) : 0;
    return { total: allTasks.length, completed, pending, efficiency };
  };

  const chartData = areaCollaborators.map((c) => {
    const stats = getCollaboratorStats(`${c.nombres.split(" ")[0]} ${c.apellidos.split(" ")[0]}`);
    return {
      name: c.nombres.split(" ")[0],
      completadas: stats.completed,
      pendientes: stats.pending,
      eficiencia: stats.efficiency,
    };
  });

  const areaStats = {
    totalServices: visibleServices.length,
    enProgreso: visibleServices.filter((s) => s.estado === "En progreso").length,
    completados: visibleServices.filter((s) => s.estado === "Completado").length,
    bloqueados: visibleServices.filter((s) => s.estado === "Bloqueado").length,
    avgProgress: visibleServices.length > 0
      ? Math.round(visibleServices.reduce((sum, s) => sum + s.progreso, 0) / visibleServices.length)
      : 0,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700 }}>Supervisión y Control</h1>
          <p className="text-gray-500 text-sm">Monitoreo de progreso por área y colaborador</p>
        </div>
        {currentUser?.rol === "Administrador" && (
          <div className="flex gap-2 flex-wrap">
            {areas.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedArea(a.nombre)}
                className={`px-4 py-2 rounded-xl text-sm transition ${selectedArea === a.nombre ? "bg-blue-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"}`}
                style={{ fontWeight: selectedArea === a.nombre ? 600 : 400 }}
              >
                {a.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Area overview */}
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
            <p className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>{stat.value}</p>
            <p className="text-gray-500 text-xs">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Services list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Servicios del Área: {selectedArea}</h3>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full" style={{ fontWeight: 600 }}>{visibleServices.length} servicios</span>
            </div>
            <div className="divide-y divide-gray-50">
              {visibleServices.map((srv) => {
                const statusColors = {
                  "En progreso": "text-blue-600 bg-blue-50",
                  "Completado": "text-green-600 bg-green-50",
                  "Pendiente": "text-yellow-600 bg-yellow-50",
                  "Bloqueado": "text-red-600 bg-red-50",
                };
                return (
                  <div key={srv.id} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{srv.codigo}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[srv.estado]}`} style={{ fontWeight: 500 }}>{srv.estado}</span>
                        {srv.estado === "Bloqueado" && <AlertTriangle className="w-4 h-4 text-red-500" />}
                      </div>
                      <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>{srv.progreso}%</span>
                    </div>
                    <p className="text-gray-600 text-xs mb-2 truncate">{srv.descripcion}</p>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full ${srv.estado === "Completado" ? "bg-green-500" : srv.estado === "Bloqueado" ? "bg-red-500" : "bg-blue-600"}`}
                        style={{ width: `${srv.progreso}%` }}
                      />
                    </div>
                    {/* Technicians assigned */}
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      <div className="flex gap-1 flex-wrap">
                        {srv.tecnicos.map((t) => (
                          <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t.split(" ")[0]}</span>
                        ))}
                        {srv.tecnicos.length === 0 && <span className="text-xs text-gray-400">Sin asignar</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {visibleServices.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-sm">No hay servicios en esta área</div>
              )}
            </div>
          </div>

          {/* Performance chart */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="text-gray-800 mb-4" style={{ fontWeight: 600 }}>Desempeño por Colaborador</h3>
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

        {/* Collaborator cards */}
        <div className="space-y-3">
          <h3 className="text-gray-800 text-sm" style={{ fontWeight: 600 }}>Rendimiento de Colaboradores</h3>
          {areaCollaborators.map((c) => {
            const shortName = `${c.nombres.split(" ")[0]} ${c.apellidos.split(" ")[0]}`;
            const stats = getCollaboratorStats(shortName);
            return (
              <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs" style={{ fontWeight: 700 }}>
                      {c.nombres[0]}{c.apellidos[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 text-sm truncate" style={{ fontWeight: 600 }}>{c.nombres} {c.apellidos}</p>
                    <p className="text-gray-400 text-xs">{c.rol}</p>
                  </div>
                  <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${stats.efficiency >= 70 ? "bg-green-100 text-green-700" : stats.efficiency >= 40 ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"}`} style={{ fontWeight: 600 }}>
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
                      <p className={`text-base ${s.color}`} style={{ fontWeight: 700 }}>{s.value}</p>
                      <p className="text-gray-400 text-xs">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Eficiencia</span>
                    <span style={{ fontWeight: 600 }}>{stats.efficiency}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${stats.efficiency >= 70 ? "bg-green-500" : stats.efficiency >= 40 ? "bg-yellow-400" : "bg-gray-300"}`}
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
