import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Eye, EyeOff, Wrench, AlertCircle } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const user = await login(username, password);
    setLoading(false);

    if (user) {
      navigate(user.rol === "Cliente" ? "/client" : "/dashboard");
    } else {
      setError("Usuario o contraseña incorrectos. Verifique sus credenciales.");
    }
  };


  const quickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)" }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-center items-center w-1/2 p-12 text-white">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg">
              <Wrench className="w-9 h-9 text-blue-900" />
            </div>
            <div>
              <h1 className="text-4xl text-white" style={{ fontWeight: 700 }}>ServicioSTS</h1>
              <p className="text-blue-200 text-sm">Sistema de Gestión Técnica</p>
            </div>
          </div>
          <p className="text-blue-100 text-lg leading-relaxed max-w-md">
            Plataforma integral para gestión de servicios técnicos, seguimiento de tareas
            y monitoreo en tiempo real.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
          {[
            { label: "Servicios activos", value: "12" },
            { label: "Técnicos en campo", value: "8" },
            { label: "Áreas de servicio", value: "3" },
            { label: "Completados hoy", value: "4" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-yellow-400 text-2xl" style={{ fontWeight: 700 }}>{stat.value}</p>
              <p className="text-blue-200 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-col justify-center items-center w-full lg:w-1/2 p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-12 h-12 bg-blue-800 rounded-xl flex items-center justify-center">
              <Wrench className="w-7 h-7 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-blue-900" style={{ fontWeight: 700 }}>TechService</h2>
              <p className="text-gray-500 text-xs">Sistema de Gestión Técnica</p>
            </div>
          </div>

          <h2 className="text-gray-900 mb-1" style={{ fontWeight: 700 }}>Iniciar sesión</h2>
          <p className="text-gray-500 text-sm mb-6">Ingresa tus credenciales para continuar</p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 600 }}>Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej: admin"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-gray-50"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 600 }}>Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-gray-50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-blue-900 rounded-xl py-3 text-sm transition disabled:opacity-60"
              style={{ fontWeight: 700 }}
            >
              {loading ? "Verificando..." : "Ingresar al sistema"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-3" style={{ fontWeight: 600 }}>ACCESO RÁPIDO (DEMO)</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Administrador", u: "JUPEREZ", p: "12345678", color: "bg-blue-100 text-blue-800" },
                { label: "Encargado", u: "jlopez01", p: "pass123", color: "bg-amber-100 text-amber-800" },
                { label: "Colaborador", u: "ptorres01", p: "pass123", color: "bg-green-100 text-green-800" },
                { label: "Cliente", u: "cliente", p: "cliente123", color: "bg-purple-100 text-purple-800" },
              ].map((r) => (
                <button
                  key={r.label}
                  onClick={() => quickLogin(r.u, r.p)}
                  className={`${r.color} rounded-lg px-3 py-2 text-xs text-left transition hover:opacity-80`}
                  style={{ fontWeight: 600 }}
                >
                  {r.label}
                  <span className="block text-xs opacity-70" style={{ fontWeight: 400 }}>{r.u}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}