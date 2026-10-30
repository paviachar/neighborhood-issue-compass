import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CATEGORIES } from "./types";

async function callAI(instructions: string, prompt: string): Promise<string> {
  const { createOpenAI } = await import("@ai-sdk/openai");
  const { streamText } = await import("ai");
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI not configured");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions,
    prompt,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const text = (await result.text).trim();
  if (!text) throw new Error("Empty AI response");
  return text;
}

export const aiAnalyzeComplaint = createServerFn({ method: "POST" })
  .validator((i: unknown) => z.object({ title: z.string().max(200), description: z.string().min(5).max(3000) }).parse(i))
  .handler(async ({ data }) => {
    try {
      const text = await callAI(
        `You classify civic complaints. Categories: ${CATEGORIES.join(", ")}. Reply exactly in two lines:\nCategory: <one category>\nSummary: <one sentence, max 25 words>`,
        `Title: ${data.title}\nDescription: ${data.description}`,
      );
      const cat = text.match(/Category:\s*(.+)/i)?.[1]?.trim();
      const summary = text.match(/Summary:\s*(.+)/i)?.[1]?.trim();
      const category = CATEGORIES.find((c) => c.toLowerCase() === cat?.toLowerCase());
      if (!category || !summary) return { ok: false as const };
      return { ok: true as const, category, summary };
    } catch (e) {
      console.error("aiAnalyzeComplaint", e);
      return { ok: false as const };
    }
  });

export const aiActionBrief = createServerFn({ method: "POST" })
  .validator((i: unknown) => z.object({ context: z.string().min(5).max(8000), scope: z.enum(["complaint", "city"]) }).parse(i))
  .handler(async ({ data }) => {
    try {
      const text = await callAI(
        data.scope === "complaint"
          ? "You write concise action briefs for municipal officers. Output 4 short lines: Issue, Risk, Recommended action, Owner & next step. Plain text, no markdown symbols."
          : "You write a concise city operations brief for municipal leadership. Output 5-7 short bullet lines starting with '- ': top risks, hotspots, department workload, and specific actions for today. Plain text.",
        data.context,
      );
      return { ok: true as const, text };
    } catch (e) {
      console.error("aiActionBrief", e);
      return { ok: false as const, text: "" };
    }
  });
