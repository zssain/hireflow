"use client";

import Link from "next/link";
import { Users, GitBranch, Mail, Zap, CreditCard, Globe, Puzzle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useMembership } from "@/hooks/use-membership";

const settingsItems = [
  { href: "/settings/team", label: "Team & Roles", description: "Manage team members and permissions", icon: Users },
  { href: "/settings/pipelines", label: "Pipeline Templates", description: "Customize hiring pipeline stages", icon: GitBranch },
  { href: "/settings/templates", label: "Email Templates", description: "Configure email notifications", icon: Mail },
  { href: "/settings/rules", label: "Workflow Rules", description: "Automate hiring workflows", icon: Zap },
  { href: "/settings/billing", label: "Billing & Usage", description: "Manage plan and view usage", icon: CreditCard, adminOnly: true },
  { href: "/settings/careers", label: "Career Page", description: "Customize your public career page", icon: Globe },
  { href: "/settings/integrations", label: "Integrations", description: "Connect external services", icon: Puzzle },
];

export default function SettingsPage() {
  const { isAdmin } = useMembership();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingsItems.filter(item => !item.adminOnly || isAdmin).map(item => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted"><Icon className="h-4 w-4" /></div>
                  <div><p className="font-medium text-sm">{item.label}</p><p className="text-xs text-muted-foreground">{item.description}</p></div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
