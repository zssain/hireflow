import { NextResponse } from "next/server";
import type { Membership } from "@/modules/memberships/membership.types";
import { hasPermission, type Permission } from "./matrix";

export class PermissionError extends Error {
  constructor(permission: Permission) {
    super(`Missing permission: ${permission}`);
    this.name = "PermissionError";
  }
}

export function assertPermission(
  membership: Membership,
  permission: Permission
): void {
  const allowed = hasPermission(
    membership.role,
    permission,
    membership.permissions_override as Record<string, boolean>
  );

  if (!allowed) {
    throw new PermissionError(permission);
  }
}

export function permissionErrorResponse(permission: Permission): NextResponse {
  return NextResponse.json(
    { error: `Forbidden: missing permission '${permission}'` },
    { status: 403 }
  );
}
