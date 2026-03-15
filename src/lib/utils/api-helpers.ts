import { NextResponse } from "next/server";
import { PermissionError } from "@/lib/permissions/check";
import { PlanFeatureError } from "@/lib/plan-gates/features";
import { PlanQuotaError } from "@/lib/plan-gates/quotas";

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof PermissionError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  if (error instanceof PlanFeatureError) {
    return NextResponse.json(
      { error: error.message, upgrade_required: true },
      { status: 402 }
    );
  }

  if (error instanceof PlanQuotaError) {
    return NextResponse.json(
      { error: error.message, limit: error.limit, current: error.current, upgrade_required: true },
      { status: 402 }
    );
  }

  const message = error instanceof Error ? error.message : "Internal server error";

  if (message.includes("not found")) {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  if (message.includes("already")) {
    return NextResponse.json({ error: message }, { status: 409 });
  }

  if (message.includes("Cannot") || message.includes("Invalid")) {
    return NextResponse.json({ error: message }, { status: 400 });
  }

  console.error("[API Error]", error);
  return NextResponse.json({ error: message }, { status: 500 });
}
