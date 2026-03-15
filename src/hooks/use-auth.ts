"use client";

import { useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase/client";
import { useAuthStore } from "@/stores/auth.store";
import { useTenantStore } from "@/stores/tenant.store";

export function useAuth() {
  const {
    firebaseUser,
    userProfile,
    memberships,
    isLoading,
    isAuthenticated,
    setFirebaseUser,
    setSession,
    clearAuth,
    setLoading,
  } = useAuthStore();

  useEffect(() => {
    const auth = getClientAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user) {
        try {
          const token = await user.getIdToken();
          const res = await fetch("/api/auth/session", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.ok) {
            const data = await res.json();
            setSession(data.user, data.memberships);
          } else {
            clearAuth();
          }
        } catch {
          clearAuth();
        }
      } else {
        clearAuth();
      }
    });

    return () => unsubscribe();
  }, [setFirebaseUser, setSession, clearAuth, setLoading]);

  const logout = async () => {
    await signOut(getClientAuth());
    useTenantStore.getState().clearTenant();
    clearAuth();
  };

  const getToken = async (): Promise<string | null> => {
    return firebaseUser?.getIdToken() ?? null;
  };

  return {
    user: userProfile,
    firebaseUser,
    memberships,
    isLoading,
    isAuthenticated,
    logout,
    getToken,
  };
}
