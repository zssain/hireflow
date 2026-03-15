"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Briefcase, MapPin, Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface JobCardProps {
  jobId: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  status: string;
  applicationCount?: number;
}

const statusColors: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  open: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  closed: "bg-red-100 text-red-700",
};

const typeLabels: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  intern: "Intern",
};

export function JobCard({
  jobId,
  title,
  department,
  location,
  employmentType,
  status,
  applicationCount,
}: JobCardProps) {
  return (
    <Link href={`/jobs/${jobId}`}>
      <motion.div whileHover={{ scale: 1.01, y: -2 }} transition={{ duration: 0.15 }}>
        <Card className="cursor-pointer transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base">{title}</CardTitle>
              <Badge variant="secondary" className={statusColors[status] ?? ""}>
                {status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {department}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {location}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {typeLabels[employmentType] ?? employmentType}
              </span>
              {applicationCount !== undefined && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {applicationCount} applicant{applicationCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}
