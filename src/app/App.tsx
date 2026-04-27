import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./context/AuthContext";
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

// dentro del componente App:
useEffect(() => {
  const testConnection = async () => {
    const { data, error } = await supabase.from('usuarios').select('id_usuario, username').limit(1);
    console.log('Conexión exitosa:', data, error);
  };
  testConnection();
}, []);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}