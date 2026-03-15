import { NextRequest, NextResponse } from "next/server";
import { getTenantBySlug } from "@/modules/tenants/tenant.service";
import { getPublicJobs } from "@/modules/jobs/job.service";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const tenant = await getTenantBySlug(slug);

    if (!tenant) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (!tenant.career_page.enabled) {
      return NextResponse.json({ error: "Career page is not enabled" }, { status: 404 });
    }

    const jobs = await getPublicJobs(tenant.tenant_id);

    return NextResponse.json({
      company: {
        name: tenant.name,
        slug: tenant.slug,
        logo_url: tenant.branding.logo_url,
        primary_color: tenant.branding.primary_color,
        intro: tenant.career_page.intro,
      },
      jobs: jobs.map((j) => ({
        public_id: j.public_id,
        title: j.title,
        department: j.department,
        location: j.location,
        employment_type: j.employment_type,
        published_at: j.published_at,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
