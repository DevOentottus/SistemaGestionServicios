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

type Area = {
  id: string;
  nombre: string;
  descripcion: string | null;
  encargado: string | null;
};

type Usuario = {
  id_usuario: string;
  nombres: string;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  username: string;
  rol: "Administrador" | "Encargado" | "Colaborador" | "Cliente";
  activo: boolean;
  id_area_principal: string | null;
  id_area_adicional: string | null;
  encargado_area_principal: boolean;
  encargado_area_adicional: boolean;
};

type Servicio = {
  id: string;
  codigo: string | null;
  descripcion: string | null;
  estado: "Pendiente" | "En progreso" | "Completado" | "Bloqueado";
  progreso: number | null;
  area: string | null;
};

type AreaForm = {
  nombre: string;
  descripcion: string;
  usuarioAsignadoId: string;
  collaboratorIds: string[];
};

const emptyForm: AreaForm = {
  nombre: "",
  descripcion: "",
  usuarioAsignadoId: "",
  collaboratorIds: [],
};

export default function Areas() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [form, setForm] = useState<AreaForm>(emptyForm);

  const selected = useMemo(
    () => areas.find((a) => a.id === selectedAreaId) || null,
    [areas, selectedAreaId]
  );

  const statusColors: Record<Servicio["estado"], string> = {
    "En progreso": "text-blue-600 bg-blue-50",
    Completado: "text-green-600 bg-green-50",
    Pendiente: "text-yellow-600 bg-yellow-50",
    Bloqueado: "text-red-600 bg-red-50",
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [areasRes, usuariosRes, serviciosRes] = await Promise.all([
        supabase.from("areas").select("id, nombre, descripcion, encargado").order("nombre"),
        supabase
          .from("usuarios")
          .select(
            "id_usuario, nombres, apellido_paterno, apellido_materno, username, rol, activo, id_area_principal, id_area_adicional, encargado_area_principal, encargado_area_adicional"
          )
          .order("nombres"),
        supabase.from("servicios").select("id, codigo, descripcion, estado, progreso, area"),
      ]);

      if (areasRes.error) throw areasRes.error;
      if (usuariosRes.error) throw usuariosRes.error;
      if (serviciosRes.error) throw serviciosRes.error;

      const nextAreas = (areasRes.data || []) as Area[];
      setAreas(nextAreas);
      setUsuarios((usuariosRes.data || []) as Usuario[]);
      setServicios((serviciosRes.data || []) as Servicio[]);
      setSelectedAreaId((prev) => {
        if (prev && nextAreas.some((a) => a.id === prev)) return prev;
        return nextAreas[0]?.id || null;
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

  const getUserDisplayName = (u: Usuario) => {
    const paterno = u.apellido_paterno || "";
    const materno = u.apellido_materno ? ` ${u.apellido_materno}` : "";
    return `${u.nombres} ${paterno}${materno}`.trim();
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const getEncargadoUser = (area: Area) => usuarios.find((u) => u.id_usuario === area.encargado) || null;

  const getAreaStats = (areaId: string) => {
    const srvs = servicios.filter((s) => s.area === areaId);
    return {
      total: srvs.length,
      enProgreso: srvs.filter((s) => s.estado === "En progreso").length,
      completados: srvs.filter((s) => s.estado === "Completado").length,
    };
  };

  const getAreaCollaborators = (areaId: string) =>
    usuarios.filter(
      (u) =>
        u.activo &&
        u.rol === "Colaborador" &&
        (u.id_area_principal === areaId || u.id_area_adicional === areaId)
    );

  const openCreate = () => {
    setEditingArea(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (area: Area) => {
    setEditingArea(area);
    setForm({
      nombre: area.nombre,
      descripcion: area.descripcion || "",
      usuarioAsignadoId: area.encargado || "",
      collaboratorIds: getAreaCollaborators(area.id).map((u) => u.id_usuario),
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingArea(null);
    setForm(emptyForm);
  };

  const assignUserInArea = async (userId: string, areaId: string) => {
    const user = usuarios.find((u) => u.id_usuario === userId);
    if (!user) return;

    const updateData: Partial<Usuario> = {
      rol: "Encargado",
    };

    if (user.id_area_principal === areaId) {
      updateData.encargado_area_principal = true;
    } else if (user.id_area_adicional === areaId) {
      updateData.encargado_area_adicional = true;
    } else if (!user.id_area_principal) {
      updateData.id_area_principal = areaId;
      updateData.encargado_area_principal = true;
    } else if (!user.id_area_adicional) {
      updateData.id_area_adicional = areaId;
      updateData.encargado_area_adicional = true;
    } else {
      // Si ya tiene ambas áreas ocupadas, no reasignamos áreas.
    }

    const { error } = await supabase.from("usuarios").update(updateData).eq("id_usuario", userId);
    if (error) throw error;
  };

  const maybeDemotePreviousManager = async (previousManagerId: string, currentAreaId: string) => {
    const { data: managedAreas, error: managedAreasError } = await supabase
      .from("areas")
      .select("id")
      .eq("encargado", previousManagerId);
    if (managedAreasError) throw managedAreasError;

    const stillManagerInOtherArea = (managedAreas || []).some((a) => a.id !== currentAreaId);
    if (stillManagerInOtherArea) return;

    const previousUser = usuarios.find((u) => u.id_usuario === previousManagerId);
    if (!previousUser) return;

    const demotionData: Partial<Usuario> = {
      encargado_area_principal: false,
      encargado_area_adicional: false,
    };
    if (previousUser.rol === "Encargado") {
      demotionData.rol = "Colaborador";
    }

    const { error } = await supabase.from("usuarios").update(demotionData).eq("id_usuario", previousManagerId);
    if (error) throw error;
  };

  const syncAreaCollaborators = async (areaId: string, collaboratorIds: string[]) => {
    const currentCollaborators = getAreaCollaborators(areaId);
    const currentIds = new Set(currentCollaborators.map((u) => u.id_usuario));
    const targetIds = new Set(collaboratorIds);

    const toAdd = collaboratorIds.filter((id) => !currentIds.has(id));
    const toRemove = currentCollaborators.filter((u) => !targetIds.has(u.id_usuario));

    for (const userId of toAdd) {
      const user = usuarios.find((u) => u.id_usuario === userId);
      if (!user) continue;

      const updateData: Partial<Usuario> = { rol: "Colaborador" };
      if (user.id_area_principal === areaId || user.id_area_adicional === areaId) {
        // already assigned
      } else if (!user.id_area_principal) {
        updateData.id_area_principal = areaId;
        updateData.encargado_area_principal = false;
      } else if (!user.id_area_adicional) {
        updateData.id_area_adicional = areaId;
        updateData.encargado_area_adicional = false;
      } else {
        continue;
      }

      const { error } = await supabase.from("usuarios").update(updateData).eq("id_usuario", userId);
      if (error) throw error;
    }

    for (const user of toRemove) {
      const updateData: Partial<Usuario> = {};
      if (user.id_area_principal === areaId) {
        updateData.id_area_principal = null;
        updateData.encargado_area_principal = false;
      }
      if (user.id_area_adicional === areaId) {
        updateData.id_area_adicional = null;
        updateData.encargado_area_adicional = false;
      }
      if (Object.keys(updateData).length === 0) continue;

      const { error } = await supabase
        .from("usuarios")
        .update(updateData)
        .eq("id_usuario", user.id_usuario);
      if (error) throw error;
    }
  };

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.usuarioAsignadoId) {
      alert("Completa el nombre y selecciona un usuario");
      return;
    }

    setSaving(true);
    try {
      const areaPayload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        encargado: form.usuarioAsignadoId,
      };

      let savedArea: Area;
      if (editingArea) {
        const { data, error } = await supabase
          .from("areas")
          .update(areaPayload)
          .eq("id", editingArea.id)
          .select("id, nombre, descripcion, encargado")
          .single();
        if (error) throw error;
        savedArea = data as Area;
      } else {
        const { data, error } = await supabase
          .from("areas")
          .insert([areaPayload])
          .select("id, nombre, descripcion, encargado")
          .single();
        if (error) throw error;
        savedArea = data as Area;
      }

      if (editingArea?.encargado && editingArea.encargado !== form.usuarioAsignadoId) {
        await maybeDemotePreviousManager(editingArea.encargado, savedArea.id);
      }
      await assignUserInArea(form.usuarioAsignadoId, savedArea.id);
      await syncAreaCollaborators(savedArea.id, form.collaboratorIds);

      closeModal();
      await fetchData();
      setSelectedAreaId(savedArea.id);
    } catch (err) {
      console.error(err);
      alert("Error al guardar el área");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin w-8 h-8 text-blue-900" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700 }}>Áreas de Servicio</h1>
          <p className="text-gray-500 text-sm">{areas.length} áreas registradas</p>
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
        <div className="lg:col-span-1 space-y-3">
          {areas.map((area) => {
            const stats = getAreaStats(area.id);
            const colabs = getAreaCollaborators(area.id);
            const isSelected = selectedAreaId === area.id;
            return (
              <button
                key={area.id}
                onClick={() => setSelectedAreaId(isSelected ? null : area.id)}
                className={`w-full text-left rounded-2xl p-5 shadow-sm border transition ${
                  isSelected ? "bg-blue-900 border-blue-800 text-white" : "bg-white border-gray-100 hover:border-blue-200"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? "bg-yellow-400" : "bg-blue-900"}`}>
                      <MapPin className={`w-5 h-5 ${isSelected ? "text-blue-900" : "text-yellow-400"}`} />
                    </div>
                    <div>
                      <p className={`text-sm ${isSelected ? "text-white" : "text-gray-900"}`} style={{ fontWeight: 700 }}>{area.nombre}</p>
                      <p className={`text-xs ${isSelected ? "text-blue-200" : "text-gray-500"}`}>{colabs.length} colaboradores</p>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${isSelected ? "text-yellow-400 rotate-90" : "text-gray-400"}`} />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Total", value: stats.total, color: isSelected ? "bg-blue-800" : "bg-gray-100" },
                    { label: "Activos", value: stats.enProgreso, color: isSelected ? "bg-blue-700" : "bg-blue-50" },
                    { label: "Listos", value: stats.completados, color: isSelected ? "bg-green-800" : "bg-green-50" },
                  ].map((s) => (
                    <div key={s.label} className={`${s.color} rounded-xl p-2 text-center`}>
                      <p className={`text-base ${isSelected ? "text-white" : "text-gray-900"}`} style={{ fontWeight: 700 }}>{s.value}</p>
                      <p className={`text-xs ${isSelected ? "text-blue-200" : "text-gray-500"}`}>{s.label}</p>
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

        <div className="lg:col-span-2">
          {selected ? (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-900 rounded-2xl flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                      <h2 className="text-gray-900" style={{ fontWeight: 700 }}>Área: {selected.nombre}</h2>
                      <p className="text-gray-500 text-sm">{selected.descripcion || "Sin descripción"}</p>
                    </div>
                  </div>
                  <button onClick={() => openEdit(selected)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500" title="Editar área">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
                  <p className="text-xs text-yellow-700 mb-2" style={{ fontWeight: 600 }}>ENCARGADO DEL ÁREA</p>
                  {getEncargadoUser(selected) ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                        <span className="text-blue-900 text-sm" style={{ fontWeight: 700 }}>
                          {getInitials(getUserDisplayName(getEncargadoUser(selected)!))}
                        </span>
                      </div>
                      <div>
                        <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{getUserDisplayName(getEncargadoUser(selected)!)}</p>
                        <p className="text-gray-500 text-xs">Encargado de área</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No hay encargado asignado</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-blue-800" />
                  <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Colaboradores del Área</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {getAreaCollaborators(selected.id).map((u) => (
                    <div key={u.id_usuario} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-9 h-9 bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs" style={{ fontWeight: 700 }}>
                          {getInitials(getUserDisplayName(u))}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-gray-900 text-sm truncate" style={{ fontWeight: 600 }}>{getUserDisplayName(u)}</p>
                        <p className="text-gray-500 text-xs">{u.rol} · @{u.username}</p>
                      </div>
                    </div>
                  ))}
                  {getAreaCollaborators(selected.id).length === 0 && (
                    <p className="text-gray-400 text-sm col-span-2">No hay colaboradores activos en esta área</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <ClipboardList className="w-5 h-5 text-blue-800" />
                  <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Servicios del Área</h3>
                </div>
                <div className="space-y-3">
                  {servicios.filter((s) => s.area === selected.id).map((srv) => {
                    const statusCfg = statusColors[srv.estado];
                    return (
                      <div key={srv.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${statusCfg}`}>
                          {srv.estado === "Completado" ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : srv.estado === "Bloqueado" ? (
                            <AlertTriangle className="w-4 h-4" />
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{srv.codigo || "Sin código"}</p>
                          <p className="text-gray-500 text-xs truncate">{srv.descripcion || "Sin descripción"}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-xs ${statusCfg} px-2 py-0.5 rounded-full`} style={{ fontWeight: 500 }}>{srv.estado}</p>
                          <p className="text-gray-400 text-xs mt-1">{srv.progreso || 0}%</p>
                        </div>
                      </div>
                    );
                  })}
                  {servicios.filter((s) => s.area === selected.id).length === 0 && (
                    <p className="text-gray-400 text-sm">No hay servicios en esta área</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center h-full min-h-64">
              <MapPin className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">Selecciona un área para ver su detalle</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-gray-900" style={{ fontWeight: 700 }}>
                {editingArea ? "Editar Área de Servicio" : "Nueva Área de Servicio"}
              </h3>
              <button onClick={closeModal} className="p-2 rounded-lg hover:bg-gray-100">✕</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>Nombre del Área *</label>
                <input
                  type="text"
                  placeholder="Ej: Mantenimiento Industrial"
                  value={form.nombre}
                  onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50"
                />
              </div>
              <div>
                <div className="border border-blue-100 rounded-xl p-4 bg-blue-50 space-y-3">
                  <p className="text-xs text-blue-800" style={{ fontWeight: 700 }}>
                    <MapPin className="w-3.5 h-3.5 inline mr-1" />
                    ASIGNAR ENCARGADO
                  </p>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>Usuario asignado *</label>
                    <select
                      value={form.usuarioAsignadoId}
                      onChange={(e) => setForm((p) => ({ ...p, usuarioAsignadoId: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-white"
                    >
                      <option value="">Seleccione usuario</option>
                      {usuarios
                        .filter((u) => u.activo)
                        .map((u) => (
                          <option key={u.id_usuario} value={u.id_usuario}>
                            {getUserDisplayName(u)} (@{u.username})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="bg-white rounded-lg px-3 py-2 border border-gray-200 flex items-center justify-between">
                    <span className="text-xs text-gray-500">Rol efectivo:</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800"
                      style={{ fontWeight: 700 }}
                    >
                      Encargado
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-2">
                  <p className="text-xs text-gray-700" style={{ fontWeight: 700 }}>
                    COLABORADORES DEL AREA (SOLO ROL COLABORADOR)
                  </p>
                  <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                    {usuarios
                      .filter((u) => u.activo && u.rol === "Colaborador")
                      .map((u) => {
                        const checked = form.collaboratorIds.includes(u.id_usuario);
                        return (
                          <label key={u.id_usuario} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  collaboratorIds: e.target.checked
                                    ? [...prev.collaboratorIds, u.id_usuario]
                                    : prev.collaboratorIds.filter((id) => id !== u.id_usuario),
                                }))
                              }
                              className="rounded border-gray-300 text-blue-700 focus:ring-blue-500"
                            />
                            <span>{getUserDisplayName(u)} (@{u.username})</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>Descripción</label>
                <textarea
                  placeholder="Descripción del área..."
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={closeModal} className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition">Cancelar</button>
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
