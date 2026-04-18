import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

/** Session flag: browse the app without Supabase auth — free-tier limits only. */
const GUEST_SESSION_KEY = 'sp_guest_session';

function readGuestFromStorage() {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(GUEST_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function clearGuestFromStorage() {
  try {
    window.sessionStorage.removeItem(GUEST_SESSION_KEY);
  } catch { /* ignore */ }
}

// Safe default — prevents "Cannot destructure property of undefined" if used outside provider.
const AuthContext = createContext({
  user:          null,
  profile:       null,
  loading:       true,
  isAdminProfile: false,
  isGuest:       false,
  enterGuestMode: () => {},
  login:         async () => ({ success: false, error: 'Not ready' }),
  register:      async () => ({ success: false, error: 'Not ready' }),
  logout:        async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [isGuest, setIsGuest] = useState(readGuestFromStorage);
  const [loading, setLoading] = useState(!isGuest);

  useEffect(() => {
    if (isGuest) {
      setLoading(false);
    }

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        const u = session?.user ?? null;
        if (u) {
          clearGuestFromStorage();
          setIsGuest(false);
        }
        setUser(u);
        if (!u) {
          setLoading(false);
        }
      })
      .catch((e) => {
        console.error('[auth] getSession failed', e);
        setLoading(false);
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      if (u) {
        clearGuestFromStorage();
        setIsGuest(false);
      }
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

  /**
   * Guest session: no Supabase user — `useSubscription` treats missing profile as free tier.
   * Full page navigation so the shell loads with the guest flag already in sessionStorage.
   */
  const enterGuestMode = React.useCallback(() => {
    try {
      window.sessionStorage.setItem(GUEST_SESSION_KEY, '1');
    } catch { /* ignore */ }
    setIsGuest(true);
    window.location.replace('/Dashboard');
  }, []);

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
    clearGuestFromStorage();
    setIsGuest(false);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdminProfile,
        isGuest,
        enterGuestMode,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
