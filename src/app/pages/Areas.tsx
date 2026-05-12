import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  MapPin,
  Users,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Edit2,
  ChevronRight,
  Loader2,
} from "lucide-react";

// ── Tipos con los nombres de columna REALES de Supabase ──
type Area = {
  area_id: number;
  area_nombre: string;
  area_descripcion: string | null;
  area_encargado_id: number | null;
};

type Usuario = {
  usuario_id: number;
  usuario_nombres: string;
  usuario_apellido_paterno: string | null;
  usuario_apellido_materno: string | null;
  usuario_username: string;
  usuario_rol: string;
  usuario_activo: boolean;
};

type Servicio = {
  servicio_id: number;
  servicio_nombre: string | null;
  servicio_descripcion: string | null;
  servicio_estado: string;
  area_id: number | null;
};

type AreaForm = {
  nombre: string;
  descripcion: string;
  encargadoId: number | "";
};

const emptyForm: AreaForm = {
  nombre: "",
  descripcion: "",
  encargadoId: "",
};

const statusColors: Record<string, string> = {
  "En progreso": "text-blue-600 bg-blue-50",
  Completado: "text-green-600 bg-green-50",
  Pendiente: "text-yellow-600 bg-yellow-50",
  Bloqueado: "text-red-600 bg-red-50",
  Cancelado: "text-gray-600 bg-gray-50",
};

export default function Areas() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [form, setForm] = useState<AreaForm>(emptyForm);

  const selected = useMemo(
    () => areas.find((a) => a.area_id === selectedAreaId) || null,
    [areas, selectedAreaId]
  );

  // ── Fetch ──
  const fetchData = async () => {
    setLoading(true);
    try {
      const [areasRes, usuariosRes, serviciosRes] = await Promise.all([
        supabase
          .from("areas")
          .select("area_id, area_nombre, area_descripcion, area_encargado_id")
          .order("area_nombre"),
        supabase
          .from("usuarios")
          .select(
            "usuario_id, usuario_nombres, usuario_apellido_paterno, usuario_apellido_materno, usuario_username, usuario_rol, usuario_activo"
          )
          .order("usuario_nombres"),
        supabase
          .from("servicios")
          .select(
            "servicio_id, servicio_nombre, servicio_descripcion, servicio_estado, area_id"
          ),
      ]);

      if (areasRes.error) throw areasRes.error;
      if (usuariosRes.error) throw usuariosRes.error;
      if (serviciosRes.error) throw serviciosRes.error;

      const nextAreas = (areasRes.data || []) as Area[];
      setAreas(nextAreas);
      setUsuarios((usuariosRes.data || []) as Usuario[]);
      setServicios((serviciosRes.data || []) as Servicio[]);
      setSelectedAreaId((prev) => {
        if (prev && nextAreas.some((a) => a.area_id === prev)) return prev;
        return nextAreas[0]?.area_id ?? null;
      });
    } catch (err) {
      console.error(err);
      alert("Error al cargar datos de áreas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Helpers ──
  const getUserDisplayName = (u: Usuario) => {
    const p = u.usuario_apellido_paterno || "";
    const m = u.usuario_apellido_materno ? ` ${u.usuario_apellido_materno}` : "";
    return `${u.usuario_nombres} ${p}${m}`.trim();
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const getEncargado = (area: Area) =>
    usuarios.find((u) => u.usuario_id === area.area_encargado_id) || null;

  const getAreaStats = (areaId: number) => {
    const srvs = servicios.filter((s) => s.area_id === areaId);
    return {
      total: srvs.length,
      enProgreso: srvs.filter((s) => s.servicio_estado === "En progreso").length,
      completados: srvs.filter((s) => s.servicio_estado === "Completado").length,
    };
  };

  // Colaboradores: usuarios activos con rol Colaborador
  // (la tabla area_colaboradores existe pero usa UUID vs INT, no se puede usar)
  const colaboradores = useMemo(
    () => usuarios.filter((u) => u.usuario_activo && u.usuario_rol === "Colaborador"),
    [usuarios]
  );

  // ── Modal ──
  const openCreate = () => {
    setEditingArea(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (area: Area) => {
    setEditingArea(area);
    setForm({
      nombre: area.area_nombre,
      descripcion: area.area_descripcion || "",
      encargadoId: area.area_encargado_id ?? "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingArea(null);
    setForm(emptyForm);
  };

  // ── Save ──
  const handleSave = async () => {
    if (!form.nombre.trim() || form.encargadoId === "") {
      alert("Completa el nombre y selecciona un encargado");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        area_nombre: form.nombre.trim(),
        area_descripcion: form.descripcion.trim() || null,
        area_encargado_id: form.encargadoId,
      };

      if (editingArea) {
        const { error } = await supabase
          .from("areas")
          .update(payload)
          .eq("area_id", editingArea.area_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("areas").insert([payload]);
        if (error) throw error;
      }

      closeModal();
      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Error al guardar el área");
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin w-8 h-8 text-blue-900" />
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700 }}>
            Áreas de Servicio
          </h1>
          <p className="text-gray-500 text-sm">
            {areas.length} áreas registradas
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm transition"
          style={{ fontWeight: 600 }}
        >
          <Plus className="w-4 h-4" />
          Nueva Área
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Sidebar de áreas ── */}
        <div className="lg:col-span-1 space-y-3">
          {areas.map((area) => {
            const stats = getAreaStats(area.area_id);
            const isSelected = selectedAreaId === area.area_id;
            return (
              <button
                key={area.area_id}
                onClick={() =>
                  setSelectedAreaId(isSelected ? null : area.area_id)
                }
                className={`w-full text-left rounded-2xl p-5 shadow-sm border transition ${
                  isSelected
                    ? "bg-blue-900 border-blue-800 text-white"
                    : "bg-white border-gray-100 hover:border-blue-200"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isSelected ? "bg-yellow-400" : "bg-blue-900"
                      }`}
                    >
                      <MapPin
                        className={`w-5 h-5 ${
                          isSelected ? "text-blue-900" : "text-yellow-400"
                        }`}
                      />
                    </div>
                    <div>
                      <p
                        className={`text-sm ${
                          isSelected ? "text-white" : "text-gray-900"
                        }`}
                        style={{ fontWeight: 700 }}
                      >
                        {area.area_nombre}
                      </p>
                      <p
                        className={`text-xs ${
                          isSelected ? "text-blue-200" : "text-gray-500"
                        }`}
                      >
                        {getAreaStats(area.area_id).total} servicios
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 ${
                      isSelected
                        ? "text-yellow-400 rotate-90"
                        : "text-gray-400"
                    }`}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: "Total",
                      value: stats.total,
                      color: isSelected ? "bg-blue-800" : "bg-gray-100",
                    },
                    {
                      label: "Activos",
                      value: stats.enProgreso,
                      color: isSelected ? "bg-blue-700" : "bg-blue-50",
                    },
                    {
                      label: "Listos",
                      value: stats.completados,
                      color: isSelected ? "bg-green-800" : "bg-green-50",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className={`${s.color} rounded-xl p-2 text-center`}
                    >
                      <p
                        className={`text-base ${
                          isSelected ? "text-white" : "text-gray-900"
                        }`}
                        style={{ fontWeight: 700 }}
                      >
                        {s.value}
                      </p>
                      <p
                        className={`text-xs ${
                          isSelected ? "text-blue-200" : "text-gray-500"
                        }`}
                      >
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
          {areas.length === 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center text-sm text-gray-400">
              No hay áreas registradas
            </div>
          )}
        </div>

        {/* ── Detalle ── */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="space-y-4">
              {/* Info del área */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-900 rounded-2xl flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                      <h2 className="text-gray-900" style={{ fontWeight: 700 }}>
                        {selected.area_nombre}
                      </h2>
                      <p className="text-gray-500 text-sm">
                        {selected.area_descripcion || "Sin descripción"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => openEdit(selected)}
                    className="p-2 rounded-xl hover:bg-gray-100 text-gray-500"
                    title="Editar área"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
                  <p
                    className="text-xs text-yellow-700 mb-2"
                    style={{ fontWeight: 600 }}
                  >
                    ENCARGADO DEL ÁREA
                  </p>
                  {getEncargado(selected) ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                        <span
                          className="text-blue-900 text-sm"
                          style={{ fontWeight: 700 }}
                        >
                          {getInitials(
                            getUserDisplayName(getEncargado(selected)!)
                          )}
                        </span>
                      </div>
                      <div>
                        <p
                          className="text-gray-900 text-sm"
                          style={{ fontWeight: 600 }}
                        >
                          {getUserDisplayName(getEncargado(selected)!)}
                        </p>
                        <p className="text-gray-500 text-xs">
                          Encargado de área
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No hay encargado asignado
                    </p>
                  )}
                </div>
              </div>

              {/* Colaboradores */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-blue-800" />
                  <h3 className="text-gray-800" style={{ fontWeight: 600 }}>
                    Colaboradores
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {colaboradores.map((u) => (
                    <div
                      key={u.usuario_id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                    >
                      <div className="w-9 h-9 bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <span
                          className="text-white text-xs"
                          style={{ fontWeight: 700 }}
                        >
                          {getInitials(getUserDisplayName(u))}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-gray-900 text-sm truncate"
                          style={{ fontWeight: 600 }}
                        >
                          {getUserDisplayName(u)}
                        </p>
                        <p className="text-gray-500 text-xs">
                          @{u.usuario_username}
                        </p>
                      </div>
                    </div>
                  ))}
                  {colaboradores.length === 0 && (
                    <p className="text-gray-400 text-sm col-span-2">
                      No hay colaboradores registrados
                    </p>
                  )}
                </div>
              </div>

              {/* Servicios del área */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <ClipboardList className="w-5 h-5 text-blue-800" />
                  <h3 className="text-gray-800" style={{ fontWeight: 600 }}>
                    Servicios del Área
                  </h3>
                </div>
                <div className="space-y-3">
                  {servicios
                    .filter((s) => s.area_id === selected.area_id)
                    .map((srv) => {
                      const color = statusColors[srv.servicio_estado] || "text-gray-600 bg-gray-50";
                      return (
                        <div
                          key={srv.servicio_id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}
                          >
                            {srv.servicio_estado === "Completado" ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : srv.servicio_estado === "Bloqueado" ||
                              srv.servicio_estado === "Cancelado" ? (
                              <AlertTriangle className="w-4 h-4" />
                            ) : (
                              <Clock className="w-4 h-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-gray-900 text-sm"
                              style={{ fontWeight: 600 }}
                            >
                              {srv.servicio_nombre || "Sin nombre"}
                            </p>
                            <p className="text-gray-500 text-xs truncate">
                              {srv.servicio_descripcion || "Sin descripción"}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span
                              className={`text-xs ${color} px-2 py-0.5 rounded-full`}
                              style={{ fontWeight: 500 }}
                            >
                              {srv.servicio_estado}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  {servicios.filter((s) => s.area_id === selected.area_id)
                    .length === 0 && (
                    <p className="text-gray-400 text-sm">
                      No hay servicios en esta área
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center h-full min-h-64">
              <MapPin className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">
                Selecciona un área para ver su detalle
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-gray-900" style={{ fontWeight: 700 }}>
                {editingArea
                  ? "Editar Área de Servicio"
                  : "Nueva Área de Servicio"}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Nombre */}
              <div>
                <label
                  className="block text-xs text-gray-600 mb-1"
                  style={{ fontWeight: 600 }}
                >
                  Nombre del Área *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Mantenimiento Industrial"
                  value={form.nombre}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, nombre: e.target.value }))
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50"
                />
              </div>

              {/* Encargado */}
              <div className="border border-blue-100 rounded-xl p-4 bg-blue-50 space-y-3">
                <p
                  className="text-xs text-blue-800"
                  style={{ fontWeight: 700 }}
                >
                  <MapPin className="w-3.5 h-3.5 inline mr-1" />
                  ASIGNAR ENCARGADO
                </p>
                <div>
                  <label
                    className="block text-xs text-gray-600 mb-1"
                    style={{ fontWeight: 600 }}
                  >
                    Encargado *
                  </label>
                  <select
                    value={form.encargadoId}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        encargadoId: e.target.value ? Number(e.target.value) : "",
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="">Seleccione usuario</option>
                    {usuarios
                      .filter((u) => u.usuario_activo)
                      .map((u) => (
                        <option key={u.usuario_id} value={u.usuario_id}>
                          {getUserDisplayName(u)} (@{u.usuario_username})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label
                  className="block text-xs text-gray-600 mb-1"
                  style={{ fontWeight: 600 }}
                >
                  Descripción
                </label>
                <textarea
                  placeholder="Descripción del área..."
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, descripcion: e.target.value }))
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={closeModal}
                className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-900 text-white rounded-xl py-2.5 text-sm hover:bg-blue-800 transition flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ fontWeight: 600 }}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingArea ? "Guardar cambios" : "Crear Área"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
