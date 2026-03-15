"use client";

import { useState } from "react";
import { Mail, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface EmailTemplate {
  code: string;
  name: string;
  description: string;
  subject: string;
  body: string;
}

const defaultTemplates: EmailTemplate[] = [
  {
    code: "interview_invite",
    name: "Interview Invitation",
    description: "Sent when scheduling an interview",
    subject: "Interview for {{job_title}} at {{company_name}}",
    body: "Hi {{candidate_name}},\n\nWe'd like to invite you for an interview for the {{job_title}} position.\n\nPlease use the link below to pick a time:\n{{booking_link}}\n\nBest regards,\n{{company_name}}",
  },
  {
    code: "offer_letter",
    name: "Offer Letter",
    description: "Sent with job offer details",
    subject: "Offer for {{job_title}} at {{company_name}}",
    body: "Hi {{candidate_name}},\n\nWe're excited to offer you the position of {{job_title}}.\n\nSalary: {{salary}}\nJoining Date: {{joining_date}}\n\nPlease review and respond: {{offer_link}}\n\nBest regards,\n{{company_name}}",
  },
  {
    code: "application_received",
    name: "Application Received",
    description: "Auto-reply to applicants",
    subject: "Application received for {{job_title}}",
    body: "Hi {{candidate_name}},\n\nThank you for applying to {{job_title}} at {{company_name}}. We've received your application and will review it shortly.\n\nBest regards,\n{{company_name}}",
  },
  {
    code: "rejection",
    name: "Rejection Notice",
    description: "Sent when declining a candidate",
    subject: "Update on your {{job_title}} application",
    body: "Hi {{candidate_name}},\n\nThank you for your interest in {{job_title}} at {{company_name}}. After careful consideration, we've decided to move forward with other candidates.\n\nWe wish you the best.\n\nBest regards,\n{{company_name}}",
  },
];

export default function TemplateSettingsPage() {
  const [templates, setTemplates] = useState(defaultTemplates);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");

  const openEdit = (t: EmailTemplate) => {
    setEditing(t);
    setEditSubject(t.subject);
    setEditBody(t.body);
  };

  const saveEdit = () => {
    if (!editing) return;
    setTemplates((prev) =>
      prev.map((t) =>
        t.code === editing.code ? { ...t, subject: editSubject, body: editBody } : t
      )
    );
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Email Templates</h1>
      <p className="text-sm text-muted-foreground">
        Use {"{{variable}}"} placeholders. Available: candidate_name, job_title, company_name, salary, joining_date, booking_link, offer_link.
      </p>

      <div className="space-y-3">
        {templates.map((t) => (
          <Card key={t.code} className="hover:shadow-sm transition-shadow">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{t.code}</Badge>
                <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit: {editing?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={10} />
            </div>
            <Button onClick={saveEdit} className="w-full">
              Save Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
