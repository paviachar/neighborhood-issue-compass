import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link2, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { LEVEL_COLOR, Map, PriorityBadge, StatusBadge } from "@/components/civic/shared";
import { assignDepartment, resetDemo, setStatus, updateComplaint, useComplaints } from "@/lib/civic/store";
import { analyzeAll, detectHotspots, ruleBrief, type Analysis } from "@/lib/civic/engine";
import { aiActionBrief } from "@/lib/civic/ai.functions";
import { CITY_CENTER } from "@/lib/civic/seed";
import { CATEGORIES, DEPARTMENTS, STATUSES, type Complaint, type Department, type Status } from "@/lib/civic/types";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Authority dashboard – CivicSense AI" },
      { name: "description", content: "Prioritised, de-duplicated civic complaints with AI summaries, hotspots and action briefs." },
      { property: "og:title", content: "Authority dashboard – CivicSense AI" },
      { property: "og:description", content: "Explainable priority scoring and AI action briefs for city authorities." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

const CHART = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--sky)", "var(--muted-foreground)"];

function Admin() {
  const all = useComplaints();
  const analysis = useMemo(() => analyzeAll(all), [all]);
  const hotspots = useMemo(() => detectHotspots(all.filter((c) => c.status !== "RESOLVED")), [all]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [st, setSt] = useState("all");
  const [lvl, setLvl] = useState("all");
  const [sel, setSel] = useState<string | null>(null);

  const rows = useMemo(() => {
    const t = q.toLowerCase();
    return all
      .filter((c) => (cat === "all" || c.category === cat) && (st === "all" || c.status === st) && (lvl === "all" || analysis[c.id]?.priority.level === lvl))
      .filter((c) => !t || `${c.id} ${c.title} ${c.description} ${c.area}`.toLowerCase().includes(t))
      .sort((a, b) => analysis[b.id].priority.total - analysis[a.id].priority.total);
  }, [all, analysis, q, cat, st, lvl]);

  const open = all.filter((c) => c.status !== "RESOLVED");
  const critical = open.filter((c) => analysis[c.id].priority.level === "Critical").length;
  const dupCount = all.filter((c) => analysis[c.id].duplicates.length > 0 && !c.linkedTo).length;
  const selected = sel ? all.find((c) => c.id === sel) : undefined;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Authority dashboard</h1>
          <p className="text-muted-foreground">Ranked by explainable AI priority score.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { resetDemo(); toast.success("Demo data reset"); }}><RotateCcw className="h-4 w-4" /> Reset demo data</Button>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[["Total", all.length], ["Open", open.length], ["Critical open", critical], ["Possible duplicates", dupCount], ["Hotspots", hotspots.length]].map(([l, v]) => (
          <div key={l} className="rounded-xl border bg-card p-4"><div className="font-display text-3xl font-bold text-primary">{v}</div><div className="text-xs text-muted-foreground">{l}</div></div>
        ))}
      </div>

      <Tabs defaultValue="queue" className="mt-8">
        <TabsList>
          <TabsTrigger value="queue">Complaints</TabsTrigger>
          <TabsTrigger value="map">Map & hotspots</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="brief">AI city brief</TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <div className="mt-4 flex flex-wrap gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID, text, area…" className="max-w-xs" />
            <Filter value={cat} onChange={setCat} all="All categories" options={CATEGORIES} />
            <Filter value={st} onChange={setSt} all="All statuses" options={STATUSES} />
            <Filter value={lvl} onChange={setLvl} all="All priorities" options={["Critical", "High", "Medium", "Low"]} />
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr><th className="p-3">Priority</th><th className="p-3">Complaint</th><th className="p-3">Category</th><th className="p-3">Status</th><th className="p-3">Department</th><th className="p-3">Dupes</th></tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const a = analysis[c.id];
                  return (
                    <tr key={c.id} onClick={() => setSel(c.id)} className="cursor-pointer border-t hover:bg-secondary/50">
                      <td className="p-3"><PriorityBadge p={a.priority} /></td>
                      <td className="max-w-md p-3"><div className="font-medium">{c.title}</div><div className="line-clamp-1 text-xs text-muted-foreground">{c.summary}</div><div className="font-mono text-[10px] text-muted-foreground">{c.id} · {c.area}</div></td>
                      <td className="p-3">{c.category}</td>
                      <td className="p-3"><StatusBadge s={c.status} /></td>
                      <td className="p-3 text-xs">{c.department ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="p-3">{c.linkedTo ? <span className="text-xs text-muted-foreground">linked</span> : a.duplicates.length || ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length === 0 && <p className="p-6 text-center text-muted-foreground">No complaints match these filters.</p>}
          </div>
        </TabsContent>

        <TabsContent value="map">
          <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
            <Map
              center={CITY_CENTER}
              zoom={12}
              className="h-[560px] w-full rounded-xl border"
              markers={all.map((c) => ({ id: c.id, lat: c.lat, lng: c.lng, color: c.status === "RESOLVED" ? "#16a34a" : LEVEL_COLOR[analysis[c.id].priority.level], label: `${c.title} · ${analysis[c.id].priority.total}` }))}
              circles={hotspots.map((h) => ({ lat: h.lat, lng: h.lng, radius: 550, label: `Hotspot: ${h.count} complaints (${h.topCategory})` }))}
              onMarkerClick={setSel}
            />
            <div className="space-y-2">
              <h3 className="font-semibold">Detected hotspots (open issues, 500 m)</h3>
              {hotspots.map((h, i) => (
                <div key={i} className="rounded-lg border bg-card p-3 text-sm">
                  <div className="font-semibold">{h.area}</div>
                  <div className="text-muted-foreground">{h.count} open complaints · mostly {h.topCategory}</div>
                </div>
              ))}
              {!hotspots.length && <p className="text-sm text-muted-foreground">No hotspots right now.</p>}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics"><Analytics all={all} analysis={analysis} /></TabsContent>
        <TabsContent value="brief"><CityBrief all={all} analysis={analysis} hotspots={hotspots} /></TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && <Detail c={selected} a={analysis[selected.id]} all={all} onOpen={setSel} />}
        </SheetContent>
      </Sheet>
    </main>
  );
}

function Filter({ value, onChange, all, options }: { value: string; onChange: (v: string) => void; all: string; options: readonly string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{all}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function Detail({ c, a, all, onOpen }: { c: Complaint; a: Analysis; all: Complaint[]; onOpen: (id: string) => void }) {
  const brief = useServerFn(aiActionBrief);
  const [text, setText] = useState<{ v: string; src: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const p = a.priority;
  const gen = async () => {
    setBusy(true);
    const ctx = `Complaint ${c.id}: ${c.title}\nCategory: ${c.category}\nArea: ${c.area}\nDescription: ${c.description}\nStatus: ${c.status}\nDepartment: ${c.department ?? "unassigned"}\nPriority ${p.total}/100 (${p.level}). ${p.reasons.join(" ")}\nDuplicates nearby: ${a.duplicates.length}`;
    try {
      const r = await brief({ data: { context: ctx, scope: "complaint" } });
      setText(r.ok ? { v: r.text, src: "AI" } : { v: ruleBrief(c, a), src: "Rule-based fallback" });
    } catch {
      setText({ v: ruleBrief(c, a), src: "Rule-based fallback" });
    }
    setBusy(false);
  };
  const bars: [string, number, number][] = [["Safety", p.safety, 40], ["Urgency", p.urgency, 30], ["Duplicates", p.duplicates, 20], ["Impact", p.impact, 10]];

  return (
    <div className="space-y-6 pb-10">
      <SheetHeader className="p-0">
        <div className="flex items-center gap-2"><span className="font-mono text-xs text-muted-foreground">{c.id}</span><StatusBadge s={c.status} /></div>
        <SheetTitle>{c.title}</SheetTitle>
        <p className="text-sm text-muted-foreground">{c.category} · {c.area} · {new Date(c.createdAt).toLocaleDateString()} · by {c.reporter ?? "citizen"}</p>
      </SheetHeader>
      {c.photo && <img src={c.photo} alt="Complaint" className="max-h-56 rounded-md" />}
      <div className="rounded-lg bg-secondary p-3 text-sm"><div className="mb-1 flex items-center gap-1 text-xs font-semibold"><Sparkles className="h-3 w-3" /> {c.aiSource === "ai" ? "AI summary" : "Auto summary"}</div>{c.summary}</div>
      <p className="text-sm">{c.description}</p>

      <section>
        <div className="flex items-center justify-between"><h3 className="font-semibold">Priority score</h3><PriorityBadge p={p} /></div>
        <div className="mt-3 space-y-2">
          {bars.map(([l, v, m]) => (
            <div key={l}><div className="flex justify-between text-xs"><span>{l}</span><span>{v}/{m}</span></div><Progress value={(v / m) * 100} /></div>
          ))}
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground">{p.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div>
          <h3 className="mb-1 text-sm font-semibold">Department</h3>
          <Select value={c.department ?? ""} onValueChange={(v) => { assignDepartment(c.id, v as Department); toast.success(`Assigned to ${v}`); }}>
            <SelectTrigger><SelectValue placeholder="Assign…" /></SelectTrigger>
            <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <h3 className="mb-1 text-sm font-semibold">Status</h3>
          <Select value={c.status} onValueChange={(v) => { setStatus(c.id, v as Status); toast.success(`Status: ${v}`); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </section>

      <section>
        <h3 className="font-semibold">Possible duplicates ({a.duplicates.length})</h3>
        {c.linkedTo && <p className="mt-1 text-sm">Linked as duplicate of <button className="font-mono underline" onClick={() => onOpen(c.linkedTo!)}>{c.linkedTo}</button> · <button className="text-destructive underline" onClick={() => updateComplaint(c.id, { linkedTo: undefined })}>unlink</button></p>}
        <div className="mt-2 space-y-2">
          {a.duplicates.map((d) => {
            const o = all.find((x) => x.id === d.id)!;
            return (
              <div key={d.id} className="flex items-start justify-between gap-2 rounded-md border p-2 text-sm">
                <button className="text-left" onClick={() => onOpen(o.id)}>
                  <div className="font-medium">{o.title}</div>
                  <div className="text-xs text-muted-foreground">{o.id} · {Math.round(d.distance)} m away · text match {Math.round(d.similarity * 100)}%</div>
                </button>
                {o.linkedTo === c.id ? (
                  <span className="text-xs text-success">linked</span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => { updateComplaint(o.id, { linkedTo: c.id }); toast.success(`${o.id} linked to ${c.id}`); }}><Link2 className="h-3 w-3" /> Link</Button>
                )}
              </div>
            );
          })}
          {!a.duplicates.length && <p className="text-sm text-muted-foreground">None detected.</p>}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between"><h3 className="font-semibold">AI action brief</h3>
          <Button size="sm" onClick={gen} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate</Button>
        </div>
        {text && <div className="mt-2 whitespace-pre-wrap rounded-lg border bg-card p-3 text-sm"><div className="mb-1 text-[10px] uppercase text-muted-foreground">{text.src}</div>{text.v}</div>}
      </section>

      <section>
        <h3 className="font-semibold">History</h3>
        <ul className="mt-2 space-y-2 border-l-2 border-accent pl-4 text-sm">
          {[...c.history].reverse().map((h, i) => <li key={i}><b>{h.status}</b> <span className="text-xs text-muted-foreground">{new Date(h.at).toLocaleString()}</span><div>{h.note}</div></li>)}
        </ul>
      </section>
    </div>
  );
}

function Analytics({ all, analysis }: { all: Complaint[]; analysis: Record<string, Analysis> }) {
  const byCat = CATEGORIES.map((k) => ({ name: k, open: all.filter((c) => c.category === k && c.status !== "RESOLVED").length, resolved: all.filter((c) => c.category === k && c.status === "RESOLVED").length }));
  const byStatus = STATUSES.map((s) => ({ name: s, value: all.filter((c) => c.status === s).length }));
  const byLevel = (["Critical", "High", "Medium", "Low"] as const).map((l) => ({ name: l, value: all.filter((c) => analysis[c.id].priority.level === l).length }));
  const days: Record<string, number> = {};
  all.forEach((c) => { const d = c.createdAt.slice(5, 10); days[d] = (days[d] ?? 0) + 1; });
  const trend = Object.entries(days).sort().map(([d, n]) => ({ d, n }));
  const byDept = DEPARTMENTS.map((d) => ({ name: d.split(" ")[0], value: all.filter((c) => c.department === d && c.status !== "RESOLVED").length }));
  const card = "rounded-xl border bg-card p-4";
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <div className={card}><h3 className="mb-2 font-semibold">Complaints by category</h3>
        <ResponsiveContainer height={260}><BarChart data={byCat}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={10} interval={0} angle={-20} textAnchor="end" height={50} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="open" stackId="a" fill="var(--chart-1)" /><Bar dataKey="resolved" stackId="a" fill="var(--chart-3)" /></BarChart></ResponsiveContainer>
      </div>
      <div className={card}><h3 className="mb-2 font-semibold">Status lifecycle</h3>
        <ResponsiveContainer height={260}><PieChart><Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} label>{byStatus.map((_, i) => <Cell key={i} fill={CHART[i]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
      </div>
      <div className={card}><h3 className="mb-2 font-semibold">Daily submissions</h3>
        <ResponsiveContainer height={240}><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="d" fontSize={10} /><YAxis allowDecimals={false} /><Tooltip /><Line dataKey="n" stroke="var(--chart-1)" strokeWidth={2} /></LineChart></ResponsiveContainer>
      </div>
      <div className={card}><h3 className="mb-2 font-semibold">Priority mix & open workload by department</h3>
        <ResponsiveContainer height={110}><BarChart data={byLevel} layout="vertical"><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={70} fontSize={11} /><Tooltip /><Bar dataKey="value">{byLevel.map((l) => <Cell key={l.name} fill={LEVEL_COLOR[l.name]} />)}</Bar></BarChart></ResponsiveContainer>
        <ResponsiveContainer height={130}><BarChart data={byDept}><XAxis dataKey="name" fontSize={10} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="var(--chart-2)" /></BarChart></ResponsiveContainer>
      </div>
    </div>
  );
}

function CityBrief({ all, analysis, hotspots }: { all: Complaint[]; analysis: Record<string, Analysis>; hotspots: ReturnType<typeof detectHotspots> }) {
  const brief = useServerFn(aiActionBrief);
  const [text, setText] = useState<{ v: string; src: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const top = all.filter((c) => c.status !== "RESOLVED").sort((a, b) => analysis[b.id].priority.total - analysis[a.id].priority.total).slice(0, 8);
  const fallback = () =>
    [
      `- ${all.filter((c) => c.status !== "RESOLVED").length} open complaints; ${top.filter((c) => analysis[c.id].priority.level === "Critical").length} critical in the top 8.`,
      ...top.slice(0, 3).map((c) => `- Fix first: ${c.title} at ${c.area} (score ${analysis[c.id].priority.total}) → ${c.department ?? "assign department"}.`),
      ...hotspots.slice(0, 2).map((h) => `- Hotspot ${h.area}: ${h.count} open issues, mostly ${h.topCategory}; send a combined crew.`),
      `- Link pending duplicates to avoid double dispatch.`,
    ].join("\n");
  const gen = async () => {
    setBusy(true);
    const ctx = `Top open complaints:\n${top.map((c) => `${c.id} | ${c.category} | ${c.area} | score ${analysis[c.id].priority.total} | ${c.status} | ${c.department ?? "unassigned"} | ${c.summary}`).join("\n")}\nHotspots:\n${hotspots.map((h) => `${h.area}: ${h.count} open, mostly ${h.topCategory}`).join("\n")}`;
    try {
      const r = await brief({ data: { context: ctx, scope: "city" } });
      setText(r.ok ? { v: r.text, src: "AI" } : { v: fallback(), src: "Rule-based fallback" });
    } catch {
      setText({ v: fallback(), src: "Rule-based fallback" });
    }
    setBusy(false);
  };
  return (
    <div className="mt-4 rounded-xl border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h3 className="font-display text-xl font-bold">Today's operations brief</h3><p className="text-sm text-muted-foreground">Generated from the 8 highest-priority open complaints and current hotspots.</p></div>
        <Button onClick={gen} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate brief</Button>
      </div>
      {text && <div className="mt-4 whitespace-pre-wrap rounded-lg bg-secondary p-4 text-sm"><div className="mb-2 text-[10px] uppercase text-muted-foreground">{text.src}</div>{text.v}</div>}
    </div>
  );
}
