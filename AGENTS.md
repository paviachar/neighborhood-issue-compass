<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- CivicSense data lives in browser localStorage via `src/lib/civic/store.ts` (seeded from `seed.ts`); no backend yet — keeps the hackathon prototype zero-setup.
- Rule-based intelligence (`src/lib/civic/engine.ts`) is the source of truth for priority/duplicates/hotspots and the fallback for AI; AI calls (`ai.functions.ts`) only add summaries/categories/briefs.
