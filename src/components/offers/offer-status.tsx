"use client";

import { FileText, Send, Eye, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const config: Record<string, { label: string; icon: typeof FileText; className: string }> = {
  draft: { label: "Draft", icon: FileText, className: "bg-zinc-100 text-zinc-700" },
  pending_approval: { label: "Pending Approval", icon: Clock, className: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Approved", icon: CheckCircle2, className: "bg-blue-100 text-blue-700" },
  sent: { label: "Sent", icon: Send, className: "bg-indigo-100 text-indigo-700" },
  viewed: { label: "Viewed", icon: Eye, className: "bg-purple-100 text-purple-700" },
  accepted: { label: "Accepted", icon: CheckCircle2, className: "bg-green-100 text-green-700" },
  declined: { label: "Declined", icon: XCircle, className: "bg-red-100 text-red-700" },
  expired: { label: "Expired", icon: Clock, className: "bg-orange-100 text-orange-700" },
};

export function OfferStatus({ status }: { status: string }) {
  const c = config[status] ?? config.draft;
  const Icon = c.icon;
  return <Badge variant="secondary" className={c.className}><Icon className="mr-1 h-3 w-3" />{c.label}</Badge>;
}
