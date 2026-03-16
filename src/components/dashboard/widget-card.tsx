"use client";

import { motion } from "motion/react";
import { type LucideIcon } from "lucide-react";

interface WidgetCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  index?: number;
}

export function WidgetCard({ title, value, index = 0 }: WidgetCardProps) {
  const num = String(index + 1).padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="border-t border-border pt-4"
    >
      <span className="text-[11px] text-muted-foreground font-mono">{num}</span>
      <motion.p
        className="text-3xl font-semibold tracking-tight mt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.08 + 0.2 }}
      >
        {value}
      </motion.p>
      <p className="text-[13px] text-muted-foreground mt-1">{title}</p>
    </motion.div>
  );
}
