import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

// Safe default — prevents "Cannot destructure property of undefined" if used outside provider.
const AuthContext = createContext({
  user:          null,
  profile:       null,
  loading:       true,
  isAdminProfile: false,
  login:         async () => ({ success: false, error: 'Not ready' }),
  register:      async () => ({ success: false, error: 'Not ready' }),
  logout:        async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (!u) {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Core profile fetch — reusable so we can call it imperatively after checkout
  const fetchProfile = React.useCallback(async (uid) => {
    if (!uid) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, role, is_suspended, subscription_plan, ' +
          'stripe_customer_id, stripe_subscription_id, ' +
          'stripe_subscription_status, subscription_period_end'
        )
        .eq('id', uid)
        .maybeSingle();

      if (error) {
        console.error('[auth] profile fetch failed', error.message);
      } else {
        setProfile(data ?? null);
      }
    } catch (e) {
      console.error('[auth] profile fetch threw', e);
    }
  }, []);

  // Fetch profile whenever user changes
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    fetchProfile(user.id).finally(() => setLoading(false));
  }, [user?.id, fetchProfile]);

  /**
   * Call this after Stripe checkout completes to pick up the updated
   * subscription_plan without requiring a full page reload.
   */
  const refreshProfile = React.useCallback(() => {
    if (!user?.id) return Promise.resolve();
    return fetchProfile(user.id);
  }, [user?.id, fetchProfile]);

  const isAdminProfile = useMemo(() => profile?.role === 'admin', [profile?.role]);

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
    <AuthContext.Provider value={{ user, profile, loading, isAdminProfile, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
