import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';
import { Eye, EyeOff, LogIn, Wrench } from 'lucide-react';

export function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const credentials = [
    { user: 'admin', pass: 'admin123', role: 'Administrador' },
    { user: 'egarcia01', pass: 'enc123', role: 'Encargado' },
    { user: 'clopez01', pass: 'col123', role: 'Colaborador' },
    { user: 'cliente01', pass: 'cli123', role: 'Cliente' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const user = login(username.trim(), password);
    setLoading(false);
    if (user) {
      if (user.role === 'cliente') {
        navigate('/cliente/SRV-2024-001');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError('Usuario o contraseña incorrectos.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-amber-400 opacity-5"
            style={{ width: `${100 + i * 80}px`, height: `${100 + i * 80}px`, top: `${10 + i * 15}%`, left: `${5 + i * 15}%` }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-400 rounded-2xl mb-4 shadow-lg">
            <Wrench className="w-8 h-8 text-blue-900" />
          </div>
          <h1 className="text-white" style={{ fontSize: '1.75rem', fontWeight: 700 }}>ServiTech Pro</h1>
          <p className="text-blue-200 mt-1">Sistema de Gestión de Servicios</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-blue-900 mb-6 text-center" style={{ fontSize: '1.25rem' }}>Iniciar Sesión</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-blue-800 mb-1" style={{ fontSize: '0.875rem' }}>Usuario</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors bg-gray-50"
                required
              />
            </div>
            <div>
              <label className="block text-blue-800 mb-1" style={{ fontSize: '0.875rem' }}>Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors bg-gray-50 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl" style={{ fontSize: '0.875rem' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Ingresar
                </>
              )}
            </button>
          </form>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 bg-white/10 backdrop-blur rounded-xl p-4">
          <p className="text-amber-300 text-center mb-3" style={{ fontSize: '0.8rem', fontWeight: 600 }}>CREDENCIALES DE DEMOSTRACIÓN</p>
          <div className="grid grid-cols-2 gap-2">
            {credentials.map(c => (
              <button
                key={c.user}
                onClick={() => { setUsername(c.user); setPassword(c.pass); }}
                className="text-left bg-white/10 hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <span className="block text-amber-300" style={{ fontSize: '0.75rem', fontWeight: 600 }}>{c.role}</span>
                <span className="block text-white" style={{ fontSize: '0.75rem' }}>{c.user}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
