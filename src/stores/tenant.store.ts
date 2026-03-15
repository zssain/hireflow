"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TenantState {
  activeTenantId: string | null;
  activeTenantName: string | null;
  activeMembershipId: string | null;
  activeRole: string | null;
  setActiveTenant: (tenantId: string, name: string, membershipId: string, role: string) => void;
  clearTenant: () => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      activeTenantId: null,
      activeTenantName: null,
      activeMembershipId: null,
      activeRole: null,
      setActiveTenant: (tenantId, name, membershipId, role) =>
        set({
          activeTenantId: tenantId,
          activeTenantName: name,
          activeMembershipId: membershipId,
          activeRole: role,
        }),
      clearTenant: () =>
        set({
          activeTenantId: null,
          activeTenantName: null,
          activeMembershipId: null,
          activeRole: null,
        }),
    }),
    { name: "hireflow-tenant" }
  )
);
