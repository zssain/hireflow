"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SlotPicker } from "@/components/interviews/slot-picker";

export default function BookInterviewPage() {
  const params = useParams();
  const token = params.bookingToken as string;
  const [slots, setSlots] = useState<Array<{ start: string; end: string }>>([]);
  const [booked, setBooked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // In production, fetch interview details and slots via API
    // For now, slots come from the interview creation
  }, [token]);

  const handleSelect = async (start: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/public/interviews/${token}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_token: token, selected_start: start }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error); }
      setBooked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  if (booked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
            <h2 className="text-xl font-bold">Interview Booked!</h2>
            <p className="mt-2 text-muted-foreground">You'll receive a calendar invite shortly.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Book Your Interview</CardTitle>
          <CardDescription>Select a time that works for you</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          {slots.length > 0 ? (
            <SlotPicker slots={slots} onSelect={handleSelect} loading={loading} />
          ) : (
            <p className="text-muted-foreground text-sm">Loading available times...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
