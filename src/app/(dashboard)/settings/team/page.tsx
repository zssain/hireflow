"use client";

import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { useMembership } from "@/hooks/use-membership";
import { useApiQuery, invalidateCache } from "@/hooks/use-api-query";

interface Member {
  membership_id: string;
  user_name: string;
  user_email: string;
  role: string;
  status: string;
}

const roleColors: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  recruiter: "bg-blue-100 text-blue-700",
  hiring_manager: "bg-green-100 text-green-700",
};

export default function TeamSettingsPage() {
  const { getToken } = useAuth();
  const { tenantId } = useTenant();
  const { isAdmin } = useMembership();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("recruiter");
  const [inviting, setInviting] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const { data: members, loading, refetch } = useApiQuery<Member[]>("/team/list", {
    transform: (raw: unknown) => (raw as { members: Member[] }).members,
  });

  const allMembers = members ?? [];

  const handleInvite = async () => {
    setInviting(true);
    setError("");

    const token = await getToken();
    if (!token || !tenantId) return;

    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tenant_id: tenantId, email, role }),
    });

    if (res.ok) {
      setOpen(false);
      setEmail("");
      invalidateCache("/team");
      refetch();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to send invite");
    }

    setInviting(false);
  };

  if (loading) return <LoadingSkeleton rows={3} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Team & Roles</h1>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    placeholder="colleague@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="recruiter">Recruiter</SelectItem>
                      <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleInvite} disabled={inviting} className="w-full">
                  {inviting ? "Sending..." : "Send Invite"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {allMembers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Just you for now"
          description="Invite team members to collaborate on hiring."
        />
      ) : (
        <div className="space-y-2">
          {allMembers.map((m) => (
            <Card key={m.membership_id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{m.user_name}</p>
                  <p className="text-xs text-muted-foreground">{m.user_email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={roleColors[m.role] ?? ""}>
                    {m.role.replace("_", " ")}
                  </Badge>
                  <Badge variant={m.status === "active" ? "default" : "outline"}>
                    {m.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
