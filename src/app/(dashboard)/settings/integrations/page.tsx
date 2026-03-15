"use client";

import { useState } from "react";
import { Puzzle, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Integration {
  id: string;
  name: string;
  description: string;
  status: "connected" | "not_connected" | "coming_soon";
  icon: string;
}

export default function IntegrationSettingsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([
    { id: "gcal", name: "Google Calendar", description: "Sync interview schedules and create calendar events automatically", status: "not_connected", icon: "calendar" },
    { id: "gmeet", name: "Google Meet", description: "Auto-generate meeting links for virtual interviews", status: "not_connected", icon: "video" },
    { id: "slack", name: "Slack", description: "Get real-time hiring notifications in your Slack channels", status: "coming_soon", icon: "message" },
    { id: "linkedin", name: "LinkedIn", description: "Import candidate profiles directly from LinkedIn", status: "coming_soon", icon: "user" },
  ]);

  const handleConnect = (id: string) => {
    // In production, this would initiate OAuth flow
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "connected" as const } : i))
    );
  };

  const handleDisconnect = (id: string) => {
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "not_connected" as const } : i))
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Integrations</h1>
      <p className="text-sm text-muted-foreground">
        Connect external services to streamline your hiring workflow.
      </p>

      <div className="space-y-3">
        {integrations.map((integration) => (
          <Card key={integration.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Puzzle className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{integration.name}</p>
                    {integration.status === "connected" && (
                      <Badge className="bg-green-100 text-green-700">
                        <Check className="mr-1 h-3 w-3" />
                        Connected
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{integration.description}</p>
                </div>
              </div>
              <div>
                {integration.status === "coming_soon" && (
                  <Badge variant="secondary">Coming Soon</Badge>
                )}
                {integration.status === "not_connected" && (
                  <Button variant="outline" size="sm" onClick={() => handleConnect(integration.id)}>
                    Connect
                  </Button>
                )}
                {integration.status === "connected" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDisconnect(integration.id)}
                  >
                    <X className="mr-1 h-3 w-3" />
                    Disconnect
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
