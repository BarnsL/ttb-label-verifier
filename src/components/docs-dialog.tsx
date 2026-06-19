"use client";

import * as React from "react";
import { BookOpen } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const md: Components = {
  h1: (p) => <h1 className="mt-5 mb-2 text-xl font-bold tracking-tight" {...p} />,
  h2: (p) => <h2 className="mt-6 mb-2 border-b pb-1 text-lg font-semibold" {...p} />,
  h3: (p) => <h3 className="mt-4 mb-1 font-semibold" {...p} />,
  p: (p) => <p className="my-2 leading-relaxed break-words text-muted-foreground" {...p} />,
  a: (p) => <a className="font-medium break-all text-primary underline underline-offset-2" target="_blank" rel="noreferrer" {...p} />,
  ul: (p) => <ul className="my-2 list-disc space-y-1 pl-5 text-muted-foreground" {...p} />,
  ol: (p) => <ol className="my-2 list-decimal space-y-1 pl-5 text-muted-foreground" {...p} />,
  li: (p) => <li className="break-words" {...p} />,
  strong: (p) => <strong className="font-semibold text-foreground" {...p} />,
  code: (p) => <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] break-words" {...p} />,
  pre: (p) => <pre className="my-3 overflow-x-auto rounded-lg border bg-muted/60 p-3 text-xs" {...p} />,
  table: (p) => <div className="my-3 overflow-x-auto"><table className="w-full text-left text-xs" {...p} /></div>,
  th: (p) => <th className="border-b bg-muted/50 p-2 font-semibold" {...p} />,
  td: (p) => <td className="border-b p-2 align-top text-muted-foreground" {...p} />,
  hr: () => <hr className="my-4 border-border" />,
};

export function DocsDialog() {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");

  React.useEffect(() => {
    if (open && !text) {
      fetch("/api/readme")
        .then((r) => r.text())
        .then(setText)
        .catch(() => setText("# Documentation unavailable\n\nSee the repository README."));
    }
  }, [open, text]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label="Open the documentation (README)"
        title="Read the docs (README)"
        className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
      >
        <BookOpen className="size-5" />
      </DialogTrigger>
      <DialogContent className="max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Documentation</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-x-hidden overflow-y-auto pr-1">
          <article className="w-full min-w-0 text-sm break-words">
            {text ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>
                {text}
              </ReactMarkdown>
            ) : (
              <p className="text-muted-foreground">Loading…</p>
            )}
          </article>
        </div>
      </DialogContent>
    </Dialog>
  );
}
