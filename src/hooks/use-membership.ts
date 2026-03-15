"use client";

import { useTenantStore } from "@/stores/tenant.store";
import { hasPermission, type Permission } from "@/lib/permissions/matrix";
import type { MembershipRole } from "@/modules/memberships/membership.types";

export function useMembership() {
  const { activeMembershipId, activeRole } = useTenantStore();

  const can = (permission: Permission): boolean => {
    if (!activeRole) return false;
    return hasPermission(activeRole as MembershipRole, permission);
  };

  return {
    membershipId: activeMembershipId,
    role: activeRole as MembershipRole | null,
    can,
    isAdmin: activeRole === "admin",
    isRecruiter: activeRole === "recruiter",
    isHiringManager: activeRole === "hiring_manager",
  };
}
