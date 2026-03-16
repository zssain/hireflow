"use client";

import { type LucideIcon, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-16 text-center"
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="text-[13px] text-muted-foreground mt-1">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-2 text-[13px] font-medium hover:underline underline-offset-4 transition-all"
        >
          {actionLabel} <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </motion.div>
  );
}
