import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { assertPermission } from "@/lib/permissions/check";
import { collections } from "@/lib/firebase/firestore";
import { createRuleSchema } from "@/lib/validators/schemas";
import { generateId } from "@/lib/utils/ids";
import type { WorkflowRule } from "@/modules/automation/automation.types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!isAuthContext(auth)) return auth;
  const snapshot = await collections.workflowRules.where("tenant_id", "==", auth.tenantId).orderBy("priority", "asc").get();
  return NextResponse.json({ rules: snapshot.docs.map(d => d.data()) });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;
    assertPermission(auth.membership, "manage_rules");

    const body = await req.json();
    const parsed = createRuleSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

    const ruleId = generateId("rl");
    const now = Timestamp.now();
    const { tenant_id: _, ...ruleData } = parsed.data;
    await collections.workflowRules.doc(ruleId).set({
      rule_id: ruleId, tenant_id: auth.tenantId, ...ruleData,
      plan_required: "starter", created_at: now, updated_at: now,
    } as unknown as WorkflowRule);

    return NextResponse.json({ rule_id: ruleId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: message.includes("permission") ? 403 : 500 });
  }
}
