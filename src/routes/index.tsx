import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { BrainCircuit, MapPin, ShieldCheck, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useComplaints } from "@/lib/civic/store";
import { detectHotspots } from "@/lib/civic/engine";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CivicSense AI – From Complaints to Action" },
      { name: "description", content: "Report public infrastructure problems and help authorities prioritise and resolve them with explainable AI." },
      { property: "og:title", content: "CivicSense AI – From Complaints to Action" },
      { property: "og:description", content: "AI-powered civic complaint reporting, prioritisation and tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const complaints = useComplaints();
  const stats = useMemo(() => {
    const resolved = complaints.filter((c) => c.status === "RESOLVED").length;
    return { total: complaints.length, resolved, open: complaints.length - resolved, hotspots: detectHotspots(complaints).length };
  }, [complaints]);

  const features = [
    { icon: BrainCircuit, t: "Auto-categorisation & summaries", d: "AI reads each report, assigns a category and writes a one-line summary." },
    { icon: Workflow, t: "Duplicate detection", d: "Matches text, category and location so crews fix a problem once." },
    { icon: ShieldCheck, t: "Explainable priority 0–100", d: "40 safety · 30 urgency · 20 duplicates · 10 impact, with reasons." },
    { icon: MapPin, t: "Hotspot maps", d: "Clusters of complaints surface where the city needs attention." },
  ];

  return (
    <main>
      <section className="text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 md:grid-cols-[1.3fr_1fr] md:items-center">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-sky">PromptWars × ASTRA</p>
            <h1 className="font-display text-4xl font-extrabold leading-tight md:text-6xl">From complaints to action.</h1>
            <p className="mt-5 max-w-xl text-lg text-primary-foreground/80">
              Citizens report potholes, flooding, garbage and broken lights in under a minute. Authorities get a ranked,
              de-duplicated and explained queue of what to fix first.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-sky text-primary hover:bg-sky/90">
                <Link to="/report">Report an issue</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/admin">Open authority dashboard</Link>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Complaints", stats.total],
              ["Open", stats.open],
              ["Resolved", stats.resolved],
              ["Hotspots", stats.hotspots],
            ].map(([l, v]) => (
              <div key={l} className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 p-5">
                <div className="font-display text-4xl font-bold">{v}</div>
                <div className="text-sm text-primary-foreground/70">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="font-display text-2xl font-bold">What the AI does</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.t} className="rounded-xl border bg-card p-5">
              <f.icon className="h-6 w-6 text-chart-1" />
              <h3 className="mt-3 font-semibold">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild variant="secondary"><Link to="/track">Track a complaint</Link></Button>
        </div>
      </section>
    </main>
  );
}
