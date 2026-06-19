"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Upload } from "lucide-react";
import type { VerificationResult, FieldResult, FieldStatus } from "@/lib/types";
import { prepareImage, type PreparedImage } from "@/lib/image";
import { buttonVariants } from "@/components/ui/button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { DocsDialog } from "@/components/docs-dialog";
import { cn } from "@/lib/utils";

const FIELDS = [
  { key: "brandName", label: "Brand name", placeholder: "e.g. OLD TOM DISTILLERY", tip: "The brand name the applicant entered. Matched case/punctuation-insensitive." },
  { key: "classType", label: "Class / type", placeholder: "e.g. Kentucky Straight Bourbon Whiskey", tip: "The class/type designation, e.g. the spirit or wine type." },
  { key: "alcoholContent", label: "Alcohol content", placeholder: "e.g. 45% Alc./Vol. (90 Proof)", tip: "Compared numerically — a different ABV is flagged." },
  { key: "netContents", label: "Net contents", placeholder: "e.g. 750 mL", tip: "Unit-normalized, so 750 mL = 750ML = 750 milliliters." },
  { key: "bottlerInfo", label: "Bottler name & address", placeholder: "e.g. Old Tom Distillery Co., Bardstown, KY", tip: "Name and address of the bottler/producer (optional)." },
  { key: "countryOfOrigin", label: "Country of origin (imports)", placeholder: "e.g. United States", tip: "Country of origin, mainly for imports (optional)." },
] as const;

type ExpectedKey = (typeof FIELDS)[number]["key"];
type Expected = Record<ExpectedKey, string>;
const EMPTY: Expected = { brandName: "", classType: "", alcoholContent: "", netContents: "", bottlerInfo: "", countryOfOrigin: "" };

const SAMPLES: { id: string; name: string; type: string; src: string; hint: string; expect: Partial<Expected> }[] = [
  { id: "bourbon", name: "Old Tom Distillery", type: "Bourbon", src: "/samples/bourbon.png", hint: "Compliant → Pass",
    expect: { brandName: "OLD TOM DISTILLERY", classType: "Kentucky Straight Bourbon Whiskey", alcoholContent: "45% Alc./Vol. (90 Proof)", netContents: "750 mL", bottlerInfo: "Old Tom Distillery Co., Bardstown, Kentucky" } },
  { id: "wine", name: "Crimson Vale", type: "Cabernet Sauvignon", src: "/samples/wine.png", hint: "Compliant → Pass",
    expect: { brandName: "CRIMSON VALE", classType: "Cabernet Sauvignon", alcoholContent: "13.5% Alc./Vol.", netContents: "750 mL", bottlerInfo: "Crimson Vale Winery, Napa, California" } },
  { id: "vodka", name: "Silver Birch", type: "Vodka", src: "/samples/vodka.png", hint: "Warning not ALL-CAPS → Fail",
    expect: { brandName: "SILVER BIRCH", classType: "Vodka", alcoholContent: "40% Alc./Vol. (80 Proof)", netContents: "750 mL", bottlerInfo: "Silver Birch Spirits, Austin, Texas" } },
  { id: "sake", name: "Sho Chiku Bai", type: "Sake · real photo", src: "/samples/sake.png", hint: "Real bottle photo · warning on back",
    expect: { brandName: "Sho Chiku Bai", classType: "Sake", alcoholContent: "15% Alc./Vol.", netContents: "375 mL" } },
];

async function verifyImage(img: PreparedImage, expected: Partial<Expected>): Promise<VerificationResult> {
  const res = await fetch("/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: img.base64, mediaType: img.mediaType, expected }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || data.error || "Verification failed");
  return data.result as VerificationResult;
}

export default function Home() {
  return (
    <TooltipProvider>
      <main className="relative min-h-screen overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-32 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-violet-600/25 blur-[100px]" />
          <div className="absolute -top-16 right-0 h-72 w-[32rem] rounded-full bg-fuchsia-500/20 blur-[110px]" />
          <div className="absolute top-48 left-1/4 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-purple-500/15 blur-[120px]" />
        </div>
        <div className="mx-auto max-w-3xl px-5 py-8">
          <header className="mb-8 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30">
                <ShieldCheck className="size-6" />
              </div>
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-violet-500">Alcohol &amp; Tobacco Tax and Trade Bureau</p>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Label Verification</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">Check an alcohol label against its application in seconds.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/grade" title="Open the reviewer grading rubric" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                Grade
              </Link>
              <DocsDialog />
              <ThemeToggle />
            </div>
          </header>

          <Tabs defaultValue="single">
            <TabsList className="mb-6">
              <TabsTrigger value="single">Single label</TabsTrigger>
              <TabsTrigger value="batch">Batch</TabsTrigger>
            </TabsList>
            <TabsContent value="single"><SingleMode /></TabsContent>
            <TabsContent value="batch"><BatchMode /></TabsContent>
          </Tabs>

          <footer className="mt-12 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
            <span>TTB label-verification prototype · Claude vision + deterministic checks</span>
            <div className="flex items-center gap-4">
              <a href="https://github.com/BarnsL/ttb-label-verifier" target="_blank" rel="noreferrer" className="transition hover:text-violet-500">Source</a>
              <Link href="/grade" className="transition hover:text-violet-500">Grade this app</Link>
            </div>
          </footer>
        </div>
      </main>
    </TooltipProvider>
  );
}

function SingleMode() {
  const [expected, setExpected] = useState<Expected>(EMPTY);
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function runVerify(img: PreparedImage, exp: Expected) {
    setBusy(true); setError(""); setResult(null);
    try { setResult(await verifyImage(img, exp)); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  async function pick(file?: File) {
    if (!file) return;
    setResult(null); setError("");
    try { setImage(await prepareImage(file)); } catch (e) { setError(String(e)); }
  }
  async function loadSample(s: (typeof SAMPLES)[number]) {
    setError(""); setResult(null);
    try {
      const blob = await (await fetch(s.src)).blob();
      const img = await prepareImage(new File([blob], s.id + ".png", { type: "image/png" }));
      const exp = { ...EMPTY, ...s.expect };
      setImage(img); setExpected(exp);
      await runVerify(img, exp);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Try a sample — one click, no upload</CardTitle>
          <CardDescription>Pre-loads a label and its application, then runs the check.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SAMPLES.map((s) => (
            <Tooltip key={s.id}>
              <TooltipTrigger
                onClick={() => loadSample(s)}
                disabled={busy}
                className="group relative overflow-hidden rounded-xl border bg-card p-3 text-left transition hover:-translate-y-0.5 hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10 disabled:pointer-events-none disabled:opacity-50"
              >
                <div className="relative mb-3 aspect-[3/4] overflow-hidden rounded-lg border bg-white">
                  <Image src={s.src} alt={s.name} fill sizes="220px" className="object-contain transition duration-300 group-hover:scale-[1.04]" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.type}</div>
                  </div>
                  <span className="shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-violet-500">→</span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">{s.hint}</div>
              </TooltipTrigger>
              <TooltipContent>Load &amp; verify this sample instantly — no upload</TooltipContent>
            </Tooltip>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Application details</CardTitle>
          <CardDescription>What the applicant says is on the label. Blank fields are skipped. Hover a label for details.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.key} className="grid gap-1.5">
              <Label htmlFor={f.key} title={f.tip} className="w-fit cursor-help">{f.label}</Label>
              <Input id={f.key} value={expected[f.key]} placeholder={f.placeholder}
                onChange={(e) => setExpected((p) => ({ ...p, [f.key]: e.target.value }))} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">2. Label image</CardTitle></CardHeader>
        <CardContent>
          <label title="Upload a label image (JPEG or PNG)" className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted/40 px-6 py-8 text-center transition hover:border-primary hover:bg-muted/60">
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.dataUrl} alt="Label preview" className="max-h-56 rounded-md border" />
            ) : (
              <>
                <Upload className="size-6 text-muted-foreground" />
                <span className="font-medium">Tap to choose a label photo</span>
                <span className="text-sm text-muted-foreground">or pick a sample above · JPEG / PNG</span>
              </>
            )}
          </label>
          {image && <p className="mt-2 text-sm text-muted-foreground">{image.name}</p>}
        </CardContent>
      </Card>

      <ShimmerButton
        onClick={() => image && runVerify(image, expected)}
        disabled={!image || busy}
        title="Read the label with AI and check it against the application details"
        background="linear-gradient(110deg,#7c3aed,#9333ea,#c026d3)"
        className="h-12 w-full rounded-xl text-base font-medium text-white dark:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Checking…" : "Verify label"}
      </ShimmerButton>

      {error && <p role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive">{error}</p>}
      <div aria-live="polite">{result && <ResultView result={result} />}</div>
    </div>
  );
}

function ResultView({ result }: { result: VerificationResult }) {
  const tone =
    result.overall === "pass" ? "border-green-600/30 bg-green-600/5"
    : result.overall === "review" ? "border-amber-500/30 bg-amber-500/5"
    : "border-red-600/30 bg-red-600/5";
  const headline = result.overall === "pass" ? "Everything matches" : result.overall === "review" ? "Needs a quick look" : "Problems found";
  return (
    <Card className={tone}>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <StatusBadge status={result.overall} />
        <CardTitle className="text-lg">{headline}</CardTitle>
      </CardHeader>
      <CardContent className="divide-y py-0">
        {result.fields.map((f) => <FieldRow key={f.field} f={f} />)}
        <div className="py-3">
          <div className="flex items-center gap-2"><StatusBadge status={result.warning.status} /><span className="font-medium">Government Warning</span></div>
          <p className="mt-1 text-sm text-muted-foreground">{result.warning.message}</p>
          {result.warning.differences.length > 0 && (
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {result.warning.differences.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          )}
        </div>
      </CardContent>
      <div className="flex justify-between px-6 pb-4 text-xs text-muted-foreground">
        <span>Read by {result.model}</span>
        <span>{(result.elapsedMs / 1000).toFixed(1)}s{result.elapsedMs > 5000 ? " · over 5s target" : ""}</span>
      </div>
    </Card>
  );
}

function FieldRow({ f }: { f: FieldResult }) {
  return (
    <div className="py-3">
      <div className="flex items-center gap-2"><StatusBadge status={f.status} /><span className="font-medium">{f.field}</span></div>
      <p className="mt-1 text-sm text-muted-foreground">{f.message}</p>
      {(f.expected || f.found) && (
        <p className="mt-1 text-xs text-muted-foreground">
          Application: <span className="text-foreground">{f.expected ?? "—"}</span> · Label: <span className="text-foreground">{f.found ?? "—"}</span>
        </p>
      )}
    </div>
  );
}

const STATUS_CLASS: Record<string, string> = {
  pass: "border-transparent bg-green-600/15 text-green-700 dark:text-green-400",
  review: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
  warn: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
  fail: "border-transparent bg-red-600/15 text-red-700 dark:text-red-400",
  missing: "border-transparent bg-red-600/15 text-red-700 dark:text-red-400",
  skipped: "border-transparent bg-muted text-muted-foreground",
};
const STATUS_WORD: Record<string, string> = { pass: "Pass", review: "Review", warn: "Review", fail: "Fail", missing: "Missing", skipped: "Not checked" };
const STATUS_ICON: Record<string, string> = { pass: "✓", review: "!", warn: "!", fail: "✕", missing: "✕", skipped: "–" };

function StatusBadge({ status }: { status: FieldStatus | "review" }) {
  return (
    <Badge className={STATUS_CLASS[status] ?? STATUS_CLASS.skipped}>
      <span className="mr-1" aria-hidden>{STATUS_ICON[status]}</span>{STATUS_WORD[status]}
    </Badge>
  );
}

type Row = { img: PreparedImage; status: "pending" | "running" | "done" | "error"; result?: VerificationResult; error?: string };

const CSV_MAP: Record<string, string> = {
  filename: "filename", file: "filename", brand: "brandName", "brand name": "brandName", brandname: "brandName",
  class: "classType", "class/type": "classType", type: "classType", abv: "alcoholContent", alcohol: "alcoholContent",
  "alcohol content": "alcoholContent", net: "netContents", "net contents": "netContents", netcontents: "netContents", contents: "netContents",
  bottler: "bottlerInfo", "bottler name": "bottlerInfo", producer: "bottlerInfo",
  country: "countryOfOrigin", "country of origin": "countryOfOrigin", origin: "countryOfOrigin",
};

function parseCsv(text: string): Record<string, Partial<Expected>> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return {};
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const out: Record<string, Partial<Expected>> = {};
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((c) => c.trim());
    const row: Partial<Expected> = {};
    let fname = "";
    headers.forEach((h, j) => {
      const key = CSV_MAP[h];
      if (key === "filename") fname = cells[j];
      else if (key) (row as Record<string, string>)[key] = cells[j] ?? "";
    });
    if (fname) out[fname] = row;
  }
  return out;
}

function BatchMode() {
  const [rows, setRows] = useState<Row[]>([]);
  const [csv, setCsv] = useState<Record<string, Partial<Expected>>>({});
  const [busy, setBusy] = useState(false);

  async function pick(files: FileList | null) {
    if (!files?.length) return;
    const prepared = await Promise.all([...files].map((f) => prepareImage(f)));
    setRows(prepared.map((img) => ({ img, status: "pending" })));
  }
  function loadCsv(file?: File) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setCsv(parseCsv(String(r.result)));
    r.readAsText(file);
  }
  async function run() {
    setBusy(true);
    setRows((prev) => prev.map((r) => ({ ...r, status: "pending", result: undefined, error: undefined })));
    const snap = rows.map((r) => r.img);
    let next = 0;
    async function worker() {
      while (next < snap.length) {
        const i = next++;
        setRows((prev) => prev.map((r, j) => (j === i ? { ...r, status: "running" } : r)));
        try {
          const res = await verifyImage(snap[i], csv[snap[i].name] ?? {});
          setRows((prev) => prev.map((r, j) => (j === i ? { ...r, status: "done", result: res } : r)));
        } catch (e) {
          setRows((prev) => prev.map((r, j) => (j === i ? { ...r, status: "error", error: e instanceof Error ? e.message : String(e) } : r)));
        }
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    setBusy(false);
  }
  const done = rows.filter((r) => r.status === "done" || r.status === "error").length;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Batch screening</CardTitle>
          <CardDescription>Upload many labels; add an optional CSV of expected values, matched by filename.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <label title="Select multiple label images to screen at once" className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:bg-primary/90">
              <Upload className="size-4" />
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => pick(e.target.files)} />
              Choose label images
            </label>
            <label title="Optional CSV of expected values, matched to each image by filename" className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer")}>
              <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => loadCsv(e.target.files?.[0])} />
              Add expected values (CSV)
            </label>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {rows.length ? `${rows.length} image(s) ready` : "No images yet."}
            {Object.keys(csv).length ? ` · ${Object.keys(csv).length} CSV row(s) matched by filename` : ""}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">CSV columns: filename, brand, class, abv, net contents, bottler, country. Without a CSV, each label is screened for the Government Warning + consistency.</p>
        </CardContent>
      </Card>
      {rows.length > 0 && (
        <Tooltip>
          <TooltipTrigger className={cn(buttonVariants({ size: "lg" }), "w-full")} disabled={busy} onClick={run}>
            {busy ? `Checking… ${done}/${rows.length}` : `Verify all ${rows.length}`}
          </TooltipTrigger>
          <TooltipContent>Run the check on every image (3 in parallel) — using CSV expected values where matched</TooltipContent>
        </Tooltip>
      )}
      {rows.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr><th className="px-4 py-3">Label</th><th className="px-4 py-3">Result</th><th className="px-4 py-3">Gov. Warning</th><th className="px-4 py-3">Brand</th></tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r, i) => {
                  const brand = r.result?.fields.find((f) => f.field === "Brand Name");
                  return (
                    <tr key={i}>
                      <td className="max-w-[14rem] truncate px-4 py-3 font-medium">{r.img.name}</td>
                      <td className="px-4 py-3">{r.status === "running" ? "…" : r.status === "pending" ? "—" : r.error ? <span className="text-destructive">Error</span> : r.result && <StatusBadge status={r.result.overall} />}</td>
                      <td className="px-4 py-3">{r.result ? <StatusBadge status={r.result.warning.status} /> : "—"}</td>
                      <td className="px-4 py-3">{brand && brand.status !== "skipped" ? <StatusBadge status={brand.status} /> : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
