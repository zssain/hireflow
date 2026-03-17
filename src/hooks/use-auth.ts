"use client";

import { useCallback } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useTenantStore } from "@/stores/tenant.store";
import { getClientAuth } from "@/lib/firebase/client";

/**
 * Pure store reader — no auth listener setup.
 * Auth initialization happens once in AuthProvider.
 */
export function useAuth() {
  const {
    firebaseUser,
    userProfile,
    memberships,
    isLoading,
    isAuthenticated,
    clearAuth,
  } = useAuthStore();

  const logout = async () => {
    const { signOut } = await import("firebase/auth");
    const auth = await getClientAuth();
    await signOut(auth);
    useTenantStore.getState().clearTenant();
    clearAuth();
  };

  // Stable getToken — reads current user from store at call time
  const getToken = useCallback(async (): Promise<string | null> => {
    const user = useAuthStore.getState().firebaseUser;
    return user?.getIdToken() ?? null;
  }, []);

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
