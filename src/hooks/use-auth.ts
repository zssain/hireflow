"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useTenantStore } from "@/stores/tenant.store";
import { getClientAuth } from "@/lib/firebase/client";

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
  } = useAuthStore();

  useEffect(() => {
    useTenantStore.getState().hydrate();

    let unsubscribe: (() => void) | undefined;

    getClientAuth().then(async (auth) => {
      const { onAuthStateChanged } = await import("firebase/auth");

      unsubscribe = onAuthStateChanged(auth, async (user) => {
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

              // Auto-select first tenant if none is selected
              const tenantStore = useTenantStore.getState();
              if (!tenantStore.activeTenantId && data.memberships.length > 0) {
                const first = data.memberships[0];
                tenantStore.setActiveTenant(
                  first.tenant_id,
                  data.user.name ?? "Workspace",
                  first.membership_id,
                  first.role
                );
              }
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
    });

    return () => unsubscribe?.();
  }, [setFirebaseUser, setSession, clearAuth]);

  const logout = async () => {
    const { signOut } = await import("firebase/auth");
    const auth = await getClientAuth();
    await signOut(auth);
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
