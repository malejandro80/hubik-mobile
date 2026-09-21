import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { getCapabilities, SIGNED_OUT_CAPABILITIES } from '../lib/roles';
import { supabase } from '../lib/supabase';
import { getAvatarUrl } from '../lib/userDisplay';
import { fetchProfile, signInWithProvider, signOut as signOutOfSupabase } from '../services/authApi';
import { AuthState, Profile } from '../types/auth';

interface SessionState {
  ready: boolean;
  userId: string | null;
  avatarUrl: string | null;
}

interface LoadedProfile {
  userId: string;
  profile: Profile;
}

const SIGNED_OUT_STATE: AuthState = {
  status: 'signedOut',
  profile: null,
  capabilities: SIGNED_OUT_CAPABILITIES,
  signIn: async () => 'cancelled',
  signOut: async () => undefined,
  refreshProfile: async () => undefined,
};

export const AuthContext = createContext<AuthState>(SIGNED_OUT_STATE);

const toSessionState = (user?: { id: string; user_metadata?: unknown } | null): SessionState => ({
  ready: true,
  userId: user?.id ?? null,
  avatarUrl: getAvatarUrl(user?.user_metadata),
});

const buildClientFallback = (userId: string): Profile => ({
  userId,
  role: 'client',
  agencyId: null,
  displayName: null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<SessionState>({ ready: false, userId: null, avatarUrl: null });
  const [loaded, setLoaded] = useState<LoadedProfile | null>(null);
  const { userId } = session;

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(toSessionState(data.session?.user));
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(toSessionState(nextSession?.user));
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    fetchProfile(userId)
      .catch(() => buildClientFallback(userId))
      .then((profile) => {
        if (active) setLoaded({ userId, profile });
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    try {
      setLoaded({ userId, profile: await fetchProfile(userId) });
    } catch {
      return;
    }
  }, [userId]);

  const loadedProfile = loaded && loaded.userId === userId ? loaded.profile : null;
  const { avatarUrl } = session;
  const profile = useMemo<Profile | null>(
    () => (loadedProfile ? { ...loadedProfile, avatarUrl } : null),
    [loadedProfile, avatarUrl]
  );

  const value = useMemo<AuthState>(() => {
    if (!session.ready || (userId && !profile)) {
      return { ...SIGNED_OUT_STATE, status: 'loading', signIn: signInWithProvider, signOut: signOutOfSupabase, refreshProfile };
    }
    return {
      status: userId ? 'signedIn' : 'signedOut',
      profile,
      capabilities: getCapabilities(profile?.role ?? null),
      signIn: signInWithProvider,
      signOut: signOutOfSupabase,
      refreshProfile,
    };
  }, [session.ready, userId, profile, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
