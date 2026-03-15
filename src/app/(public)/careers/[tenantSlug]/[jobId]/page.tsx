"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Briefcase, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface JobDetail {
  public_id: string;
  title: string;
  department: string;
  location: string;
  employment_type: string;
  description_html: string;
  requirements_text: string;
}

interface Company {
  name: string;
  slug: string;
  primary_color: string;
}

const typeLabels: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  intern: "Intern",
};

export default function PublicJobDetailPage() {
  const params = useParams();
  const publicId = params.jobId as string;
  const slug = params.tenantSlug as string;
  const [job, setJob] = useState<JobDetail | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJob() {
      const res = await fetch(`/api/public/jobs/${publicId}`);
      if (res.ok) {
        const data = await res.json();
        setJob(data.job);
        setCompany(data.company);
      }
      setLoading(false);
    }
    fetchJob();
  }, [publicId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Job not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <Link
            href={`/careers/${slug}`}
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {company?.name ?? "all jobs"}
          </Link>
          <h1 className="text-3xl font-bold">{job.title}</h1>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" />
              {job.department}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {job.location}
            </span>
            <Badge variant="secondary">{typeLabels[job.employment_type] ?? job.employment_type}</Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <div className="space-y-8">
            <section>
              <h2 className="mb-3 text-lg font-semibold">About the Role</h2>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: job.description_html }}
              />
            </section>
            <section>
              <h2 className="mb-3 text-lg font-semibold">Requirements</h2>
              <p className="whitespace-pre-wrap text-sm">{job.requirements_text}</p>
            </section>
          </div>

          <aside>
            <div className="sticky top-8 rounded-lg border bg-background p-6">
              <h3 className="font-semibold mb-3">Interested?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Apply now and we&apos;ll review your application.
              </p>
              <Button className="w-full" asChild>
                <Link href={`/apply/${job.public_id}`}>Apply for this job</Link>
              </Button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
