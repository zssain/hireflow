"use client";

import { useEffect, useState } from "react";
import { GitBranch, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";

interface PipelineTemplate {
  template_id: string;
  name: string;
  stages: Array<{ stage_id: string; name: string; order: number }>;
}

export default function PipelineSettingsPage() {
  const { getToken } = useAuth();
  const { tenantId } = useTenant();
  const [templates, setTemplates] = useState<PipelineTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStages, setNewStages] = useState("Applied, Screening, Interview, Offer, Hired");

  useEffect(() => {
    async function load() {
      if (!tenantId) return;
      // In production, fetch from /api/pipelines endpoint
      // For now, show default
      setTemplates([
        {
          template_id: "default",
          name: "Default Pipeline",
          stages: [
            { stage_id: "applied", name: "Applied", order: 0 },
            { stage_id: "screening", name: "Screening", order: 1 },
            { stage_id: "interview", name: "Interview", order: 2 },
            { stage_id: "offer", name: "Offer", order: 3 },
            { stage_id: "hired", name: "Hired", order: 4 },
          ],
        },
      ]);
      setLoading(false);
    }
    load();
  }, [tenantId, getToken]);

  const handleCreate = () => {
    const stages = newStages.split(",").map((s, i) => ({
      stage_id: s.trim().toLowerCase().replace(/\s+/g, "_"),
      name: s.trim(),
      order: i,
    }));

    setTemplates((prev) => [
      ...prev,
      { template_id: `pt_${Date.now()}`, name: newName, stages },
    ]);
    setOpen(false);
    setNewName("");
  };

  if (loading) return <LoadingSkeleton rows={2} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pipeline Templates</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Pipeline Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  placeholder="e.g. Engineering Pipeline"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Stages (comma-separated)</Label>
                <Input
                  placeholder="Applied, Phone Screen, Technical, Onsite, Offer"
                  value={newStages}
                  onChange={(e) => setNewStages(e.target.value)}
                />
              </div>
              <Button onClick={handleCreate} disabled={!newName.trim()} className="w-full">
                Create Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {templates.map((template) => (
          <Card key={template.template_id}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                {template.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {template.stages
                  .sort((a, b) => a.order - b.order)
                  .map((stage, i) => (
                    <div key={stage.stage_id} className="flex items-center gap-1">
                      <Badge variant="secondary">
                        {i + 1}. {stage.name}
                      </Badge>
                      {i < template.stages.length - 1 && (
                        <span className="text-muted-foreground">&rarr;</span>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
