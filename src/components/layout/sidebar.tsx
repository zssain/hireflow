"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  LayoutDashboard, Briefcase, Users, Calendar, FileText,
  ClipboardCheck, BarChart3, Settings, ChevronLeft, ChevronRight, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMembership } from "@/hooks/use-membership";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/candidates", label: "Candidates", icon: Users },
  { href: "/interviews", label: "Interviews", icon: Calendar },
  { href: "/offers", label: "Offers", icon: FileText },
  { href: "/onboarding", label: "Onboarding", icon: ClipboardCheck },
  { href: "/analytics", label: "Analytics", icon: BarChart3, permission: "view_analytics" as const },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { tenantName } = useTenant();
  const { can } = useMembership();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      "flex flex-col border-r bg-sidebar-background text-sidebar-foreground transition-all duration-300 relative",
      collapsed ? "w-[68px]" : "w-64"
    )}>
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 dark:bg-brand-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{tenantName ?? "HireFlow"}</p>
              <p className="text-[10px] text-muted-foreground">Starter Plan</p>
            </div>
          </motion.div>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 mx-auto items-center justify-center rounded-lg bg-brand-600 dark:bg-brand-500">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {navItems.map((item) => {
          if (item.permission && !can(item.permission)) return null;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined}>
              <motion.div
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all relative",
                  isActive
                    ? "text-brand-700 dark:text-brand-300"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg bg-brand-50 dark:bg-brand-950/50 border border-brand-200/50 dark:border-brand-800/30"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <Icon className={cn("h-4 w-4 shrink-0 relative z-10", isActive && "text-brand-600 dark:text-brand-400")} />
                {!collapsed && <span className="relative z-10">{item.label}</span>}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center h-8 text-muted-foreground"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  );
}
