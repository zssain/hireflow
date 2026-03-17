"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OfferStatus } from "@/components/offers/offer-status";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { useMembership } from "@/hooks/use-membership";
import { useApiQuery, invalidateCache } from "@/hooks/use-api-query";

export default function OfferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const { tenantId } = useTenant();
  const { can } = useMembership();
  const [actionLoading, setActionLoading] = useState(false);
  const offerId = params.offerId as string;

  const { data: offer, loading, refetch } = useApiQuery<Record<string, unknown> | null>(
    "/offers",
    {
      transform: (raw: unknown) => {
        const data = raw as { offers: Record<string, unknown>[] };
        return data.offers.find((o) => o.offer_id === offerId) ?? null;
      },
    }
  );

  const handleAction = async (action: "approve" | "send") => {
    setActionLoading(true);
    const token = await getToken();
    if (!token || !tenantId) return;
    const res = await fetch(`/api/offers/${offerId}/${action}?tenant_id=${tenantId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId }),
    });
    if (res.ok) {
      invalidateCache("/offers");
      refetch();
    }
    setActionLoading(false);
  };

  if (loading) return <LoadingSkeleton variant="detail" />;
  if (!offer) return <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">Offer not found</div>;

  const fields = offer.generated_fields as Record<string, string>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/offers")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Offer for {fields.candidate_name}</h1>
          <p className="text-sm text-muted-foreground">{fields.job_title}</p>
        </div>
        <OfferStatus status={offer.status as string} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Offer Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(fields).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-sm text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
              <span className="text-sm font-medium">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="flex gap-3">
        {offer.status === "draft" && can("approve_offers") && (
          <Button onClick={() => handleAction("approve")} disabled={actionLoading}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Approve
          </Button>
        )}
        {offer.status === "approved" && can("send_offers") && (
          <Button onClick={() => handleAction("send")} disabled={actionLoading}>
            <Send className="mr-2 h-4 w-4" />
            Send to Candidate
          </Button>
        )}
      </div>
    </div>
  );
}
