import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../lib/supabase";
import bcrypt from "bcryptjs";

export type User = {
  id_usuario: string;
  username: string;
  rol: string;
  nombres: string;
  apellido_paterno?: string;
  activo: boolean;
};

interface AuthContextType {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<User | null>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restaurar sesión
  useEffect(() => {
    const storedUser = localStorage.getItem("sgs_user");
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<User | null> => {
    try {
      const { data: usuario, error } = await supabase
        .from("usuarios")
        .select("id_usuario, username, password_hash, rol, activo, nombres, apellido_paterno")
        .eq("username", username)
        .single();

      if (error || !usuario) {
        console.error("Usuario no encontrado", error);
        return null;
      }

      if (!usuario.activo) {
        console.error("Cuenta desactivada");
        return null;
      }

      const passwordValida = await bcrypt.compare(password, usuario.password_hash);
      if (!passwordValida) {
        console.error("Contraseña incorrecta");
        return null;
      }

      // Actualizar último login (no esperamos la respuesta)
      supabase
        .from("usuarios")
        .update({ ultimo_login: new Date().toISOString() })
        .eq("id_usuario", usuario.id_usuario)
        .then();

      // Crear objeto usuario
      const user: User = {
        id_usuario: usuario.id_usuario,
        username: usuario.username,
        rol: usuario.rol,
        nombres: usuario.nombres,
        apellido_paterno: usuario.apellido_paterno,
        activo: usuario.activo,
      };

      setCurrentUser(user);
      localStorage.setItem("sgs_user", JSON.stringify(user));
      return user;
    } catch (err) {
      console.error("Error en login:", err);
      return null;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("sgs_user");
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        isAuthenticated: !!currentUser,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}