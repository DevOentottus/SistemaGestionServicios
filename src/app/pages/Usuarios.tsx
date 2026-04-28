import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import bcrypt from "bcryptjs";
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
  id_usuario: string;
  dni: string | null;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  telefono: string | null;
  correo: string;
  username: string;
  rol: "Administrador" | "Encargado" | "Colaborador" | "Cliente";
  id_area_principal: string | null;
  id_area_adicional: string | null;
  encargado_area_principal: boolean;
  encargado_area_adicional: boolean;
  activo: boolean;
  ultimo_login: string | null;
};

type UsuarioForm = {
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  telefono: string;
  correo: string;
  rol: Usuario["rol"];
  id_area_principal: string;
  id_area_adicional: string;
  encargado_area_principal: boolean;
  encargado_area_adicional: boolean;
  password: string;
  confirmPassword: string;
};

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
        .order("nombres");
      if (usersError) console.error(usersError);
      else setUsuarios(usersData || []);

      setLoading(false);
    };
    fetchData();
  }, []);

  // Generar username único
  const generateUsername = (nombres: string, apellido_paterno: string, currentId?: string) => {
    const base = `${nombres.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "")}${apellido_paterno.toLowerCase().replace(/[^a-z]/g, "")}`;
    let candidate = base;
    let counter = 1;
    while (usuarios.some(u => u.username === candidate && u.id_usuario !== currentId)) {
      candidate = `${base}${counter}`;
      counter++;
    }
    return candidate;
  };

  // Obtener nombre del área por ID
  const getAreaName = (areaId: string | null) => {
    if (!areaId) return NONE_AREA;
    const area = areas.find(a => a.id === areaId);
    return area ? area.nombre : NONE_AREA;
  };

  // Filtrar usuarios
  const filtered = usuarios.filter((u) => {
    const matchSearch = `${u.nombres} ${u.apellido_paterno} ${u.dni || ""} ${u.correo}`.toLowerCase().includes(search.toLowerCase());
    const userAreaNames = [getAreaName(u.id_area_principal), getAreaName(u.id_area_adicional)].filter(a => a !== NONE_AREA);
    const matchArea = filterArea === "Todas" || userAreaNames.includes(filterArea);
    const matchRol = filterRol === "Todos" || u.rol === filterRol;
    return matchSearch && matchArea && matchRol;
  });

  const openAdd = () => {
    setEditingUser(null);
    const defaultAreaId = areas[0]?.id || "";
    setForm(emptyForm(defaultAreaId));
    setShowModal(true);
  };

  const openEdit = (user: Usuario) => {
    setEditingUser(user);
    setForm({
      dni: user.dni ?? "",
      nombres: user.nombres,
      apellido_paterno: user.apellido_paterno,
      apellido_materno: user.apellido_materno ?? "",
      telefono: user.telefono ?? "",
      correo: user.correo,
      rol: user.rol,
      id_area_principal: user.id_area_principal ?? "",
      id_area_adicional: user.id_area_adicional ?? "",
      encargado_area_principal: user.encargado_area_principal,
      encargado_area_adicional: user.encargado_area_adicional,
      password: "",
      confirmPassword: "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nombres || !form.apellido_paterno || !form.correo) return;

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
      const username = generateUsername(form.nombres, form.apellido_paterno, editingUser?.id_usuario);
      const userData: any = {
        dni: form.dni || null,
        nombres: form.nombres,
        apellido_paterno: form.apellido_paterno,
        apellido_materno: form.apellido_materno || null,
        telefono: form.telefono || null,
        correo: form.correo,
        username,
        rol: form.rol,
        id_area_principal: form.id_area_principal || null,
        id_area_adicional: form.id_area_adicional || null,
        encargado_area_principal: form.encargado_area_principal,
        encargado_area_adicional: form.encargado_area_adicional,
        activo: editingUser ? editingUser.activo : true,
      };

      if (editingUser) {
        // Actualizar (sin cambiar contraseña)
        const { error } = await supabase
          .from("usuarios")
          .update(userData)
          .eq("id_usuario", editingUser.id_usuario);
        if (error) throw error;
        setUsuarios(prev =>
          prev.map(u =>
            u.id_usuario === editingUser.id_usuario
              ? { ...u, ...userData } as Usuario
              : u
          )
        );
      } else {
        // Crear nuevo usuario: incluir hash de contraseña
        const password_hash = bcrypt.hashSync(form.password, 10);
        const { data, error } = await supabase
          .from("usuarios")
          .insert([{ ...userData, password_hash }])
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
      const password_hash = bcrypt.hashSync(newPassword, 10);
      const { error } = await supabase
        .from("usuarios")
        .update({ password_hash, fecha_actualizacion_password: new Date().toISOString() })
        .eq("id_usuario", selectedUserForPassword.id_usuario);
      if (error) throw error;
      alert("Contraseña actualizada correctamente");
      setShowPasswordModal(false);
    } catch (err) {
      console.error(err);
      alert("Error al actualizar la contraseña");
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (usuario: Usuario) => {
    const newActivo = !usuario.activo;
    const { error } = await supabase
      .from("usuarios")
      .update({ activo: newActivo })
      .eq("id_usuario", usuario.id_usuario);
    if (error) {
      alert("Error al cambiar estado");
      return;
    }
    setUsuarios(prev =>
      prev.map(u =>
        u.id_usuario === usuario.id_usuario ? { ...u, activo: newActivo } : u
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
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-gray-900 text-2xl font-bold">Usuarios</h1>
          <p className="text-gray-500 text-sm">
            {usuarios.filter(u => u.activo).length} activos · {usuarios.filter(u => !u.activo).length} inactivos
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition"
        >
          <UserPlus className="w-4 h-4" />
          Nuevo Usuario
        </button>
      </div>

      {/* FILTROS */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, DNI, correo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50"
            />
          </div>
          <div className="relative">
            <select
              value={filterArea}
              onChange={e => setFilterArea(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 cursor-pointer"
            >
              <option>Todas</option>
              {areas.map(a => (
                <option key={a.id}>{a.nombre}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={filterRol}
              onChange={e => setFilterRol(e.target.value)}
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

      {/* TABLA */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs text-gray-500 px-4 py-3 font-semibold">Usuario</th>
                <th className="text-left text-xs text-gray-500 px-4 py-3 font-semibold">Áreas</th>
                <th className="text-left text-xs text-gray-500 px-4 py-3 font-semibold">Rol</th>
                <th className="text-left text-xs text-gray-500 px-4 py-3 font-semibold">Contacto</th>
                <th className="text-left text-xs text-gray-500 px-4 py-3 font-semibold">Estado</th>
                <th className="text-left text-xs text-gray-500 px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
  {filtered.map(u => (
    <tr key={u.id_usuario} className="hover:bg-gray-50 transition">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
              u.rol === "Encargado" ? "bg-purple-700" : "bg-blue-900"
            }`}
          >
            <span className="text-white text-xs font-bold">
              {u.nombres?.[0] || ''}{u.apellido_paterno?.[0] || ''}
            </span>
          </div>
          <div>
            <p className="text-gray-900 text-sm font-semibold">
              {u.nombres || 'Sin nombre'} {u.apellido_paterno || ''}
            </p>
            <p className="text-gray-400 text-xs">
              @{u.username} · DNI: {u.dni || "—"}
            </p>
          </div>
        </div>
      </td>
      {/* ... resto de columnas (sin cambios) ... */}
    </tr>
  ))}
</tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">No se encontraron usuarios</div>
          )}
        </div>
      </div>

      {/* MODAL CREAR / EDITAR USUARIO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-gray-900 font-bold">
                {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1 font-semibold">DNI</label>
                  <input
                    type="text"
                    placeholder="Ej: 74521896"
                    value={form.dni}
                    onChange={e => setForm(prev => ({ ...prev, dni: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1 font-semibold">Teléfono</label>
                  <input
                    type="text"
                    placeholder="Ej: 987654321"
                    value={form.telefono}
                    onChange={e => setForm(prev => ({ ...prev, telefono: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1 font-semibold">Nombres</label>
                  <input
                    type="text"
                    placeholder="Nombres completos"
                    value={form.nombres}
                    onChange={e => setForm(prev => ({ ...prev, nombres: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1 font-semibold">Apellido Paterno</label>
                  <input
                    type="text"
                    placeholder="Apellido paterno"
                    value={form.apellido_paterno}
                    onChange={e => setForm(prev => ({ ...prev, apellido_paterno: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1 font-semibold">Apellido Materno</label>
                  <input
                    type="text"
                    placeholder="Apellido materno (opcional)"
                    value={form.apellido_materno}
                    onChange={e => setForm(prev => ({ ...prev, apellido_materno: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1 font-semibold">Correo</label>
                  <input
                    type="email"
                    placeholder="correo@empresa.com"
                    value={form.correo}
                    onChange={e => setForm(prev => ({ ...prev, correo: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
                  />
                </div>
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
                      onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1 font-semibold">Confirmar contraseña</label>
                    <input
                      type="password"
                      placeholder="Repite la contraseña"
                      value={form.confirmPassword}
                      onChange={e => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                </>
              )}

              {/* Áreas y rol */}
              <div className="border border-blue-100 rounded-xl p-4 bg-blue-50 space-y-3">
                <p className="text-xs text-blue-800 font-bold">
                  <MapPin className="w-3.5 h-3.5 inline mr-1" />
                  ASIGNACIÓN DE ÁREAS Y ROL
                </p>

                <div>
                  <label className="block text-xs text-gray-600 mb-1 font-semibold">Área Principal *</label>
                  <select
                    value={form.id_area_principal}
                    onChange={e => setForm(prev => ({ ...prev, id_area_principal: e.target.value, encargado_area_principal: false }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="">Seleccione</option>
                    {areas.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer select-none group">
                    <div
                      onClick={() => setForm(prev => ({ ...prev, encargado_area_principal: !prev.encargado_area_principal }))}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                        form.encargado_area_principal ? "bg-purple-600 border-purple-600" : "bg-white border-gray-300 group-hover:border-purple-400"
                      }`}
                    >
                      {form.encargado_area_principal && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-xs text-gray-700">
                      <Shield className="w-3 h-3 inline mr-1 text-purple-600" />
                      Es <span className="font-semibold">Encargado</span> del área principal
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1 font-semibold">Área Secundaria <span className="text-gray-400 font-normal">(opcional)</span></label>
                  <select
                    value={form.id_area_adicional}
                    onChange={e => setForm(prev => ({ ...prev, id_area_adicional: e.target.value, encargado_area_adicional: false }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="">{NONE_AREA}</option>
                    {areas.filter(a => a.id !== form.id_area_principal).map(a => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                  {form.id_area_adicional && (
                    <label className="flex items-center gap-2 mt-2 cursor-pointer select-none group">
                      <div
                        onClick={() => setForm(prev => ({ ...prev, encargado_area_adicional: !prev.encargado_area_adicional }))}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                          form.encargado_area_adicional ? "bg-purple-500 border-purple-500" : "bg-white border-gray-300 group-hover:border-purple-400"
                        }`}
                      >
                        {form.encargado_area_adicional && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-xs text-gray-700">
                        <Shield className="w-3 h-3 inline mr-1 text-purple-500" />
                        Es <span className="font-semibold">Encargado</span> del área secundaria
                      </span>
                    </label>
                  )}
                </div>

                {/* Rol efectivo */}
                <div className="bg-white rounded-lg px-3 py-2 border border-gray-200 flex items-center justify-between">
                  <span className="text-xs text-gray-500">Rol efectivo:</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${rolColors[form.rol]}`}>
                    {form.rol}
                  </span>
                </div>
              </div>

              {!editingUser && form.nombres && form.apellido_paterno && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-xs text-blue-700">
                    Username generado automáticamente:{" "}
                    <span className="font-bold">
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
                disabled={saving}
                className="flex-1 bg-blue-900 text-white rounded-xl py-2.5 text-sm hover:bg-blue-800 transition flex items-center justify-center gap-2 font-semibold disabled:opacity-50"
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
              <button onClick={() => setShowPasswordModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-600">
                Usuario: <span className="font-semibold">{selectedUserForPassword.nombres} {selectedUserForPassword.apellido_paterno}</span>
              </p>
              <div>
                <label className="block text-xs text-gray-600 mb-1 font-semibold">Nueva contraseña</label>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1 font-semibold">Confirmar nueva contraseña</label>
                <input
                  type="password"
                  placeholder="Repite la contraseña"
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500 bg-gray-50"
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowPasswordModal(false)}
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