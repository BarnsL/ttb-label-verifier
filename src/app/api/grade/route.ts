import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CRITERIA = [
  "Correctness & completeness of core requirements",
  "Code quality & organization",
  "Appropriate technical choices for the scope",
  "User experience & error handling",
  "Attention to requirements",
  "Creative problem-solving",
];

interface Body {
  reviewer?: string;
  scores?: Record<string, number>;
  recommendation?: string;
  comments?: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

export async function POST(req: Request) {
  if (!process.env.RESEND_API_KEY) {
    return json({ error: "Email is not configured on this deployment (missing RESEND_API_KEY)." }, 500);
  }

  if (!rateLimit(`grade:${clientIp(req)}`, 5, 60_000)) {
    return json({ error: "Too many requests — please wait a moment." }, 429);
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: "Request body must be JSON." }, 400);
  }

  const scores = body.scores ?? {};
  const vals = CRITERIA.map((c) => {
    const n = Number(scores[c]);
    return Number.isFinite(n) && n >= 1 && n <= 5 ? Math.round(n) : 0;
  });
  const total = vals.reduce((a, b) => a + b, 0);
  const max = CRITERIA.length * 5;
  const reviewer = (body.reviewer || "Anonymous reviewer").slice(0, 120);
  const recommendation = (body.recommendation || "—").slice(0, 40);
  const comments = (body.comments || "").slice(0, 4000);
  const when = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });

  const rows = CRITERIA.map(
    (c, i) =>
      `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(c)}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;font-weight:600">${vals[i] || "—"} / 5</td></tr>`,
  ).join("");

  const html = `<div style="font-family:system-ui,Arial,sans-serif;max-width:560px;color:#111">
    <h2 style="margin:0 0 4px">TTB Label Verifier — review submitted</h2>
    <p style="color:#666;margin:0 0 16px">From <b>${esc(reviewer)}</b> · ${esc(when)} ET</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px">${rows}
      <tr><td style="padding:8px 10px;font-weight:700">Total</td><td style="padding:8px 10px;text-align:center;font-weight:700">${total} / ${max}</td></tr>
    </table>
    <p style="margin:16px 0 4px"><b>Recommendation:</b> ${esc(recommendation)}</p>
    ${comments ? `<p style="margin:8px 0"><b>Comments:</b><br>${esc(comments).replace(/\n/g, "<br>")}</p>` : ""}
  </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.GRADE_EMAIL_FROM || "TTB Label Verifier <onboarding@resend.dev>",
        to: [process.env.GRADE_EMAIL_TO || "purpleindustries@pm.me"],
        subject: `TTB review: ${total}/${max} — ${reviewer}`,
        html,
      }),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 400);
      return json({ error: "Email send failed.", detail }, 502);
    }
    return json({ ok: true, total, max });
  } catch (e) {
    return json({ error: "Email send failed.", detail: e instanceof Error ? e.message : String(e) }, 502);
  }
}
