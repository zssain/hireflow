import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, getActiveMembership } from "./auth.service";
import type { Membership } from "@/modules/memberships/membership.types";

export interface AuthContext {
  userId: string;
  email: string;
  membership: Membership;
  tenantId: string;
}

export async function authenticateRequest(
  req: NextRequest,
  tenantId?: string
): Promise<AuthContext | NextResponse> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
  }

  const token = authHeader.slice(7);

  let decoded;
  try {
    decoded = await verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  // If tenantId not provided, try to get it from the request body or query
  let resolvedTenantId = tenantId;
  if (!resolvedTenantId) {
    const url = new URL(req.url);
    resolvedTenantId = url.searchParams.get("tenant_id") ?? undefined;

    if (!resolvedTenantId) {
      try {
        const body = await req.clone().json();
        resolvedTenantId = body.tenant_id;
      } catch {
        // Body might not be JSON
      }
    }
  }

  if (!resolvedTenantId) {
    return NextResponse.json({ error: "Missing tenant_id" }, { status: 400 });
  }

  const membership = await getActiveMembership(decoded.uid, resolvedTenantId);
  if (!membership) {
    return NextResponse.json(
      { error: "No active membership found for this tenant" },
      { status: 403 }
    );
  }

  return {
    userId: decoded.uid,
    email: decoded.email ?? "",
    membership,
    tenantId: resolvedTenantId,
  };
}

export function isAuthContext(result: AuthContext | NextResponse): result is AuthContext {
  return "userId" in result;
}
