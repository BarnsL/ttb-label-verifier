import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
// Read at build time and serve statically — the README ships with the repo.
export const dynamic = "force-static";

export async function GET() {
  try {
    const md = await readFile(join(process.cwd(), "README.md"), "utf8");
    return new Response(md, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
  } catch {
    return new Response("# README unavailable", {
      status: 500,
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  }
}
