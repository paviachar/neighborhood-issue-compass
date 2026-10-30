import { describe, expect, it } from "vitest";
import { analyzeAll, scorePriority } from "@/lib/civic/engine";
import { buildSeed } from "@/lib/civic/seed";

describe("CivicSense engine", () => {
  const seed = buildSeed();
  it("seeds at least 50 complaints", () => {
    expect(seed.length).toBeGreaterThanOrEqual(50);
  });
  it("caps priority components at 40/30/20/10 and total at 100", () => {
    const c = { ...seed[0]!, description: "urgent accident child school hospital live wire fell elderly bike fire main road market traffic residents junction flood blocked rain weeks days night" };
    const p = scorePriority(c, 10);
    expect(p.safety).toBe(40);
    expect(p.urgency).toBeLessThanOrEqual(30);
    expect(p.duplicates).toBe(20);
    expect(p.impact).toBe(10);
    expect(p.total).toBeLessThanOrEqual(100);
  });
  it("detects the deliberate seeded duplicates", () => {
    const a = analyzeAll(seed);
    const dupes = seed.filter((c) => c.id.startsWith("CS-D"));
    expect(dupes.every((d) => a[d.id]!.duplicates.length > 0)).toBe(true);
  });
});
