"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

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

const typeLabels: Record<string, string> = {
  full_time: "Full-time", part_time: "Part-time", contract: "Contract", intern: "Intern",
};

export function JobCard({ jobId, title, department, location, employmentType, status, applicationCount, index = 0 }: JobCardProps) {
  return (
    <Link href={`/jobs/${jobId}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        className="group border-t border-border py-5 flex items-center justify-between hover:pl-2 transition-all cursor-pointer"
      >
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium">{title}</h3>
            <span className="text-[11px] text-muted-foreground border border-border rounded-full px-2.5 py-0.5">
              {status}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-[12px] text-muted-foreground">
            <span>{department}</span>
            <span className="text-border">/</span>
            <span>{location}</span>
            <span className="text-border">/</span>
            <span>{typeLabels[employmentType] ?? employmentType}</span>
            {applicationCount !== undefined && applicationCount > 0 && (
              <>
                <span className="text-border">/</span>
                <span>{applicationCount} applicant{applicationCount !== 1 ? "s" : ""}</span>
              </>
            )}
          </div>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </motion.div>
    </Link>
  );
}
