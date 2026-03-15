"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Briefcase, MapPin, Clock, Users, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface JobCardProps {
  jobId: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  status: string;
  applicationCount?: number;
  index?: number;
}

const statusStyles: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  open: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  paused: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  closed: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
};

const typeLabels: Record<string, string> = {
  full_time: "Full-time", part_time: "Part-time", contract: "Contract", intern: "Intern",
};

export function JobCard({ jobId, title, department, location, employmentType, status, applicationCount, index = 0 }: JobCardProps) {
  return (
    <Link href={`/jobs/${jobId}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        whileHover={{ y: -3, transition: { duration: 0.15 } }}
        className="group"
      >
        <div className="rounded-xl border bg-card p-5 transition-all hover:shadow-lg hover:shadow-brand-500/5 dark:hover:shadow-brand-500/10 hover:border-brand-200 dark:hover:border-brand-800/50 cursor-pointer">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{title}</h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={statusStyles[status]}>{status}</Badge>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Briefcase className="h-3 w-3" />{department}</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{location}</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{typeLabels[employmentType] ?? employmentType}</span>
            {applicationCount !== undefined && (
              <span className="flex items-center gap-1.5"><Users className="h-3 w-3" />{applicationCount} applicant{applicationCount !== 1 ? "s" : ""}</span>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
