import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { loginUser } from "../app/services/authService";
import type { Session } from "@supabase/supabase-js";

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

  useEffect(() => {
    const loadSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await syncUserProfile(session);
      }
      setLoading(false);
    };
    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        syncUserProfile(session);
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncUserProfile = async (session: Session) => {
    const { data: perfil } = await supabase
      .from("usuarios")
      .select("id_usuario, username, rol, nombres, apellido_paterno, activo")
      .eq("id_usuario", session.user.id)
      .single();

    if (perfil?.activo) {
      setCurrentUser({
        id_usuario: perfil.id_usuario,
        username: perfil.username,
        rol: perfil.rol,
        nombres: perfil.nombres,
        apellido_paterno: perfil.apellido_paterno,
        activo: perfil.activo,
      });
    } else {
      setCurrentUser(null);
    }
  };

  const login = async (username: string, password: string): Promise<User | null> => {
    try {
      const user = await loginUser(username, password);
      if (user) {
        setCurrentUser(user);
      }
      return user;
    } catch {
      return null;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
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
