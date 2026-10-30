import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/civic/shared";
import { useComplaints } from "@/lib/civic/store";
import { STATUSES } from "@/lib/civic/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/track")({
  validateSearch: z.object({ id: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Track your complaint – CivicSense AI" },
      { name: "description", content: "Follow your complaint from submitted to resolved with your tracking ID." },
      { property: "og:title", content: "Track your complaint – CivicSense AI" },
      { property: "og:description", content: "See the status and history of a civic complaint." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Track,
});

function Track() {
  const { id } = Route.useSearch();
  const navigate = useNavigate({ from: "/track" });
  const [q, setQ] = useState(id ?? "");
  const all = useComplaints();
  const c = id ? all.find((x) => x.id.toUpperCase() === id.trim().toUpperCase()) : undefined;
  const idx = c ? STATUSES.indexOf(c.status) : -1;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Track a complaint</h1>
      <form className="mt-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); navigate({ search: { id: q.trim() } }); }}>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tracking ID, e.g. CS-AB12CD" className="font-mono" />
        <Button type="submit">Track</Button>
      </form>
      {id && !c && <p className="mt-6 text-destructive">No complaint found with ID “{id}”.</p>}
      {c && (
        <div className="mt-8 rounded-xl border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-sm text-muted-foreground">{c.id}</span>
            <StatusBadge s={c.status} />
          </div>
          <h2 className="mt-2 text-xl font-semibold">{c.title}</h2>
          <p className="text-sm text-muted-foreground">{c.category} · {c.area} · {c.department ?? "Awaiting assignment"}</p>
          <ol className="mt-8 grid grid-cols-4 gap-2">
            {STATUSES.map((s, i) => (
              <li key={s} className="flex flex-col items-center text-center">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold", i <= idx ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>
                  {i <= idx ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={cn("mt-2 text-xs font-semibold", i <= idx ? "text-foreground" : "text-muted-foreground")}>{s}</span>
              </li>
            ))}
          </ol>
          {c.photo && <img src={c.photo} alt="Complaint" className="mt-6 max-h-60 rounded-md" />}
          <p className="mt-6 text-sm">{c.description}</p>
          <h3 className="mt-6 font-semibold">History</h3>
          <ul className="mt-2 space-y-3 border-l-2 border-accent pl-4">
            {[...c.history].reverse().map((h, i) => (
              <li key={i}>
                <div className="text-sm font-semibold">{h.status}</div>
                <div className="text-xs text-muted-foreground">{new Date(h.at).toLocaleString()}</div>
                <div className="text-sm">{h.note}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <RecentList onPick={(x) => { setQ(x); navigate({ search: { id: x } }); }} />
    </main>
  );
}

function RecentList({ onPick }: { onPick: (id: string) => void }) {
  const all = useComplaints().slice(0, 6);
  return (
    <div className="mt-10">
      <h3 className="text-sm font-semibold text-muted-foreground">Recent complaints (demo)</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {all.map((c) => (
          <button key={c.id} onClick={() => onPick(c.id)} className="rounded-md border bg-card px-2 py-1 font-mono text-xs hover:bg-secondary">{c.id}</button>
        ))}
      </div>
    </div>
  );
}
