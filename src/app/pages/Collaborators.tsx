import { useState } from "react";
import { Colaboradores as initialData, areas, Collaborator } from "../data/mockData";
import {
  UserPlus, Search, Edit2, ToggleLeft, ToggleRight, X, Check, ChevronDown,
  Shield, MapPin,
} from "lucide-react";

const rolColors: Record<string, string> = {
  Administrador: "bg-blue-100 text-blue-800",
  Encargado:     "bg-purple-100 text-purple-800",
  Colaborador:   "bg-yellow-100 text-yellow-800",
};

const NONE_AREA = "— Ninguna —";

interface CollabForm {
  dni: string; nombres: string; apellidos: string; telefono: string; correo: string; contrasena: string;
  area: string; areaSecundaria: string; rol: Collaborator["rol"];
  esEncargadoPrincipal: boolean; esEncargadoSecundario: boolean;
}

const emptyForm = (defaultArea: string): CollabForm => ({
  dni: "", nombres: "", apellidos: "", telefono: "", correo: "", contrasena: "",
  area: defaultArea, areaSecundaria: NONE_AREA,
  rol: "Colaborador",
  esEncargadoPrincipal: false, esEncargadoSecundario: false,
});

export default function Collaborators() {
  const [colabs, setColabs] = useState<Collaborator[]>(initialData);
  const [search, setSearch] = useState("");
  const [filterArea, setFilterArea] = useState("Todas");
  const [filterRol, setFilterRol] = useState("Todos");
  const [showModal, setShowModal] = useState(false);
  const [editingColab, setEditingColab] = useState<Collaborator | null>(null);
  const [form, setForm] = useState<CollabForm>(emptyForm(areas[0].nombre));

  const generateUsername = (nombres: string, apellidos: string, count: number) => {
    const n = nombres.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
    const a = apellidos.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
    return `${n[0]}${a}${String(count + 1).padStart(2, "0")}`;
  };

  const filtered = colabs.filter((c) => {
    const matchSearch = `${c.nombres} ${c.apellidos} ${c.dni} ${c.correo}`.toLowerCase().includes(search.toLowerCase());
    const matchArea = filterArea === "Todas" || c.area === filterArea || c.areaSecundaria === filterArea;
    const matchRol = filterRol === "Todos" || c.rol === filterRol;
    return matchSearch && matchArea && matchRol;
  });

  const openAdd = () => {
    setEditingColab(null);
    setForm(emptyForm(areas[0].nombre));
    setShowModal(true);
  };

  const openEdit = (c: Collaborator) => {
    setEditingColab(c);
    setForm({
      dni: c.dni, nombres: c.nombres, apellidos: c.apellidos,
      telefono: c.telefono, correo: c.correo, contrasena: "",
      area: c.area, areaSecundaria: c.areaSecundaria || NONE_AREA,
      rol: c.rol,
      esEncargadoPrincipal: !!c.esEncargadoPrincipal,
      esEncargadoSecundario: !!c.esEncargadoSecundario,
    });
    setShowModal(true);
  };

  // Derive effective role from encargado checkboxes
  const effectiveRol = (form.esEncargadoPrincipal || form.esEncargadoSecundario) ? "Encargado" : form.rol;

  const handleSave = () => {
    if (!form.dni || !form.nombres || !form.apellidos || !form.correo || !form.contrasena) return;
    const derivedRol: Collaborator["rol"] =
      form.esEncargadoPrincipal || form.esEncargadoSecundario ? "Encargado" : form.rol;
    const secArea = form.areaSecundaria === NONE_AREA ? undefined : form.areaSecundaria;

    if (editingColab) {
      setColabs((prev) =>
        prev.map((c) =>
          c.id === editingColab.id
            ? { ...c, ...form, rol: derivedRol, areaSecundaria: secArea, esEncargadoPrincipal: form.esEncargadoPrincipal, esEncargadoSecundario: form.esEncargadoSecundario }
            : c
        )
      );
    } else {
      const newId = `c${Date.now()}`;
      const username = generateUsername(form.nombres, form.apellidos, colabs.length);
      const idInterno = `EMP-${String(colabs.length + 1).padStart(3, "0")}`;
      setColabs((prev) => [
        ...prev,
        { ...form, id: newId, username, idInterno, activo: true, rol: derivedRol, areaSecundaria: secArea, esEncargadoPrincipal: form.esEncargadoPrincipal, esEncargadoSecundario: form.esEncargadoSecundario },
      ]);
    }
    setShowModal(false);
  };

  const toggleActivo = (id: string) => {
    setColabs((prev) => prev.map((c) => c.id === id ? { ...c, activo: !c.activo } : c));
  };

  const hasSecondaryArea = form.areaSecundaria !== NONE_AREA;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700 }}>Usuarios</h1>
          <p className="text-gray-500 text-sm">{colabs.filter((c) => c.activo).length} activos · {colabs.filter((c) => !c.activo).length} inactivos</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm transition"
          style={{ fontWeight: 600 }}
        >
          <UserPlus className="w-4 h-4" />
          Nuevo Colaborador
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
            <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 cursor-pointer">
              <option>Todas</option>
              {areas.map((a) => <option key={a.id}>{a.nombre}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={filterRol} onChange={(e) => setFilterRol(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 cursor-pointer">
              <option>Todos</option>
              <option>Administrador</option>
              <option>Encargado</option>
              <option>Colaborador</option>
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
                {["ID Interno", "Colaborador", "Áreas", "Rol", "Contacto", "Estado", "Acciones"].map((h) => (
                  <th key={h} className="text-left text-xs text-gray-500 px-4 py-3" style={{ fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-lg" style={{ fontWeight: 600 }}>{c.idInterno}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${c.rol === "Encargado" ? "bg-purple-700" : "bg-blue-900"}`}>
                        <span className="text-white text-xs" style={{ fontWeight: 700 }}>{c.nombres[0]}{c.apellidos[0]}</span>
                      </div>
                      <div>
                        <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{c.nombres} {c.apellidos}</p>
                        <p className="text-gray-400 text-xs">@{c.username} · DNI: {c.dni}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-blue-600 flex-shrink-0" />
                        <span className="text-xs text-gray-700" style={{ fontWeight: 500 }}>{c.area}</span>
                        {c.esEncargadoPrincipal && <Shield className="w-3 h-3 text-purple-600" title="Encargado de esta área" />}
                      </div>
                      {c.areaSecundaria && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-gray-400">{c.areaSecundaria}</span>
                          {c.esEncargadoSecundario && <Shield className="w-3 h-3 text-purple-400" title="Encargado de área secundaria" />}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${rolColors[c.rol]}`} style={{ fontWeight: 500 }}>{c.rol}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-600">{c.correo}</p>
                    <p className="text-xs text-gray-400">{c.telefono}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${c.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`} style={{ fontWeight: 500 }}>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.activo ? "bg-green-500" : "bg-gray-400"}`} />
                      {c.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-700 transition" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleActivo(c.id)}
                        className={`p-1.5 rounded-lg transition ${c.activo ? "hover:bg-red-50 text-red-600" : "hover:bg-green-50 text-green-600"}`}
                        title={c.activo ? "Desactivar" : "Activar"}
                      >
                        {c.activo ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">No se encontraron Usuarios</div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-gray-900" style={{ fontWeight: 700 }}>
                {editingColab ? "Editar Colaborador" : "Nuevo Colaborador"}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Basic info grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "DNI", key: "dni", placeholder: "Ej: 74521896" },
                  { label: "Teléfono", key: "telefono", placeholder: "Ej: 987654321" },
                  { label: "Nombres", key: "nombres", placeholder: "Nombres completos" },
                  { label: "Apellidos", key: "apellidos", placeholder: "Apellidos completos" },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>{field.label}</label>
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      value={(form as Record<string, string>)[field.key]}
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

              <div>
                <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>Nueva contraseña</label>
                <input
                  type="password"
                  placeholder="Nueva contraseña"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
                />
              </div>

              {/* Area assignment section */}
              <div className="border border-blue-100 rounded-xl p-4 bg-blue-50 space-y-3">
                <p className="text-xs text-blue-800" style={{ fontWeight: 700 }}>
                  <MapPin className="w-3.5 h-3.5 inline mr-1" />
                  ASIGNACIÓN DE ÁREAS Y ROL
                </p>

                {/* Primary area */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>Área Principal *</label>
                  <select
                    value={form.area}
                    onChange={(e) => setForm((prev) => ({ ...prev, area: e.target.value, esEncargadoPrincipal: false }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                  >
                    {areas.map((a) => <option key={a.id}>{a.nombre}</option>)}
                  </select>
                  {/* Encargado checkbox for primary area */}
                  <label className="flex items-center gap-2 mt-2 cursor-pointer select-none group">
                    <div
                      onClick={() => setForm((p) => ({ ...p, esEncargadoPrincipal: !p.esEncargadoPrincipal, rol: !p.esEncargadoPrincipal || p.esEncargadoSecundario ? "Encargado" : "Colaborador" }))}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${form.esEncargadoPrincipal ? "bg-purple-600 border-purple-600" : "bg-white border-gray-300 group-hover:border-purple-400"}`}
                    >
                      {form.esEncargadoPrincipal && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-xs text-gray-700">
                      <Shield className="w-3 h-3 inline mr-1 text-purple-600" />
                      Es <span style={{ fontWeight: 600 }}>Encargado</span> del área principal <span className="text-purple-700" style={{ fontWeight: 600 }}>({form.area})</span>
                    </span>
                  </label>
                </div>

                {/* Secondary area */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>Área Secundaria <span className="text-gray-400" style={{ fontWeight: 400 }}>(opcional)</span></label>
                  <select
                    value={form.areaSecundaria}
                    onChange={(e) => setForm((prev) => ({ ...prev, areaSecundaria: e.target.value, esEncargadoSecundario: false }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                  >
                    <option>{NONE_AREA}</option>
                    {areas.filter(a => a.nombre !== form.area).map((a) => <option key={a.id}>{a.nombre}</option>)}
                  </select>
                  {/* Encargado checkbox for secondary area */}
                  {hasSecondaryArea && (
                    <label className="flex items-center gap-2 mt-2 cursor-pointer select-none group">
                      <div
                        onClick={() => setForm((p) => ({ ...p, esEncargadoSecundario: !p.esEncargadoSecundario }))}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${form.esEncargadoSecundario ? "bg-purple-500 border-purple-500" : "bg-white border-gray-300 group-hover:border-purple-400"}`}
                      >
                        {form.esEncargadoSecundario && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-xs text-gray-700">
                        <Shield className="w-3 h-3 inline mr-1 text-purple-500" />
                        Es <span style={{ fontWeight: 600 }}>Encargado</span> del área secundaria <span className="text-purple-600" style={{ fontWeight: 600 }}>({form.areaSecundaria})</span>
                      </span>
                    </label>
                  )}
                </div>

                {/* Effective role preview */}
                <div className="bg-white rounded-lg px-3 py-2 border border-gray-200 flex items-center justify-between">
                  <span className="text-xs text-gray-500">Rol efectivo:</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${rolColors[effectiveRol]}`} style={{ fontWeight: 700 }}>
                    {effectiveRol}
                  </span>
                </div>
              </div>

              {/* Auto username preview */}
              {!editingColab && form.nombres && form.apellidos && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-xs text-blue-700" style={{ fontWeight: 500 }}>
                    Username generado automáticamente:{" "}
                    <span style={{ fontWeight: 700 }}>
                      {generateUsername(form.nombres, form.apellidos, colabs.length)}
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
                className="flex-1 bg-blue-900 text-white rounded-xl py-2.5 text-sm hover:bg-blue-800 transition flex items-center justify-center gap-2"
                style={{ fontWeight: 600 }}
              >
                <Check className="w-4 h-4" />
                {editingColab ? "Guardar cambios" : "Registrar colaborador"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
