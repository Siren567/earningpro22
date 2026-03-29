import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChange always fires INITIAL_SESSION on subscription — covering:
    //   • existing session restored from localStorage
    //   • session parsed from URL hash (email confirmation callback)
    //   • no session (null)
    // loading is set to false ONLY here, eliminating the getSession() race condition
    // where getSession() returned null before Supabase had processed the URL hash.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const register = async ({ email, password, first_name, last_name, birth_date }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name, last_name, birth_date } },
    });

    if (error) {
      // Supabase error path: email confirmation disabled, or explicit conflict error
      const msg = error.message?.toLowerCase() ?? '';
      if (
        msg.includes('already registered') ||
        msg.includes('already exists') ||
        msg.includes('user already') ||
        error.code === 'user_already_exists'
      ) {
        return {
          success: false,
          error: 'An account with this email already exists. Please log in instead.',
        };
      }
      return { success: false, error: error.message };
    }

    // Supabase v2 silent path: when email confirmation is ON, a duplicate signup
    // returns success-like data but with an empty identities array instead of an error.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return {
        success: false,
        error: 'An account with this email already exists. Please log in instead.',
      };
    }

    if (data.user && !data.session) return { success: true, emailConfirmationRequired: true };
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
