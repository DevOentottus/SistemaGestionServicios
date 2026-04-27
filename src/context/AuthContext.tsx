import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { supabase } from "../lib/supabase";
import bcrypt from "bcryptjs";

type User = {
  id_usuario: string;
  username: string;
  rol: string;
  nombres: string;
  // otros campos que necesites
};

type AuthContextType = {
  user: User | null;
  login: (username: string, password: string) => Promise<User | null>;
  logout: () => void;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restaurar sesión desde localStorage
    const storedUser = localStorage.getItem("sgs_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<User | null> => {
    try {
      const { data: userData, error } = await supabase
        .from("usuarios")
        .select("id_usuario, username, rol, nombres, apellido_paterno, activo, password_hash")
        .eq("username", username)
        .single();

      if (error || !userData) throw new Error("Usuario no encontrado");
      if (!userData.activo) throw new Error("Cuenta desactivada");

      const valid = await bcrypt.compare(password, userData.password_hash);
      if (!valid) throw new Error("Contraseña incorrecta");

      const { password_hash, ...userWithoutHash } = userData;
      setUser(userWithoutHash);
      localStorage.setItem("sgs_user", JSON.stringify(userWithoutHash));
      return userWithoutHash;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("sgs_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};