import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./context/AuthContext";
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function App() {
  // ✅ El useEffect debe ir DENTRO del componente
  useEffect(() => {
    const testConnection = async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id_usuario, username')
        .limit(1);
      console.log('Conexión exitosa:', data, error);
    };
    testConnection();
  }, []);

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}