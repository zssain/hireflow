"use client";

import { useCallback } from "react";
import { useTenantStore } from "@/stores/tenant.store";
import { useAuthStore } from "@/stores/auth.store";

export function useTenant() {
  const { activeTenantId, activeTenantName, activeMembershipId, activeRole, setActiveTenant, clearTenant } =
    useTenantStore();
  const { memberships } = useAuthStore();

  const switchTenant = useCallback(
    (tenantId: string, tenantName: string) => {
      const membership = memberships.find((m) => m.tenant_id === tenantId);
      if (membership) {
        setActiveTenant(tenantId, tenantName, membership.membership_id, membership.role);
      }
    },
    [memberships, setActiveTenant]
  );

  return {
    tenantId: activeTenantId,
    tenantName: activeTenantName,
    membershipId: activeMembershipId,
    role: activeRole,
    switchTenant,
    clearTenant,
    hasTenant: !!activeTenantId,
  };
}
