import { CATEGORY_DEPARTMENT, STATUSES, type Category, type Complaint, type HistoryEntry, type Status } from "./types";
import { summarize } from "./engine";

export const CITY_CENTER: [number, number] = [12.9716, 77.5946];
export const SEED_NOW = new Date("2026-10-30T06:00:00Z").getTime();

const AREAS: { name: string; lat: number; lng: number }[] = [
  { name: "MG Road", lat: 12.9757, lng: 77.6055 },
  { name: "Koramangala 5th Block", lat: 12.9352, lng: 77.6245 },
  { name: "Indiranagar 100ft Rd", lat: 12.9719, lng: 77.6412 },
  { name: "Jayanagar 4th Block", lat: 12.925, lng: 77.5838 },
  { name: "Whitefield Main Rd", lat: 12.9698, lng: 77.7499 },
  { name: "Majestic Bus Stand", lat: 12.9767, lng: 77.5713 },
  { name: "HSR Layout Sector 2", lat: 12.9116, lng: 77.6474 },
  { name: "Malleshwaram 8th Cross", lat: 13.0031, lng: 77.5643 },
  { name: "Silk Board Junction", lat: 12.9177, lng: 77.6233 },
];

type T = [Category, string, string];
const TEMPLATES: T[] = [
  ["Road Damage", "Large pothole on main road", "A deep pothole has formed on the main road near the bus stop. Two-wheelers swerve to avoid it and a bike accident happened yesterday."],
  ["Road Damage", "Broken footpath slabs", "Footpath slabs are broken and lifted, elderly residents trip here every day. Needs repair."],
  ["Road Damage", "Road surface cracked after digging", "Road was dug for cable work weeks ago and never re-laid. Heavy traffic at the junction gets stuck."],
  ["Road Damage", "Unmarked speed breaker", "New speed breaker without paint markings, vehicles hit it hard at night."],
  ["Waterlogging", "Knee-deep water after rain", "After every rain the street gets knee-deep standing water. School children cannot walk to school."],
  ["Waterlogging", "Underpass flooded", "The underpass floods within minutes of rain, cars get stalled and traffic jams the whole junction."],
  ["Waterlogging", "Stagnant water breeding mosquitoes", "Water stagnant on the empty plot for days, mosquito breeding, residents worried about dengue."],
  ["Waste Management", "Garbage dump overflowing", "Garbage dump near the market is overflowing, terrible stink and stray dogs spreading waste on the road."],
  ["Waste Management", "Garbage not collected", "Garbage has not been collected for 5 days in our colony. Bins are full."],
  ["Waste Management", "Construction debris dumped", "Construction debris dumped on the roadside, blocking half the lane."],
  ["Waste Management", "Burning of trash", "People burning trash every evening near the park, smoke enters homes."],
  ["Streetlight", "Streetlight not working", "Streetlight not working for two weeks, the lane is completely dark at night and women feel unsafe."],
  ["Streetlight", "Flickering lamps on main road", "Several pole lights flicker on the main road near the metro station."],
  ["Streetlight", "Lights on during daytime", "Street lights remain on during the day, wasting electricity."],
  ["Drainage", "Open manhole on road", "Open manhole without cover in the middle of the road, extremely dangerous at night. A child almost fell."],
  ["Drainage", "Sewage overflowing", "Sewage overflowing from the drain onto the road since 3 days, foul smell for residents."],
  ["Drainage", "Clogged storm drain", "Storm drain clogged with plastic and silt, water will overflow in next rain."],
  ["Public Safety", "Exposed live wire", "Exposed live wire hanging from electric pole near school gate. Urgent, children pass here."],
  ["Public Safety", "Fallen tree blocking road", "Big tree fell after storm and is blocking the road, traffic diverted."],
  ["Public Safety", "Stray dog menace", "Pack of stray dogs chasing two-wheelers and children near the bus stop."],
  ["Public Safety", "Chain snatching incidents", "Multiple chain snatching incidents in the dark lane, need police patrol."],
  ["Other", "Broken park bench", "Benches in the public park are broken."],
  ["Other", "Illegal hoardings", "Illegal hoardings covering traffic signs at the junction."],
];

// Rephrased reports of the same problem → deliberate duplicate pairs.
const DUP_TEXT: Record<Category, string> = {
  "Road Damage": "Huge pothole on the main road by the bus stop, my bike nearly skidded. Please fix the pothole.",
  Waterlogging: "Standing water knee-deep on our street after rain again, kids cannot go to school.",
  "Waste Management": "Overflowing garbage dump next to market, stink unbearable and dogs spread garbage.",
  Streetlight: "Our lane streetlight is not working, completely dark at night, unsafe for women.",
  Drainage: "Manhole open in the middle of road without cover, someone will fall at night.",
  "Public Safety": "Live wire exposed from pole near the school gate, very dangerous for children.",
  Other: "Park benches broken.",
};

function prng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function history(status: Status, created: number, rnd: () => number, dept: string): HistoryEntry[] {
  const idx = STATUSES.indexOf(status);
  const notes = ["Complaint registered by citizen.", `Assigned to ${dept}.`, "Field team dispatched, work started.", "Issue resolved and verified on site."];
  const h: HistoryEntry[] = [];
  let t = created;
  for (let i = 0; i <= idx; i++) {
    h.push({ status: STATUSES[i]!, at: new Date(t).toISOString(), note: notes[i]! });
    t += (6 + rnd() * 40) * 3600000;
  }
  return h;
}

export function buildSeed(): Complaint[] {
  const rnd = prng(42);
  const out: Complaint[] = [];
  const statusPool: Status[] = ["SUBMITTED", "SUBMITTED", "ASSIGNED", "ASSIGNED", "IN PROGRESS", "RESOLVED", "SUBMITTED", "IN PROGRESS"];
  for (let i = 0; i < 44; i++) {
    const [category, title, description] = TEMPLATES[i % TEMPLATES.length]!;
    // Clusters: weight first four areas more heavily
    const area = AREAS[i % 3 === 0 ? i % 4 : (i * 7) % AREAS.length];
    const lat = area.lat + (rnd() - 0.5) * 0.008;
    const lng = area.lng + (rnd() - 0.5) * 0.008;
    const created = SEED_NOW - Math.floor(rnd() * 21 * 86400000);
    const status = statusPool[i % statusPool.length]!;
    const dept = CATEGORY_DEPARTMENT[category];
    out.push({
      id: `CS-${(1000 + i * 37).toString(36).toUpperCase().padStart(6, "0")}`,
      title,
      description,
      category,
      lat,
      lng,
      area: area.name,
      createdAt: new Date(created).toISOString(),
      status,
      department: status === "SUBMITTED" ? undefined : dept,
      history: history(status, created, rnd, dept),
      summary: summarize(description, category, area.name),
      aiSource: "rules",
      reporter: `Citizen ${i + 1}`,
    });
  }
  // 8 deliberate duplicates placed within ~50 m of originals
  const dupOf = [0, 4, 7, 11, 14, 17, 1, 23];
  dupOf.forEach((srcIdx, k) => {
    const src = out[srcIdx]!;
    const created = new Date(src.createdAt).getTime() + (1 + k) * 7200000;
    out.push({
      ...src,
      id: `CS-D${(k + 10).toString(36).toUpperCase()}${k}X${k * 3}`,
      title: src.title + " (again)",
      description: DUP_TEXT[src.category],
      lat: src.lat + (rnd() - 0.5) * 0.0008,
      lng: src.lng + (rnd() - 0.5) * 0.0008,
      createdAt: new Date(created).toISOString(),
      status: "SUBMITTED",
      department: undefined,
      history: history("SUBMITTED", created, rnd, ""),
      summary: summarize(DUP_TEXT[src.category], src.category, src.area),
      reporter: `Citizen ${50 + k}`,
    });
  });
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
