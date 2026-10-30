import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Map } from "@/components/civic/shared";
import { addComplaint, useComplaints } from "@/lib/civic/store";
import { categorize, findDuplicates, makeTrackingId, summarize } from "@/lib/civic/engine";
import { CITY_CENTER } from "@/lib/civic/seed";
import { aiAnalyzeComplaint } from "@/lib/civic/ai.functions";
import { CATEGORIES, type Category } from "@/lib/civic/types";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report a civic issue – CivicSense AI" },
      { name: "description", content: "Report potholes, waterlogging, garbage, streetlights and more with a photo and map pin." },
      { property: "og:title", content: "Report a civic issue – CivicSense AI" },
      { property: "og:description", content: "Submit a complaint and get a tracking ID instantly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Report,
});

async function resizePhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise((r, j) => ((img.onload = r), (img.onerror = j), (img.src = url)));
  const scale = Math.min(1, 800 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  return canvas.toDataURL("image/jpeg", 0.7);
}

function Report() {
  const all = useComplaints();
  const analyze = useServerFn(aiAnalyzeComplaint);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category | "auto">("auto");
  const [area, setArea] = useState("");
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<string>();
  const [pin, setPin] = useState<[number, number] | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; category: Category; summary: string; source: string; dups: number } | null>(null);

  const guess = useMemo(() => categorize(`${title} ${description}`), [title, description]);
  const dupPreview = useMemo(
    () => (pin && description.length > 10 ? findDuplicates({ description, title, category: category === "auto" ? guess : category, lat: pin[0], lng: pin[1] }, all) : []),
    [pin, description, title, category, guess, all],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return toast.error("Tap the map to drop a pin at the problem location.");
    if (description.trim().length < 10) return toast.error("Please describe the problem (at least 10 characters).");
    setBusy(true);
    let finalCat: Category = category === "auto" ? guess : category;
    let summary = summarize(description, finalCat, area || undefined);
    let source: "ai" | "rules" = "rules";
    try {
      const r = await analyze({ data: { title: title || "Untitled", description } });
      if (r.ok) {
        if (category === "auto") finalCat = r.category;
        summary = r.summary;
        source = "ai";
      }
    } catch {
      /* fallback to rules */
    }
    const id = makeTrackingId();
    const now = new Date().toISOString();
    addComplaint({
      id,
      title: title || summary.slice(0, 60),
      description,
      category: finalCat,
      lat: pin[0],
      lng: pin[1],
      area: area || "Pinned location",
      photo,
      createdAt: now,
      status: "SUBMITTED",
      history: [{ status: "SUBMITTED", at: now, note: "Complaint registered by citizen." }],
      summary,
      aiSource: source,
      reporter: name || "Anonymous",
    });
    setDone({ id, category: finalCat, summary, source, dups: dupPreview.length });
    setBusy(false);
  };

  if (done)
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
        <h1 className="mt-4 font-display text-3xl font-bold">Complaint submitted</h1>
        <p className="mt-2 text-muted-foreground">Save your tracking ID:</p>
        <div className="mt-3 inline-block rounded-lg bg-primary px-6 py-3 font-mono text-2xl font-bold tracking-widest text-primary-foreground">{done.id}</div>
        <div className="mt-6 rounded-lg border bg-card p-4 text-left text-sm">
          <p><b>Category:</b> {done.category}</p>
          <p className="mt-1"><b>Summary ({done.source === "ai" ? "AI" : "rule-based"}):</b> {done.summary}</p>
          {done.dups > 0 && <p className="mt-1 text-muted-foreground">{done.dups} similar report(s) nearby — this will raise its priority.</p>}
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild><Link to="/track" search={{ id: done.id }}>Track it</Link></Button>
          <Button variant="outline" onClick={() => { setDone(null); setTitle(""); setDescription(""); setPin(null); setPhoto(undefined); }}>Report another</Button>
        </div>
      </main>
    );

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Report a civic issue</h1>
      <p className="mt-1 text-muted-foreground">Describe the problem, add a photo and pin it on the map.</p>
      <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div><Label htmlFor="t">Short title</Label><Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Deep pothole near bus stop" maxLength={120} /></div>
          <div>
            <Label htmlFor="d">Description</Label>
            <Textarea id="d" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is the problem, since when, who is affected?" maxLength={2000} />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category | "auto")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Let AI decide</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            {category === "auto" && description.length > 8 && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Sparkles className="h-3 w-3" /> Likely: {guess}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="a">Landmark / area</Label><Input id="a" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Jayanagar 4th Block" /></div>
            <div><Label htmlFor="n">Your name (optional)</Label><Input id="n" value={name} onChange={(e) => setName(e.target.value)} /></div>
          </div>
          <div>
            <Label htmlFor="p">Photo</Label>
            <Input id="p" type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPhoto(await resizePhoto(f)); }} />
            {photo && <img src={photo} alt="Uploaded preview" className="mt-2 h-32 rounded-md object-cover" />}
          </div>
        </div>
        <div className="space-y-3">
          <Label>Location — tap the map</Label>
          <Map center={CITY_CENTER} zoom={12} picked={pin} onPick={(a, b) => setPin([a, b])} className="h-96 w-full rounded-lg border" />
          <p className="text-xs text-muted-foreground">{pin ? `Pinned at ${pin[0].toFixed(5)}, ${pin[1].toFixed(5)}` : "No location selected yet."}</p>
          {dupPreview.length > 0 && (
            <div className="rounded-lg border border-warning bg-warning/15 p-3 text-sm">
              {dupPreview.length} similar report(s) already exist nearby. You can still submit — it strengthens the case.
            </div>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Analysing…</> : "Submit complaint"}
          </Button>
        </div>
      </form>
    </main>
  );
}
