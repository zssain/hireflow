"use client";

import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

interface NotificationToastProps {
  notifications: Array<{ id: string; title: string; body: string }>;
  onDismiss: (id: string) => void;
}

export function NotificationToast({ notifications, onDismiss }: NotificationToastProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 w-80">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div key={n.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100 }} className="rounded-lg border bg-background p-3 shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <div><p className="text-sm font-medium">{n.title}</p><p className="text-xs text-muted-foreground">{n.body}</p></div>
              <button onClick={() => onDismiss(n.id)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
