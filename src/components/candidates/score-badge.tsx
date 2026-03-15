"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number | null;
  status: string;
  size?: "sm" | "md";
}

export function ScoreBadge({ score, status, size = "md" }: ScoreBadgeProps) {
  if (status === "pending" || status === "processing") {
    return (
      <span className={cn("text-muted-foreground", size === "sm" ? "text-xs" : "text-sm")}>
        {status === "processing" ? "Scoring..." : "Pending"}
      </span>
    );
  }

  if (status === "failed" || score === null) {
    return <span className={cn("text-destructive", size === "sm" ? "text-xs" : "text-sm")}>Failed</span>;
  }

  const color = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";
  const textColor = score >= 70 ? "text-green-700" : score >= 40 ? "text-yellow-700" : "text-red-700";
  const width = size === "sm" ? "w-16" : "w-24";

  return (
    <div className={cn("flex items-center gap-2", size === "sm" ? "text-xs" : "text-sm")}>
      <div className={cn("h-2 rounded-full bg-muted", width)}>
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className={cn("font-medium", textColor)}>{score}</span>
    </div>
  );
}
