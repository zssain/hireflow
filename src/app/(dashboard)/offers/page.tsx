"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { OfferStatus } from "@/components/offers/offer-status";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useApiQuery } from "@/hooks/use-api-query";

interface OfferSummary {
  offer_id: string;
  status: string;
  generated_fields: { candidate_name: string; job_title: string; salary: string };
  created_at: string;
}

export default function OffersPage() {
  const router = useRouter();
  const [tab, setTab] = useState("all");

  const { data: offers, loading } = useApiQuery<OfferSummary[]>("/offers", {
    transform: (raw: unknown) => (raw as { offers: OfferSummary[] }).offers,
  });

  const allOffers = offers ?? [];
  const filtered = tab === "all" ? allOffers : allOffers.filter((o) => o.status === tab);

  if (loading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Offers</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({allOffers.length})</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="accepted">Accepted</TabsTrigger>
        </TabsList>
      </Tabs>
      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No offers" description="Create offers from the candidate detail page." />
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <Card key={o.offer_id} className="cursor-pointer hover:shadow-md" onClick={() => router.push(`/offers/${o.offer_id}`)}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{o.generated_fields.candidate_name}</p>
                  <p className="text-sm text-muted-foreground">{o.generated_fields.job_title} &middot; {o.generated_fields.salary}</p>
                </div>
                <OfferStatus status={o.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
