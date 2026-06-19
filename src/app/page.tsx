"use client";

import { useState } from "react";
import type { VerificationResult, FieldResult, FieldStatus } from "@/lib/types";
import { prepareImage, type PreparedImage } from "@/lib/image";

const FIELDS = [
  { key: "brandName", label: "Brand name", placeholder: "e.g. OLD TOM DISTILLERY" },
  { key: "classType", label: "Class / type", placeholder: "e.g. Kentucky Straight Bourbon Whiskey" },
  { key: "alcoholContent", label: "Alcohol content", placeholder: "e.g. 45% Alc./Vol. (90 Proof)" },
  { key: "netContents", label: "Net contents", placeholder: "e.g. 750 mL" },
  { key: "bottlerInfo", label: "Bottler name & address", placeholder: "e.g. Old Tom Distillery Co., Bardstown, KY" },
  { key: "countryOfOrigin", label: "Country of origin (imports)", placeholder: "e.g. United States" },
] as const;

type ExpectedKey = (typeof FIELDS)[number]["key"];
type Expected = Record<ExpectedKey, string>;
const EMPTY: Expected = { brandName: "", classType: "", alcoholContent: "", netContents: "", bottlerInfo: "", countryOfOrigin: "" };

type Style = { chip: string; text: string; icon: string; word: string };
const STATUS: Record<string, Style> = {
  pass: { chip: "bg-green-100 text-green-800 border-green-300", text: "text-green-800", icon: "✓", word: "Pass" },
  review: { chip: "bg-amber-100 text-amber-900 border-amber-300", text: "text-amber-900", icon: "!", word: "Review" },
  warn: { chip: "bg-amber-100 text-amber-900 border-amber-300", text: "text-amber-900", icon: "!", word: "Review" },
  fail: { chip: "bg-red-100 text-red-800 border-red-300", text: "text-red-800", icon: "✕", word: "Fail" },
  missing: { chip: "bg-red-100 text-red-800 border-red-300", text: "text-red-800", icon: "✕", word: "Missing" },
  skipped: { chip: "bg-zinc-100 text-zinc-600 border-zinc-300", text: "text-zinc-600", icon: "–", word: "Not checked" },
};
const styleFor = (s: FieldStatus | "review") => STATUS[s] ?? STATUS.skipped;

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
  const [mode, setMode] = useState<"single" | "batch">("single");
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-3xl px-5 py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">TTB Label Verification</h1>
          <p className="mt-1 text-lg text-zinc-600">
            Check an alcohol label against its application in seconds.
          </p>
        </header>

        <div className="mb-6 inline-flex rounded-lg border border-zinc-300 bg-white p-1" role="tablist" aria-label="Mode">
          {(["single", "batch"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-md px-5 py-2 text-base font-medium transition ${mode === m ? "bg-blue-700 text-white" : "text-zinc-700 hover:bg-zinc-100"}`}
            >
              {m === "single" ? "Single label" : "Batch"}
            </button>
          ))}
        </div>

        {mode === "single" ? <SingleMode /> : <BatchMode />}
      </div>
    </main>
  );
}

function SingleMode() {
  const [expected, setExpected] = useState<Expected>(EMPTY);
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function pick(file?: File) {
    if (!file) return;
    setResult(null);
    setError("");
    try {
      setImage(await prepareImage(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function verify() {
    if (!image) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await verifyImage(image, expected));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-1 text-xl font-semibold">1. Application details</h2>
        <p className="mb-4 text-zinc-600">What the applicant says is on the label. Leave any field blank to skip it.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700">{f.label}</span>
              <input
                type="text"
                value={expected[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => setExpected((p) => ({ ...p, [f.key]: e.target.value }))}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 text-xl font-semibold">2. Label image</h2>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center hover:border-blue-500 hover:bg-blue-50">
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image.dataUrl} alt="Label preview" className="max-h-56 rounded-md border border-zinc-200" />
          ) : (
            <>
              <span className="text-lg font-medium text-zinc-700">Tap to choose a label photo</span>
              <span className="text-sm text-zinc-500">or drag an image here · JPEG / PNG</span>
            </>
          )}
        </label>
        {image && <p className="mt-2 text-sm text-zinc-500">{image.name} — tap above to change.</p>}
      </section>

      <button
        onClick={verify}
        disabled={!image || busy}
        className="w-full rounded-xl bg-blue-700 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-40"
      >
        {busy ? "Checking…" : "Verify label"}
      </button>

      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </p>
      )}

      <div aria-live="polite">{result && <ResultView result={result} />}</div>
    </div>
  );
}

function ResultView({ result }: { result: VerificationResult }) {
  const s = styleFor(result.overall);
  const headline =
    result.overall === "pass" ? "Everything matches" : result.overall === "review" ? "Needs a quick look" : "Problems found";
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className={`flex items-center gap-3 border-b px-5 py-4 ${s.chip}`}>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-xl font-bold" aria-hidden>
          {s.icon}
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">{s.word}</p>
          <p className="text-xl font-bold">{headline}</p>
        </div>
      </div>

      <ul className="divide-y divide-zinc-100">
        {result.fields.map((f) => (
          <FieldRow key={f.field} f={f} />
        ))}
        <li className="px-5 py-4">
          <div className="flex items-center gap-2">
            <StatusChip status={result.warning.status} />
            <span className="font-semibold">Government Warning</span>
          </div>
          <p className="mt-1 text-zinc-700">{result.warning.message}</p>
          {result.warning.differences.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600">
              {result.warning.differences.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
        </li>
      </ul>

      <footer className="flex flex-wrap justify-between gap-2 bg-zinc-50 px-5 py-3 text-xs text-zinc-500">
        <span>Read by {result.model}</span>
        <span>{(result.elapsedMs / 1000).toFixed(1)}s{result.elapsedMs > 5000 ? " — over the 5s target" : ""}</span>
      </footer>
    </section>
  );
}

function FieldRow({ f }: { f: FieldResult }) {
  return (
    <li className="px-5 py-4">
      <div className="flex items-center gap-2">
        <StatusChip status={f.status} />
        <span className="font-semibold">{f.field}</span>
      </div>
      <p className="mt-1 text-zinc-700">{f.message}</p>
      {(f.expected || f.found) && (
        <p className="mt-1 text-sm text-zinc-500">
          Application: <span className="text-zinc-700">{f.expected ?? "—"}</span> · Label:{" "}
          <span className="text-zinc-700">{f.found ?? "—"}</span>
        </p>
      )}
    </li>
  );
}

function StatusChip({ status }: { status: FieldStatus | "review" }) {
  const s = styleFor(status);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${s.chip}`}>
      <span aria-hidden>{s.icon}</span> {s.word}
    </span>
  );
}

// ---- Batch mode ----

type Row = { img: PreparedImage; status: "pending" | "running" | "done" | "error"; result?: VerificationResult; error?: string };

const CSV_MAP: Record<string, string> = {
  filename: "filename", file: "filename", brand: "brandName", "brand name": "brandName", brandname: "brandName",
  class: "classType", "class/type": "classType", type: "classType", abv: "alcoholContent", alcohol: "alcoholContent",
  "alcohol content": "alcoholContent", net: "netContents", "net contents": "netContents", netcontents: "netContents", contents: "netContents",
  bottler: "bottlerInfo", "bottler name": "bottlerInfo", "bottler name & address": "bottlerInfo", producer: "bottlerInfo",
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
    const snapshot = rows.map((r) => r.img);
    let next = 0;
    async function worker() {
      while (next < snapshot.length) {
        const idx = next++;
        setRows((prev) => prev.map((r, j) => (j === idx ? { ...r, status: "running" } : r)));
        try {
          const res = await verifyImage(snapshot[idx], csv[snapshot[idx].name] ?? {});
          setRows((prev) => prev.map((r, j) => (j === idx ? { ...r, status: "done", result: res } : r)));
        } catch (e) {
          setRows((prev) => prev.map((r, j) => (j === idx ? { ...r, status: "error", error: e instanceof Error ? e.message : String(e) } : r)));
        }
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    setBusy(false);
  }

  const done = rows.filter((r) => r.status === "done" || r.status === "error").length;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 text-xl font-semibold">Upload labels</h2>
        <div className="flex flex-wrap gap-3">
          <label className="cursor-pointer rounded-lg bg-blue-700 px-4 py-2.5 font-medium text-white hover:bg-blue-800">
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => pick(e.target.files)} />
            Choose label images
          </label>
          <label className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-2.5 font-medium text-zinc-700 hover:bg-zinc-50">
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => loadCsv(e.target.files?.[0])} />
            Add expected values (CSV, optional)
          </label>
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          {rows.length > 0 ? `${rows.length} image(s) ready` : "No images yet."}
          {Object.keys(csv).length > 0 ? ` · ${Object.keys(csv).length} CSV row(s) matched by filename` : ""}
        </p>
        <p className="mt-1 text-xs text-zinc-400">CSV columns: filename, brand, class, abv, net contents. Without a CSV, each label is screened for the Government Warning and field consistency.</p>
      </section>

      {rows.length > 0 && (
        <button
          onClick={run}
          disabled={busy}
          className="w-full rounded-xl bg-blue-700 px-6 py-3.5 text-lg font-semibold text-white hover:bg-blue-800 disabled:opacity-40"
        >
          {busy ? `Checking… ${done}/${rows.length}` : `Verify all ${rows.length}`}
        </button>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3">Gov. Warning</th>
                <th className="px-4 py-3">Brand</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((r, i) => {
                const brand = r.result?.fields.find((f) => f.field === "Brand Name");
                return (
                  <tr key={i}>
                    <td className="max-w-[14rem] truncate px-4 py-3 font-medium">{r.img.name}</td>
                    <td className="px-4 py-3">
                      {r.status === "running" ? "…" : r.status === "pending" ? "—" : r.error ? <span className="text-red-700">Error</span> : r.result && <StatusChip status={r.result.overall} />}
                    </td>
                    <td className="px-4 py-3">{r.result ? <StatusChip status={r.result.warning.status} /> : "—"}</td>
                    <td className="px-4 py-3">{brand ? <StatusChip status={brand.status} /> : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
