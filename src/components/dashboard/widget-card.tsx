"use client";

import { motion } from "motion/react";
import { type LucideIcon } from "lucide-react";

interface WidgetCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  index?: number;
  trend?: string;
}

export function WidgetCard({ title, value, icon: Icon, description, index = 0, trend }: WidgetCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="group"
    >
      <div className="rounded-xl border bg-card p-5 transition-all hover:shadow-lg hover:shadow-brand-500/5 dark:hover:shadow-brand-500/10 hover:border-brand-200 dark:hover:border-brand-800/50">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
            <motion.p
              className="mt-2 text-3xl font-bold tracking-tight"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.08 + 0.2, type: "spring", stiffness: 200 }}
            >
              {value}
            </motion.p>
            {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
            {trend && <p className="mt-1 text-xs text-success font-medium">{trend}</p>}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/50 group-hover:bg-brand-100 dark:group-hover:bg-brand-900/50 transition-colors">
            <Icon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
