"use client";

import { Puzzle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const integrations = [
  { name: "Google Calendar", description: "Sync interview schedules", status: "not_connected" },
  { name: "Google Meet", description: "Auto-create meeting links", status: "not_connected" },
  { name: "Slack", description: "Get hiring notifications in Slack", status: "coming_soon" },
];

export default function IntegrationSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Integrations</h1>
      <div className="space-y-3">
        {integrations.map(i => (
          <Card key={i.name}><CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3"><Puzzle className="h-5 w-5 text-muted-foreground" /><div><p className="text-sm font-medium">{i.name}</p><p className="text-xs text-muted-foreground">{i.description}</p></div></div>
            {i.status === "coming_soon" ? <Badge variant="secondary">Coming Soon</Badge> : <Button variant="outline" size="sm">Connect</Button>}
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
