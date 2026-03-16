"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  LayoutDashboard, Briefcase, Users, Calendar, FileText,
  ClipboardCheck, BarChart3, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMembership } from "@/hooks/use-membership";
import { useTenant } from "@/hooks/use-tenant";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/candidates", label: "Candidates", icon: Users },
  { href: "/interviews", label: "Interviews", icon: Calendar },
  { href: "/offers", label: "Offers", icon: FileText },
  { href: "/onboarding", label: "Onboarding", icon: ClipboardCheck },
  { href: "/analytics", label: "Analytics", icon: BarChart3, permission: "view_analytics" as const },
];

export function Sidebar() {
  const pathname = usePathname();
  const { tenantName } = useTenant();
  const { can } = useMembership();

  return (
    <aside className="flex w-56 flex-col border-r border-sidebar-border bg-sidebar-background">
      <div className="px-5 py-5">
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
          {tenantName ?? "HireFlow"}
        </Link>
      </div>

      <hr className="border-sidebar-border" />

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          if (item.permission && !can(item.permission)) return null;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors relative",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                whileTap={{ scale: 0.98 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-md bg-secondary"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <Icon className="h-4 w-4 relative z-10" />
                <span className="relative z-10">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <hr className="border-sidebar-border" />

      <div className="px-3 py-3">
        <Link href="/settings">
          <motion.div
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors",
              pathname.startsWith("/settings") ? "text-foreground bg-secondary" : "text-muted-foreground hover:text-foreground"
            )}
            whileTap={{ scale: 0.98 }}
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </motion.div>
        </Link>
      </div>
    </aside>
  );
}
