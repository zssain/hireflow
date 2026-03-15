"use client";

import { motion } from "motion/react";
import { AlertTriangle, Clock, FileText, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ActionItem {
  id: string;
  type: "review" | "interview" | "offer" | "overdue";
  title: string;
  description: string;
  href: string;
}

interface ActionCenterProps { items: ActionItem[]; }

const iconMap = { review: Users, interview: Clock, offer: FileText, overdue: AlertTriangle };

export function ActionCenter({ items }: ActionCenterProps) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Action Items</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {items.map((item, i) => {
          const Icon = iconMap[item.type];
          return (
            <motion.a key={item.id} href={item.href} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-md p-2 hover:bg-muted transition-colors">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0"><p className="text-sm font-medium truncate">{item.title}</p><p className="text-xs text-muted-foreground truncate">{item.description}</p></div>
            </motion.a>
          );
        })}
      </CardContent>
    </Card>
  );
}
