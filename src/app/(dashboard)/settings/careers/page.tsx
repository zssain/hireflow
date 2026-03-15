"use client";

import { useEffect, useState } from "react";
import { Globe, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";

export default function CareerPageSettingsPage() {
  const { getToken } = useAuth();
  const { tenantId } = useTenant();
  const [enabled, setEnabled] = useState(false);
  const [intro, setIntro] = useState("");
  const [slug, setSlug] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      if (!tenantId) { setLoading(false); return; }
      const token = await getToken();
      if (!token) { setLoading(false); return; }

      const res = await globalThis.fetch(`/api/tenant/settings?tenant_id=${tenantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const tenant = await res.json();
        setEnabled(tenant.career_page?.enabled ?? false);
        setIntro(tenant.career_page?.intro ?? "");
        setSlug(tenant.slug ?? "");
        setPrimaryColor(tenant.branding?.primary_color ?? "#2563eb");
      }
    }
    load();
  }, [tenantId, getToken]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    const token = await getToken();
    if (!token || !tenantId) return;

    const res = await globalThis.fetch("/api/tenant/settings", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        career_page: { enabled, intro },
        branding: { primary_color: primaryColor },
      }),
    });

    if (res.ok) setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Career Page</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Public Career Page
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="enabled">Enable public career page</Label>
          </div>

          {enabled && slug && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="text-muted-foreground">Your career page URL:</p>
              <a
                href={`${appUrl}/careers/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-brand-600 hover:underline"
              >
                {appUrl}/careers/{slug}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          <div className="space-y-2">
            <Label>Introduction Text</Label>
            <Textarea
              placeholder="Tell candidates about your company culture, mission, and what makes you a great place to work..."
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Brand Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-10 rounded border cursor-pointer"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-32"
                placeholder="#2563eb"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            {saved && <span className="text-sm text-green-600">Saved!</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
