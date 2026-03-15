"use client";

import { Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const templates = [
  { code: "interview_invite", name: "Interview Invitation", description: "Sent when scheduling an interview" },
  { code: "offer_letter", name: "Offer Letter", description: "Sent with job offer details" },
  { code: "application_received", name: "Application Received", description: "Auto-reply to applicants" },
  { code: "rejection", name: "Rejection Notice", description: "Sent when declining a candidate" },
];

export default function TemplateSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Email Templates</h1>
      <div className="space-y-3">
        {templates.map(t => (
          <Card key={t.code} className="cursor-pointer hover:shadow-md">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm font-medium">{t.name}</p><p className="text-xs text-muted-foreground">{t.description}</p></div></div>
              <Badge variant="outline">{t.code}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
