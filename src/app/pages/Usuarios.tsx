import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import {
  UserPlus, Search, Edit2, ToggleLeft, ToggleRight, X, Check, ChevronDown,
  Shield, MapPin, Key, Loader2,
} from "lucide-react";

// ===================== TIPOS =====================
type Area = {
  id: string;
  nombre: string;
};

type Usuario = {
  usuario_id: number;
  usuario_dni: string | null;
  usuario_nombres: string;
  usuario_apellido_paterno: string;
  usuario_apellido_materno: string | null;
  usuario_telefono: string | null;
  usuario_correo: string;
  usuario_username: string;
  usuario_rol: "Administrador" | "Encargado" | "Colaborador" | "Cliente";
  usuario_id_area_principal: string | null;
  usuario_id_area_adicional: string | null;
  usuario_encargado_area_principal: boolean;
  usuario_encargado_area_adicional: boolean;
  usuario_activo: boolean;
  usuario_ultimo_login: string | null;
};

type UsuarioForm = {
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  telefono: string;
  correo: string;
  rol: Usuario["usuario_rol"];
  id_area_principal: string;
  id_area_adicional: string;
  encargado_area_principal: boolean;
  encargado_area_adicional: boolean;
  password: string;
  confirmPassword: string;
};

type BasicFormFieldKey =
  | "dni"
  | "telefono"
  | "nombres"
  | "apellido_paterno"
  | "apellido_materno";

const NONE_AREA = "— Ninguna —";
const rolColors: Record<string, string> = {
  Administrador: "bg-blue-100 text-blue-800",
  Encargado: "bg-purple-100 text-purple-800",
  Colaborador: "bg-yellow-100 text-yellow-800",
  Cliente: "bg-green-100 text-green-800",
};

const emptyForm = (defaultAreaId: string): UsuarioForm => ({
  dni: "",
  nombres: "",
  apellido_paterno: "",
  apellido_materno: "",
  telefono: "",
  correo: "",
  rol: "Colaborador",
  id_area_principal: defaultAreaId,
  id_area_adicional: "",
  encargado_area_principal: false,
  encargado_area_adicional: false,
  password: "",
  confirmPassword: "",
});

// ===================== COMPONENTE PRINCIPAL =====================
export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterArea, setFilterArea] = useState("Todas");
  const [filterRol, setFilterRol] = useState("Todos");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [form, setForm] = useState<UsuarioForm>(emptyForm(""));
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<Usuario | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // Cargar áreas y usuarios al montar
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Áreas
      const { data: areasData, error: areasError } = await supabase
        .from("areas")
        .select("id, nombre")
        .order("nombre");
      if (areasError) console.error(areasError);
      else setAreas(areasData || []);

      // Usuarios
      const { data: usersData, error: usersError } = await supabase
        .from("usuarios")
        .select("*")
        .order("usuario_nombres");
      if (usersError) console.error(usersError);
      else setUsuarios(usersData || []);

      setLoading(false);
    };
    fetchData();
  }, []);

  // Generar username único: 3 primeras letras del nombre + apellido paterno
  const generateUsername = (nombres: string, apellido_paterno: string, currentId?: number) => {
    const firstName = nombres.split(" ")[0]?.toLowerCase().replace(/[^a-z]/g, "") || "usu";
    const firstLastName = apellido_paterno.split(" ")[0]?.toLowerCase().replace(/[^a-z]/g, "") || "user";
    const base = `${firstName.slice(0, 3)}${firstLastName}`;
    let candidate = `${base}${String(1).padStart(2, "0")}`;
    let counter = 1;
    while (usuarios.some(u => u.usuario_username === candidate && u.usuario_id !== currentId)) {
      counter += 1;
      candidate = `${base}${String(counter).padStart(2, "0")}`;
    }
    return candidate;
  };

  const getInitials = (u: Usuario) => {
    const n = u.usuario_nombres?.charAt(0) ?? "";
    const a = u.usuario_apellido_paterno?.charAt(0) ?? "";
    return `${n}${a}` || "U";
  };

  const getIdInterno = (u: Usuario) => {
    const id = String(u.usuario_id);
    const normalized = id.replace(/-/g, "").slice(-6).toUpperCase();
    if (normalized) return `USR-${normalized}`;
    return "USR-—";
  };

  const getFullLastName = (u: Usuario) => {
    return `${u.usuario_apellido_paterno}${u.usuario_apellido_materno ? ` ${u.usuario_apellido_materno}` : ""}`;
  };

  // Obtener nombre del área por ID
  const getAreaName = (areaId: string | null) => {
    if (!areaId) return NONE_AREA;
    const area = areas.find(a => a.id === areaId);
    return area ? area.nombre : NONE_AREA;
  };

  const isAdmin = form.rol === "Administrador";
  // Administrador tiene prioridad sobre encargado para el rol efectivo.
  const effectiveRol: Usuario["usuario_rol"] = isAdmin
    ? "Administrador"
    : form.encargado_area_principal || form.encargado_area_adicional
      ? "Encargado"
      : "Colaborador";

  const hasSecondaryArea = !!form.id_area_adicional;
  const canSave = !!form.nombres && !!form.apellido_paterno && !!form.correo;
  const basicFormFields: Array<{ label: string; key: BasicFormFieldKey; placeholder: string }> = [
    { label: "DNI", key: "dni", placeholder: "Ej: 74521896" },
    { label: "Teléfono", key: "telefono", placeholder: "Ej: 987654321" },
    { label: "Nombres", key: "nombres", placeholder: "Nombres completos" },
    { label: "Apellido paterno", key: "apellido_paterno", placeholder: "Apellido paterno" },
    { label: "Apellido materno", key: "apellido_materno", placeholder: "Apellido materno (opcional)" },
  ];
  const areaPrincipalNombre = getAreaName(form.id_area_principal || null);
  const areaAdicionalNombre = getAreaName(form.id_area_adicional || null);
  const areaPrincipalLabel = areaPrincipalNombre === NONE_AREA ? "Sin área" : areaPrincipalNombre;
  const areaAdicionalLabel = areaAdicionalNombre === NONE_AREA ? "Sin área" : areaAdicionalNombre;

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setSelectedUserForPassword(null);
    setNewPassword("");
    setConfirmNewPassword("");
  };

  const openPasswordModal = (user: Usuario) => {
    setSelectedUserForPassword(user);
    setNewPassword("");
    setConfirmNewPassword("");
    setShowPasswordModal(true);
  };

  const openAdd = () => {
    setEditingUser(null);
    const defaultAreaId = areas[0]?.id || "";
    setForm(emptyForm(defaultAreaId));
    setShowModal(true);
  };

  const openEdit = (user: Usuario) => {
    setEditingUser(user);
    setForm({
      dni: user.usuario_dni ?? "",
      nombres: user.usuario_nombres,
      apellido_paterno: user.usuario_apellido_paterno,
      apellido_materno: user.usuario_apellido_materno ?? "",
      telefono: user.usuario_telefono ?? "",
      correo: user.usuario_correo,
      rol: user.usuario_rol,
      id_area_principal: user.usuario_id_area_principal ?? "",
      id_area_adicional: user.usuario_id_area_adicional ?? "",
      encargado_area_principal: user.usuario_encargado_area_principal,
      encargado_area_adicional: user.usuario_encargado_area_adicional,
      password: "",
      confirmPassword: "",
    });
    setShowModal(true);
  };

  // Filtrar usuarios
  const filtered = usuarios.filter((u) => {
    const matchSearch = `${u.usuario_nombres} ${u.usuario_apellido_paterno} ${u.usuario_apellido_materno || ""} ${u.usuario_dni || ""} ${u.usuario_correo}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const userAreaNames = [getAreaName(u.usuario_id_area_principal), getAreaName(u.usuario_id_area_adicional)].filter(a => a !== NONE_AREA);
    const matchArea = filterArea === "Todas" || userAreaNames.includes(filterArea);
    const matchRol = filterRol === "Todos" || u.usuario_rol === filterRol;
    return matchSearch && matchArea && matchRol;
  });

  const handleSave = async () => {
    if (!canSave) return;

    // Validar contraseña solo en creación
    if (!editingUser && (!form.password || form.password.length < 6)) {
      alert("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (!editingUser && form.password !== form.confirmPassword) {
      alert("Las contraseñas no coinciden");
      return;
    }

    setSaving(true);
    try {
      const username = editingUser?.usuario_username || generateUsername(form.nombres, form.apellido_paterno, editingUser?.usuario_id);
      const normalizedAreaPrincipal = isAdmin ? null : form.id_area_principal || null;
      const normalizedAreaAdicional = isAdmin ? null : form.id_area_adicional || null;
      const normalizedEncargadoPrincipal = isAdmin ? false : form.encargado_area_principal;
      const normalizedEncargadoAdicional = isAdmin ? false : form.encargado_area_adicional;
      const userData: Partial<Usuario> = {
        usuario_dni: form.dni || null,
        usuario_nombres: form.nombres,
        usuario_apellido_paterno: form.apellido_paterno,
        usuario_apellido_materno: form.apellido_materno || null,
        usuario_telefono: form.telefono || null,
        usuario_correo: form.correo,
        usuario_username: username,
        usuario_rol: effectiveRol,
        usuario_id_area_principal: normalizedAreaPrincipal,
        usuario_id_area_adicional: normalizedAreaAdicional,
        usuario_encargado_area_principal: normalizedEncargadoPrincipal,
        usuario_encargado_area_adicional: normalizedEncargadoAdicional,
        usuario_activo: editingUser ? editingUser.usuario_activo : true,
      };

      if (editingUser) {
        const { error } = await supabase
          .from("usuarios")
          .update(userData)
          .eq("usuario_id", editingUser.usuario_id);
        if (error) throw error;
        setUsuarios(prev =>
          prev.map(u =>
            u.usuario_id === editingUser.usuario_id
              ? { ...u, ...userData } as Usuario
              : u
          )
        );
      } else {
        const { data, error } = await supabase
          .from("usuarios")
          .insert([{ ...userData, usuario_contrasena: form.password }])
          .select();
        if (error) throw error;
        if (data && data[0]) {
          setUsuarios(prev => [...prev, data[0] as Usuario]);
        }
      }
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert("Error al guardar el usuario");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!selectedUserForPassword) return;
    if (!newPassword || newPassword.length < 6) {
      alert("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      alert("Las contraseñas no coinciden");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("usuarios")
        .update({ usuario_contrasena: newPassword })
        .eq("usuario_id", selectedUserForPassword.usuario_id);
      if (error) throw error;
      alert("Contraseña actualizada correctamente");
      closePasswordModal();
    } catch (err) {
      console.error(err);
      alert("Error al actualizar la contraseña");
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (usuario: Usuario) => {
    const newActivo = !usuario.usuario_activo;
    const { error } = await supabase
      .from("usuarios")
      .update({ usuario_activo: newActivo })
      .eq("usuario_id", usuario.usuario_id);
    if (error) {
      alert("Error al cambiar estado");
      return;
    }
    setUsuarios(prev =>
      prev.map(u =>
        u.usuario_id === usuario.usuario_id ? { ...u, usuario_activo: newActivo } : u
      )
    );
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700 }}>Usuarios</h1>
          <p className="text-gray-500 text-sm">{usuarios.filter((u) => u.usuario_activo).length} activos · {usuarios.filter((u) => !u.usuario_activo).length} inactivos</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm transition"
          style={{ fontWeight: 600 }}
        >
          <UserPlus className="w-4 h-4" />
          Nuevo Usuario
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, DNI, correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50"
            />
          </div>
          <div className="relative">
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 cursor-pointer"
            >
              <option>Todas</option>
              {areas.map((a) => <option key={a.id}>{a.nombre}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={filterRol}
              onChange={(e) => setFilterRol(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 cursor-pointer"
            >
              <option>Todos</option>
              <option>Administrador</option>
              <option>Encargado</option>
              <option>Colaborador</option>
              <option>Cliente</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Identificador", "Usuario", "Áreas", "Rol", "Contacto", "Estado", "Acciones"].map((h) => (
                  <th key={h} className="text-left text-xs text-gray-500 px-4 py-3" style={{ fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((u) => (
                <tr key={u.usuario_id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-lg" style={{ fontWeight: 600 }}>{getIdInterno(u)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${u.usuario_rol === "Encargado" ? "bg-purple-700" : "bg-blue-900"}`}>
                        <span className="text-white text-xs" style={{ fontWeight: 700 }}>{getInitials(u)}</span>
                      </div>
                      <div>
                        <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{u.usuario_nombres} {getFullLastName(u)}</p>
                        <p className="text-gray-400 text-xs">@{u.usuario_username} · DNI: {u.usuario_dni || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-blue-600 flex-shrink-0" />
                        <span className="text-xs text-gray-700" style={{ fontWeight: 500 }}>{getAreaName(u.usuario_id_area_principal)}</span>
                        {u.usuario_encargado_area_principal && <Shield className="w-3 h-3 text-purple-600" aria-label="Encargado de esta área" />}
                      </div>
                      {u.usuario_id_area_adicional && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-gray-400">{getAreaName(u.usuario_id_area_adicional)}</span>
                          {u.usuario_encargado_area_adicional && <Shield className="w-3 h-3 text-purple-400" aria-label="Encargado de área secundaria" />}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${rolColors[u.usuario_rol]}`} style={{ fontWeight: 500 }}>{u.usuario_rol}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-600">{u.usuario_correo}</p>
                    <p className="text-xs text-gray-400">{u.usuario_telefono || "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${u.usuario_activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`} style={{ fontWeight: 500 }}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.usuario_activo ? "bg-green-500" : "bg-gray-400"}`} />
                      {u.usuario_activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-700 transition" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => openPasswordModal(u)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition" title="Cambiar contraseña">
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleActivo(u)}
                        className={`p-1.5 rounded-lg transition ${u.usuario_activo ? "hover:bg-red-50 text-red-600" : "hover:bg-green-50 text-green-600"}`}
                        title={u.usuario_activo ? "Desactivar" : "Activar"}
                      >
                        {u.usuario_activo ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">No se encontraron usuarios</div>
          )}
        </div>
      </div>

      {/* Modal crear/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-gray-900" style={{ fontWeight: 700 }}>
                {editingUser ? "Editar usuario" : "Nuevo Usuario"}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {basicFormFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>{field.label}</label>
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      value={form[field.key]}
                      onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>Correo electrónico</label>
                <input
                  type="email"
                  placeholder="correo@empresa.com"
                  value={form.correo}
                  onChange={(e) => setForm((prev) => ({ ...prev, correo: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
                />
              </div>

              <div className="border border-blue-100 rounded-xl p-4 bg-blue-50">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <div
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        rol: p.rol === "Administrador" ? "Colaborador" : "Administrador",
                        id_area_principal: p.rol === "Administrador" ? p.id_area_principal : "",
                        id_area_adicional: p.rol === "Administrador" ? p.id_area_adicional : "",
                        encargado_area_principal: p.rol === "Administrador" ? p.encargado_area_principal : false,
                        encargado_area_adicional: p.rol === "Administrador" ? p.encargado_area_adicional : false,
                      }))
                    }
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                      isAdmin ? "bg-blue-700 border-blue-700" : "bg-white border-gray-300 group-hover:border-blue-400"
                    }`}
                  >
                    {isAdmin && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-xs text-gray-700">
                    <Shield className="w-3 h-3 inline mr-1 text-blue-700" />
                    Es <span style={{ fontWeight: 600 }}>Administrador</span>
                  </span>
                </label>
              </div>

              {/* Contraseña solo en creación */}
              {!editingUser && (
                <>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1 font-semibold">Contraseña</label>
                    <input
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={form.password}
                      onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1 font-semibold">Confirmar contraseña</label>
                    <input
                      type="password"
                      placeholder="Repite la contraseña"
                      value={form.confirmPassword}
                      onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                </>
              )}

              {!editingUser && form.nombres && form.apellido_paterno && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-xs text-blue-700">
                    Username generado automáticamente:{" "}
                    <span style={{ fontWeight: 700 }}>
                      {generateUsername(form.nombres, form.apellido_paterno)}
                    </span>
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !canSave}
                className="flex-1 bg-blue-900 text-white rounded-xl py-2.5 text-sm hover:bg-blue-800 transition flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ fontWeight: 600 }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editingUser ? "Guardar cambios" : "Registrar usuario"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CAMBIO DE CONTRASEÑA */}
      {showPasswordModal && selectedUserForPassword && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-gray-900 font-bold">Cambiar contraseña</h3>
              <button onClick={closePasswordModal} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-600">
                Usuario: <span className="font-semibold">{selectedUserForPassword.usuario_nombres} {selectedUserForPassword.usuario_apellido_paterno}</span>
              </p>
              <div>
                <label className="block text-xs text-gray-600 mb-1 font-semibold">Nueva contraseña</label>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1 font-semibold">Confirmar nueva contraseña</label>
                <input
                  type="password"
                  placeholder="Repite la contraseña"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500 bg-gray-50"
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={closePasswordModal}
                className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handlePasswordChange}
                disabled={saving}
                className="flex-1 bg-amber-600 text-white rounded-xl py-2.5 text-sm hover:bg-amber-700 transition flex items-center justify-center gap-2 font-semibold disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                Actualizar contraseña
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}