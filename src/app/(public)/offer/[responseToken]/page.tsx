"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function OfferResponsePage() {
  const params = useParams();
  const token = params.responseToken as string;
  const [responded, setResponded] = useState(false);
  const [response, setResponse] = useState<"accept" | "decline" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRespond = async (decision: "accept" | "decline") => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/public/offers/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: decision }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error); }
      setResponse(decision);
      setResponded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit response");
    } finally {
      setLoading(false);
    }
  };

  if (responded) {
    const accepted = response === "accept";
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            {accepted ? <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" /> : <XCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />}
            <h2 className="text-xl font-bold">{accepted ? "Offer Accepted!" : "Offer Declined"}</h2>
            <p className="mt-2 text-muted-foreground">{accepted ? "Congratulations! We'll be in touch with next steps." : "Thank you for letting us know."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Your Offer</CardTitle>
          <CardDescription>Please review and respond to your offer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => handleRespond("accept")} disabled={loading}>Accept Offer</Button>
            <Button className="flex-1" variant="outline" onClick={() => handleRespond("decline")} disabled={loading}>Decline</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
