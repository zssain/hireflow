"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Briefcase, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PublicJob {
  public_id: string;
  title: string;
  department: string;
  location: string;
  employment_type: string;
}

interface Company {
  name: string;
  slug: string;
  logo_url: string;
  primary_color: string;
  intro: string;
}

const typeLabels: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  intern: "Intern",
};

export default function CareersPage() {
  const params = useParams();
  const slug = params.tenantSlug as string;
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchJobs() {
      const res = await fetch(`/api/public/tenant/${slug}/jobs`);
      if (res.ok) {
        const data = await res.json();
        setCompany(data.company);
        setJobs(data.jobs);
      } else {
        setError("Company not found");
      }
      setLoading(false);
    }
    fetchJobs();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">{error || "Company not found"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <h1 className="text-3xl font-bold">{company.name}</h1>
          {company.intro && <p className="mt-2 text-muted-foreground">{company.intro}</p>}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <h2 className="mb-6 text-xl font-semibold">
          Open Positions ({jobs.length})
        </h2>

        {jobs.length === 0 ? (
          <p className="text-muted-foreground">No open positions at this time.</p>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <Link key={job.public_id} href={`/careers/${slug}/${job.public_id}`}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <h3 className="font-medium">{job.title}</h3>
                      <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3.5 w-3.5" />
                          {job.department}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {typeLabels[job.employment_type] ?? job.employment_type}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary">Apply</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
