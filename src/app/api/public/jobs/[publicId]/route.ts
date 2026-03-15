import { NextRequest, NextResponse } from "next/server";
import { getJobByPublicId } from "@/modules/jobs/job.service";
import { getTenant } from "@/modules/tenants/tenant.service";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await params;
    const job = await getJobByPublicId(publicId);

    if (!job || job.status !== "open" || job.visibility !== "public") {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const tenant = await getTenant(job.tenant_id);

    return NextResponse.json({
      job: {
        public_id: job.public_id,
        title: job.title,
        department: job.department,
        location: job.location,
        employment_type: job.employment_type,
        description_html: job.description_html,
        requirements_text: job.requirements_text,
        published_at: job.published_at,
      },
      company: tenant
        ? {
            name: tenant.name,
            slug: tenant.slug,
            logo_url: tenant.branding.logo_url,
            primary_color: tenant.branding.primary_color,
          }
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
