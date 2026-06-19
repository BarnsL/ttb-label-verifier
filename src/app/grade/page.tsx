"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const CRITERIA = [
  "Correctness & completeness of core requirements",
  "Code quality & organization",
  "Appropriate technical choices for the scope",
  "User experience & error handling",
  "Attention to requirements",
  "Creative problem-solving",
];
const RECS = ["Advance", "Maybe", "Do not advance"];

export default function GradePage() {
  const [reviewer, setReviewer] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [recommendation, setRecommendation] = useState("");
  const [comments, setComments] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");
  const total = CRITERIA.reduce((a, c) => a + (scores[c] || 0), 0);

  async function submit() {
    setStatus("sending");
    setMsg("");
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer, scores, recommendation, comments }),
      });
      const data = await res.json();
      if (!res.ok) { setStatus("error"); setMsg(data.detail || data.error || "Failed to send."); return; }
      setStatus("sent");
    } catch (e) {
      setStatus("error");
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-2xl px-5 py-8">
        <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-4 gap-1")}>
          <ArrowLeft className="size-4" /> Back to the app
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Grade this prototype</h1>
        <p className="mt-1 text-muted-foreground">Score each area 1–5 against the take-home's evaluation criteria. Submitting emails the results to the candidate.</p>

        {status === "sent" ? (
          <Card className="mt-6 border-green-600/30 bg-green-600/5">
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <CheckCircle2 className="size-7 text-green-600" />
              <div>
                <CardTitle>Review sent — thank you</CardTitle>
                <CardDescription>Your scores ({total} / 30) were emailed to the candidate.</CardDescription>
              </div>
            </CardHeader>
          </Card>
        ) : (
          <div className="mt-6 space-y-5">
            <Card>
              <CardContent className="space-y-4 pt-6">
                {CRITERIA.map((c) => (
                  <div key={c} className="flex flex-col gap-2 border-b pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-medium">{c}</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button" aria-label={`${c}: ${n}`} onClick={() => setScores((p) => ({ ...p, [c]: n }))}
                          className={cn("size-9 rounded-md border text-sm font-medium transition", scores[c] === n ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="text-sm font-bold">{total} / 30</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="grid gap-1.5">
                  <Label htmlFor="reviewer">Your name (optional)</Label>
                  <Input id="reviewer" value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="e.g. Sarah Chen, Label Compliance" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Recommendation</Label>
                  <div className="flex flex-wrap gap-2">
                    {RECS.map((r) => (
                      <button key={r} type="button" onClick={() => setRecommendation(r)}
                        className={cn("rounded-md border px-3 py-1.5 text-sm transition", recommendation === r ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="comments">Comments (optional)</Label>
                  <textarea id="comments" value={comments} onChange={(e) => setComments(e.target.value)} rows={4}
                    className="rounded-md border bg-transparent p-3 text-sm outline-none focus:border-primary"
                    placeholder="What stood out, and what you'd want improved…" />
                </div>
              </CardContent>
            </Card>

            {status === "error" && <p role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{msg}</p>}
            <button onClick={submit} disabled={status === "sending"} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
              {status === "sending" ? "Sending…" : "Submit & email results"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
