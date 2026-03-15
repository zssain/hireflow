"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const [status, setStatus] = useState<"checking" | "needs_auth" | "accepting" | "done" | "error">("checking");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getClientAuth(), async (user) => {
      if (!user) {
        setStatus("needs_auth");
        return;
      }

      setStatus("accepting");
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/auth/accept-invite", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ invite_token: token }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to accept invite");
        }

        setStatus("done");
        setTimeout(() => router.push("/dashboard"), 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to accept invite");
        setStatus("error");
      }
    });

    return () => unsubscribe();
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-brand-600">HireFlow</CardTitle>
          <CardDescription>Team Invitation</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {status === "checking" && <p className="text-muted-foreground">Checking invitation...</p>}

          {status === "needs_auth" && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Please sign in or create an account to accept this invitation.
              </p>
              <div className="flex gap-3 justify-center">
                <Button asChild>
                  <Link href={`/login?redirect=/invite/${token}`}>Sign in</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/signup?redirect=/invite/${token}`}>Sign up</Link>
                </Button>
              </div>
            </div>
          )}

          {status === "accepting" && (
            <p className="text-muted-foreground">Accepting invitation...</p>
          )}

          {status === "done" && (
            <div className="space-y-2">
              <p className="text-success font-medium">Invitation accepted!</p>
              <p className="text-muted-foreground text-sm">Redirecting to dashboard...</p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" asChild>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
