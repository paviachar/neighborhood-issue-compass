import { useSyncExternalStore } from "react";
import { buildSeed } from "./seed";
import type { Complaint, Department, Status } from "./types";

const KEY = "civicsense.complaints.v1";
let SEED: Complaint[] | null = null;
const seed = () => (SEED ??= buildSeed());
let state: Complaint[] | null = null;
const listeners = new Set<() => void>();

function load(): Complaint[] {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? (JSON.parse(raw) as Complaint[]) : seed();
  } catch {
    state = seed();
  }
  return state;
}
function save(next: Complaint[]) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota — keep in memory */
  }
  listeners.forEach((l) => l());
}

export function useComplaints() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    load,
    seed,
  );
}

export function addComplaint(c: Complaint) {
  save([c, ...load()]);
}
export function getComplaint(id: string) {
  return load().find((c) => c.id.toUpperCase() === id.trim().toUpperCase());
}
export function updateComplaint(id: string, patch: Partial<Complaint>) {
  save(load().map((c) => (c.id === id ? { ...c, ...patch } : c)));
}
export function setStatus(id: string, status: Status, note?: string) {
  const c = load().find((x) => x.id === id);
  if (!c || c.status === status) return;
  updateComplaint(id, {
    status,
    history: [...c.history, { status, at: new Date().toISOString(), note: note || `Status changed to ${status}.` }],
  });
}
export function assignDepartment(id: string, department: Department) {
  const c = load().find((x) => x.id === id);
  if (!c) return;
  const patch: Partial<Complaint> = { department };
  if (c.status === "SUBMITTED") {
    patch.status = "ASSIGNED";
    patch.history = [...c.history, { status: "ASSIGNED", at: new Date().toISOString(), note: `Assigned to ${department}.` }];
  }
  updateComplaint(id, patch);
}
export function resetDemo() {
  save(buildSeed());
}
