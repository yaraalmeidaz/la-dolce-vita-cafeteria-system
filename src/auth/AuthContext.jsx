import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../services/supabase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const updateUser = (newUser) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('user');
    }
  };

  async function login(emailOrPhone, senha) {
    try {
      // Buscar usuário no Supabase
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`email.eq.${emailOrPhone},telefone.eq.${emailOrPhone}`)
        .eq('senha', senha)
        .single();

      if (error || !data) {
        console.error('Erro no login:', error);
        return { ok: false, message: 'Dados inválidos' };
      }

      // Salva tipo_acesso e role no contexto
      updateUser({ ...data });
      return {
        ok: true,
        tipo_acesso: data.tipo_acesso,
        role: data.role,
        user: data
      };
    } catch (err) {
      console.error('Erro inesperado no login:', err);
      return { ok: false, message: 'Dados inválidos' };
    }
  }

  async function register(novo) {
    try {
      // Verificar se email já existe
      const { data: existingEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', novo.email)
        .single();

      if (existingEmail) {
        return { ok: false, message: 'Este email já está cadastrado' };
      }

      // Verificar se telefone já existe
      const { data: existingPhone } = await supabase
        .from('users')
        .select('id')
        .eq('telefone', novo.telefone)
        .single();

      if (existingPhone) {
        return { ok: false, message: 'Este telefone já está cadastrado' };
      }

      // Inserir novo usuário como cliente
      const { data, error } = await supabase
        .from('users')
        .insert([{ ...novo, role: 'cliente' }])
        .select()
        .single();

      if (error) {
        console.error('Erro no cadastro:', error);
        // Dar mensagem mais específica baseada no erro
        if (error.code === '23505') { // Unique constraint violation
          return { ok: false, message: 'Email ou telefone já cadastrado' };
        }
        return { ok: false, message: 'Erro ao cadastrar. Tente novamente.' };
      }

      updateUser(data);
      return { ok: true };
    } catch (err) {
      console.error('Erro inesperado no cadastro:', err);
      return { ok: false, message: 'Erro inesperado. Tente novamente.' };
    }
  }

  function logout() {
    updateUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, setUser: updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}