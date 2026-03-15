"use client";

import { create } from "zustand";

interface TenantState {
  activeTenantId: string | null;
  activeTenantName: string | null;
  activeMembershipId: string | null;
  activeRole: string | null;
  setActiveTenant: (tenantId: string, name: string, membershipId: string, role: string) => void;
  clearTenant: () => void;
  hydrate: () => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  activeTenantId: null,
  activeTenantName: null,
  activeMembershipId: null,
  activeRole: null,
  setActiveTenant: (tenantId, name, membershipId, role) => {
    set({
      activeTenantId: tenantId,
      activeTenantName: name,
      activeMembershipId: membershipId,
      activeRole: role,
    });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "hireflow-tenant",
          JSON.stringify({ tenantId, name, membershipId, role })
        );
      } catch {}
    }
  },
  clearTenant: () => {
    set({
      activeTenantId: null,
      activeTenantName: null,
      activeMembershipId: null,
      activeRole: null,
    });
    if (typeof window !== "undefined") {
      try { localStorage.removeItem("hireflow-tenant"); } catch {}
    }
  },
  hydrate: () => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("hireflow-tenant");
      if (stored) {
        const data = JSON.parse(stored);
        set({
          activeTenantId: data.tenantId,
          activeTenantName: data.name,
          activeMembershipId: data.membershipId,
          activeRole: data.role,
        });
      }
    } catch {}
  },
}));
