import { lazy, Suspense, type ComponentProps } from "react";
import { ClientOnly, Link } from "@tanstack/react-router";
import { Landmark } from "lucide-react";
import type { PriorityBreakdown, Status } from "@/lib/civic/types";
import { cn } from "@/lib/utils";

const LazyMap = lazy(() => import("./CivicMap"));
export type MapProps = ComponentProps<typeof LazyMap>;

export function Map(props: MapProps) {
  const fallback = <div className={cn(props.className ?? "h-80 w-full rounded-lg", "animate-pulse bg-muted")} />;
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <LazyMap {...props} />
      </Suspense>
    </ClientOnly>
  );
}

export const LEVEL_COLOR: Record<PriorityBreakdown["level"], string> = {
  Critical: "#dc2626",
  High: "#ea580c",
  Medium: "#2563eb",
  Low: "#64748b",
};

export function PriorityBadge({ p }: { p: PriorityBreakdown }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-primary-foreground"
      style={{ backgroundColor: LEVEL_COLOR[p.level] }}
    >
      {p.total} · {p.level}
    </span>
  );
}

const STATUS_CLS: Record<Status, string> = {
  SUBMITTED: "bg-secondary text-secondary-foreground",
  ASSIGNED: "bg-accent text-accent-foreground",
  "IN PROGRESS": "bg-warning text-warning-foreground",
  RESOLVED: "bg-success text-success-foreground",
};
export function StatusBadge({ s }: { s: Status }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_CLS[s])}>{s}</span>;
}

export function SiteHeader() {
  const link = "rounded-md px-3 py-2 text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground";
  const active = { className: "rounded-md px-3 py-2 text-sm font-semibold text-primary-foreground bg-primary-foreground/10" };
  return (
    <header className="sticky top-0 z-[1000] bg-primary">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold text-primary-foreground">
          <Landmark className="h-5 w-5 text-sky" /> CivicSense AI
        </Link>
        <nav className="flex flex-wrap gap-1">
          <Link to="/report" className={link} activeProps={active}>Report issue</Link>
          <Link to="/track" className={link} activeProps={active}>Track</Link>
          <Link to="/admin" className={link} activeProps={active}>Authority dashboard</Link>
        </nav>
      </div>
    </header>
  );
}
