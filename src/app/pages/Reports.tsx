import { useState } from "react";
import { servicios, colaboradores, areas } from "../data/mockData";
import {
  BarChart2, Download, TrendingUp, Users, MapPin, CheckCircle2,
  Clock, FileText, Filter,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, PieChart, Pie, Cell, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

type ReportType = "colaborador" | "area" | "servicios";

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>("area");
  const [period, setPeriod] = useState("mes");

  // Area report data
  const areaData = areas.map((a) => {
    const aServices = servicios.filter((s) => s.area === a.nombre);
    const completed = aServices.filter((s) => s.estado === "Completado").length;
    const avgProgress = aServices.length > 0
      ? Math.round(aServices.reduce((sum, s) => sum + s.progreso, 0) / aServices.length) : 0;
    return {
      name: a.nombre,
      total: aServices.length,
      completados: completed,
      "En progreso": aServices.filter(s => s.estado === "En progreso").length,
      productividad: avgProgress,
      colaboradores: colaboradores.filter(c => c.area === a.nombre && c.activo).length,
    };
  });

  // Collaborator report data
  const colabData = colaboradores.filter((c) => c.activo).map((c) => {
    const shortName = `${c.nombres.split(" ")[0]} ${c.apellidos.split(" ")[0]}`;
    const tasks = servicios.flatMap((s) => s.tareas.filter(t => t.responsable?.includes(c.nombres.split(" ")[0])));
    const completed = tasks.filter(t => t.completada).length;
    const efficiency = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
    return {
      name: shortName,
      area: c.area,
      completadas: completed,
      pendientes: tasks.filter(t => !t.completada).length,
      eficiencia: efficiency,
      servicios: servicios.filter(s => s.tecnicos.some(t => t.includes(c.nombres.split(" ")[0]))).length,
    };
  });

  // Trend data (simulated weekly)
  const trendData = [
    { semana: "Sem 1", completados: 3, iniciados: 5, bloqueados: 1 },
    { semana: "Sem 2", completados: 4, iniciados: 6, bloqueados: 0 },
    { semana: "Sem 3", completados: 2, iniciados: 4, bloqueados: 2 },
    { semana: "Sem 4", completados: 5, iniciados: 7, bloqueados: 1 },
  ];

  const pieData = [
    { name: "Completados", value: servicios.filter(s => s.estado === "Completado").length, color: "#16A34A" },
    { name: "En progreso", value: servicios.filter(s => s.estado === "En progreso").length, color: "#2563EB" },
    { name: "Pendientes", value: servicios.filter(s => s.estado === "Pendiente").length, color: "#F59E0B" },
    { name: "Bloqueados", value: servicios.filter(s => s.estado === "Bloqueado").length, color: "#DC2626" },
  ];

  const radarData = areas.map((a) => {
    const aServices = servicios.filter((s) => s.area === a.nombre);
    return {
      area: a.nombre.substring(0, 8),
      productividad: aServices.length > 0 ? Math.round(aServices.reduce((sum, s) => sum + s.progreso, 0) / aServices.length) : 0,
      volumen: aServices.length * 20,
      personal: colaboradores.filter(c => c.area === a.nombre && c.activo).length * 25,
    };
  });

  const handleExport = (format: "excel" | "pdf") => {
    alert(`Exportando reporte en formato ${format.toUpperCase()}...\n(Funcionalidad de exportación en implementación)`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700 }}>Reportes</h1>
          <p className="text-gray-500 text-sm">Análisis de rendimiento y productividad</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport("excel")}
            className="flex items-center gap-2 border border-green-600 text-green-700 hover:bg-green-50 px-4 py-2.5 rounded-xl text-sm transition"
            style={{ fontWeight: 600 }}
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="flex items-center gap-2 border border-red-600 text-red-700 hover:bg-red-50 px-4 py-2.5 rounded-xl text-sm transition"
            style={{ fontWeight: 600 }}
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Filter className="w-4 h-4" />
          <span style={{ fontWeight: 600 }}>Tipo de reporte:</span>
        </div>
        {([
          { id: "area", label: "Por Área", icon: MapPin },
          { id: "colaborador", label: "Por Colaborador", icon: Users },
          { id: "servicios", label: "Tendencia", icon: TrendingUp },
        ] as const).map((r) => (
          <button
            key={r.id}
            onClick={() => setReportType(r.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition ${reportType === r.id ? "bg-blue-900 text-white" : "border border-gray-200 text-gray-600 hover:border-blue-300"}`}
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total servicios", value: servicios.length, icon: BarChart2, color: "bg-blue-900", change: "↑ +2 vs semana pasada" },
          { label: "Completados", value: servicios.filter(s => s.estado === "Completado").length, icon: CheckCircle2, color: "bg-green-600", change: "↑ +1 esta semana" },
          { label: "Tiempo promedio", value: "3.2 días", icon: Clock, color: "bg-yellow-500", change: "↓ -0.5 días" },
          { label: "Eficiencia global", value: "78%", icon: TrendingUp, color: "bg-purple-600", change: "↑ +5%" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-3xl text-gray-900 mb-0.5" style={{ fontWeight: 700 }}>{stat.value}</p>
            <p className="text-gray-500 text-xs mb-1">{stat.label}</p>
            <p className={`text-xs ${stat.change.startsWith("↑") ? "text-green-600" : "text-red-600"}`} style={{ fontWeight: 500 }}>{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      {reportType === "area" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-gray-800 mb-4" style={{ fontWeight: 600 }}>Servicios por Área</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={areaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#1d4ed8" radius={[4, 4, 0, 0]} name="Total" />
                <Bar dataKey="completados" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Completados" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-gray-800 mb-4" style={{ fontWeight: 600 }}>Distribución de Estados</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Area table */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Detalle por Área</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Área", "Total Servicios", "Completados", "En Progreso", "Colaboradores", "Productividad"].map(h => (
                      <th key={h} className="text-left text-xs text-gray-500 px-4 py-3" style={{ fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {areaData.map((row) => (
                    <tr key={row.name} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900" style={{ fontWeight: 600 }}>{row.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.total}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-green-700 bg-green-50 px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>{row.completados}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>{row["En progreso"]}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.colaboradores}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${row.productividad}%` }} />
                          </div>
                          <span className="text-xs text-gray-700" style={{ fontWeight: 600 }}>{row.productividad}%</span>
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
            <h3 className="text-gray-800 mb-4" style={{ fontWeight: 600 }}>Tareas por Colaborador</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={colabData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="completadas" fill="#16A34A" radius={[4, 4, 0, 0]} name="Completadas" />
                <Bar dataKey="pendientes" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Pendientes" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-gray-800 mb-4" style={{ fontWeight: 600 }}>Radar de Desempeño por Área</h3>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="area" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fontSize: 10 }} />
                <Radar name="Productividad" dataKey="productividad" stroke="#1d4ed8" fill="#1d4ed8" fillOpacity={0.3} />
                <Radar name="Personal" dataKey="personal" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Reporte por Colaborador</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Colaborador", "Área", "Tareas Completadas", "Tareas Pendientes", "Servicios", "Eficiencia"].map(h => (
                      <th key={h} className="text-left text-xs text-gray-500 px-4 py-3" style={{ fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {colabData.map((row) => (
                    <tr key={row.name} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900" style={{ fontWeight: 600 }}>{row.name}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 bg-gray-50 rounded-lg">{row.area}</td>
                      <td className="px-4 py-3 text-sm text-green-700" style={{ fontWeight: 600 }}>{row.completadas}</td>
                      <td className="px-4 py-3 text-sm text-yellow-700" style={{ fontWeight: 600 }}>{row.pendientes}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.servicios}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${row.eficiencia >= 70 ? "bg-green-500" : row.eficiencia >= 40 ? "bg-yellow-400" : "bg-gray-300"}`}
                              style={{ width: `${row.eficiencia}%` }}
                            />
                          </div>
                          <span className="text-xs" style={{ fontWeight: 600 }}>{row.eficiencia}%</span>
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
            <h3 className="text-gray-800 mb-4" style={{ fontWeight: 600 }}>Tendencia Semanal de Servicios</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="semana" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="completados" stroke="#16A34A" strokeWidth={2} dot={{ r: 4 }} name="Completados" />
                <Line type="monotone" dataKey="iniciados" stroke="#2563EB" strokeWidth={2} dot={{ r: 4 }} name="Iniciados" />
                <Line type="monotone" dataKey="bloqueados" stroke="#DC2626" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} name="Bloqueados" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
