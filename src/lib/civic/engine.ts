// Rule-based intelligence: categorization, summaries, duplicates, priority, hotspots.
// Used directly and as the fallback whenever the AI service is unavailable.
import type { Category, Complaint, PriorityBreakdown } from "./types";

const CAT_KEYWORDS: Record<Exclude<Category, "Other">, string[]> = {
  "Road Damage": ["pothole", "road", "crack", "asphalt", "speed breaker", "footpath", "pavement", "tar", "broken road"],
  Waterlogging: ["waterlog", "flood", "standing water", "water stagnant", "knee-deep", "inundat", "rain water", "puddle"],
  "Waste Management": ["garbage", "waste", "trash", "dump", "litter", "bin", "rubbish", "stink", "debris"],
  Streetlight: ["streetlight", "street light", "lamp", "light not working", "dark", "bulb", "pole light"],
  Drainage: ["drain", "sewage", "manhole", "gutter", "overflow", "sewer", "clogged"],
  "Public Safety": ["unsafe", "harass", "theft", "accident", "live wire", "exposed wire", "fallen tree", "stray dog", "crime", "fire"],
};

export function categorize(text: string): Category {
  const t = text.toLowerCase();
  let best: Category = "Other";
  let bestScore = 0;
  for (const [cat, words] of Object.entries(CAT_KEYWORDS)) {
    const s = words.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
    if (s > bestScore) {
      bestScore = s;
      best = cat as Category;
    }
  }
  return best;
}

export function summarize(text: string, category: Category, area?: string): string {
  const first = text.split(/(?<=[.!?])\s+/)[0]?.trim() ?? text;
  const short = first.length > 110 ? first.slice(0, 107).trimEnd() + "…" : first;
  return `${category}${area ? ` near ${area}` : ""}: ${short}`;
}

const STOP = new Set("the a an and or of to in on at is are was were for near our my this that it be has have with from by very not no".split(" "));
function tokens(s: string) {
  return new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));
}
function jaccard(a: Set<string>, b: Set<string>) {
  let i = 0;
  a.forEach((x) => b.has(x) && i++);
  return i / (a.size + b.size - i || 1);
}
export function distanceM(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface DuplicateMatch {
  id: string;
  similarity: number;
  distance: number;
  score: number;
}

/** Duplicate = same category AND within 400 m AND (text similarity ≥ 0.2 OR within 60 m). */
export function findDuplicates(c: { id?: string; description: string; title?: string; category: Category; lat: number; lng: number; status?: string }, all: Complaint[]): DuplicateMatch[] {
  const tc = tokens(`${c.title ?? ""} ${c.description}`);
  const out: DuplicateMatch[] = [];
  for (const o of all) {
    if (o.id === c.id || o.category !== c.category) continue;
    const d = distanceM(c.lat, c.lng, o.lat, o.lng);
    if (d > 400) continue;
    const sim = jaccard(tc, tokens(`${o.title} ${o.description}`));
    if (sim >= 0.2 || d < 60) {
      out.push({ id: o.id, similarity: sim, distance: d, score: sim * 0.6 + (1 - d / 400) * 0.4 });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

const SAFETY_BASE: Record<Category, number> = {
  "Public Safety": 28,
  "Road Damage": 18,
  Drainage: 14,
  Streetlight: 16,
  Waterlogging: 14,
  "Waste Management": 8,
  Other: 6,
};
const SAFETY_WORDS = ["accident", "injur", "child", "school", "hospital", "live wire", "exposed wire", "electrocut", "fell", "elderly", "women", "open manhole", "fire", "collapse", "bike"];
const URGENCY_WORDS = ["urgent", "immediately", "overflow", "blocked", "flood", "dangerous", "since", "weeks", "days", "night", "every day", "worsen", "rain"];
const IMPACT_WORDS = ["main road", "market", "school", "hospital", "residents", "traffic", "bus stop", "junction", "colony", "hundreds", "many", "metro", "highway"];

function hits(t: string, words: string[]) {
  return words.filter((w) => t.includes(w));
}

export function scorePriority(c: Complaint, dupCount: number, now = Date.now()): PriorityBreakdown {
  const t = `${c.title} ${c.description}`.toLowerCase();
  const reasons: string[] = [];
  const sh = hits(t, SAFETY_WORDS);
  const safety = Math.min(40, SAFETY_BASE[c.category] + sh.length * 5);
  reasons.push(`Safety ${safety}/40: ${c.category} base risk ${SAFETY_BASE[c.category]}${sh.length ? `, hazard terms (${sh.slice(0, 3).join(", ")})` : ""}.`);

  const uh = hits(t, URGENCY_WORDS);
  const ageDays = Math.max(0, (now - new Date(c.createdAt).getTime()) / 86400000);
  const ageScore = c.status === "RESOLVED" ? 0 : Math.min(10, Math.floor(ageDays / 2));
  const urgency = Math.min(30, 8 + uh.length * 5 + ageScore);
  reasons.push(`Urgency ${urgency}/30: ${uh.length ? `urgency cues (${uh.slice(0, 3).join(", ")})` : "no explicit urgency cues"}${ageScore ? `, open ${Math.floor(ageDays)} days` : ""}.`);

  const duplicates = Math.min(20, dupCount * 5);
  reasons.push(`Duplicates ${duplicates}/20: ${dupCount} related report${dupCount === 1 ? "" : "s"} nearby.`);

  const ih = hits(t, IMPACT_WORDS);
  const impact = Math.min(10, 2 + ih.length * 3);
  reasons.push(`Impact ${impact}/10: ${ih.length ? `affects ${ih.slice(0, 3).join(", ")}` : "localised impact"}.`);

  const total = safety + urgency + duplicates + impact;
  const level = total >= 65 ? "Critical" : total >= 50 ? "High" : total >= 35 ? "Medium" : "Low";
  return { safety, urgency, duplicates, impact, total, level, reasons };
}

export interface Analysis {
  duplicates: DuplicateMatch[];
  priority: PriorityBreakdown;
}

export function analyzeAll(all: Complaint[]): Record<string, Analysis> {
  const out: Record<string, Analysis> = {};
  const linkedChildren: Record<string, number> = {};
  all.forEach((c) => c.linkedTo && (linkedChildren[c.linkedTo] = (linkedChildren[c.linkedTo] ?? 0) + 1));
  for (const c of all) {
    const duplicates = findDuplicates(c, all);
    const count = Math.max(duplicates.length, linkedChildren[c.id] ?? 0);
    out[c.id] = { duplicates, priority: scorePriority(c, count) };
  }
  return out;
}

export interface Hotspot {
  lat: number;
  lng: number;
  count: number;
  open: number;
  topCategory: Category;
  area: string;
  ids: string[];
}

/** Greedy radius clustering (500 m) of open+recent complaints; ≥3 = hotspot. */
export function detectHotspots(all: Complaint[], radius = 500): Hotspot[] {
  const used = new Set<string>();
  const spots: Hotspot[] = [];
  for (const c of all) {
    if (used.has(c.id)) continue;
    const members = all.filter((o) => !used.has(o.id) && distanceM(c.lat, c.lng, o.lat, o.lng) <= radius);
    if (members.length < 3) continue;
    members.forEach((m) => used.add(m.id));
    const counts: Record<string, number> = {};
    members.forEach((m) => (counts[m.category] = (counts[m.category] ?? 0) + 1));
    const topCategory = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]![0] as Category;
    spots.push({
      lat: members.reduce((s, m) => s + m.lat, 0) / members.length,
      lng: members.reduce((s, m) => s + m.lng, 0) / members.length,
      count: members.length,
      open: members.filter((m) => m.status !== "RESOLVED").length,
      topCategory,
      area: c.area,
      ids: members.map((m) => m.id),
    });
  }
  return spots.sort((a, b) => b.count - a.count);
}

export function ruleBrief(c: Complaint, a: Analysis): string {
  const p = a.priority;
  const action: Record<Category, string> = {
    "Road Damage": "Dispatch a road repair crew to patch and barricade the damaged stretch.",
    Waterlogging: "Deploy dewatering pumps and clear inlet grates before the next rainfall.",
    "Waste Management": "Schedule an immediate garbage clearance and add a bin/collection slot.",
    Streetlight: "Send an electrical lineman to replace the lamp and check the feeder.",
    Drainage: "Desilt the drain/manhole and secure any open covers.",
    "Public Safety": "Alert the local police station and secure the hazard on site.",
    Other: "Assign a field officer to inspect and route to the right department.",
  };
  return [
    `Issue: ${c.summary}`,
    `Priority: ${p.total}/100 (${p.level}) — ${p.reasons[0]!.split(":")[1]?.trim()}`,
    `Recommended action: ${action[c.category]}`,
    `Owner: ${c.department ?? "Unassigned"}. ${a.duplicates.length ? `Close ${a.duplicates.length} linked duplicate(s) together.` : "No duplicates detected."}`,
  ].join("\n");
}

export function makeTrackingId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `CS-${s}`;
}
