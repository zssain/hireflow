"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useTenantStore } from "@/stores/tenant.store";
import { getClientAuth } from "@/lib/firebase/client";

/**
 * Single auth listener for the entire app.
 * Mount this once in the root layout — never in individual pages.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    useTenantStore.getState().hydrate();

    let unsubscribe: (() => void) | undefined;

    getClientAuth().then(async (auth) => {
      const { onAuthStateChanged } = await import("firebase/auth");

      unsubscribe = onAuthStateChanged(auth, async (user) => {
        const store = useAuthStore.getState();
        store.setFirebaseUser(user);

        if (user) {
          try {
            const token = await user.getIdToken();
            const res = await fetch("/api/auth/session", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
              const data = await res.json();
              useAuthStore.getState().setSession(data.user, data.memberships);

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
              useAuthStore.getState().clearAuth();
            }
          } catch {
            useAuthStore.getState().clearAuth();
          }
        } else {
          useAuthStore.getState().clearAuth();
        }
      });
    });

    return () => unsubscribe?.();
  }, []);

  return <>{children}</>;
}
