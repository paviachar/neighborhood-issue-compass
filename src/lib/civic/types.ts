export const CATEGORIES = [
  "Road Damage",
  "Waterlogging",
  "Waste Management",
  "Streetlight",
  "Drainage",
  "Public Safety",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const STATUSES = ["SUBMITTED", "ASSIGNED", "IN PROGRESS", "RESOLVED"] as const;
export type Status = (typeof STATUSES)[number];

export const DEPARTMENTS = [
  "Roads & Infrastructure",
  "Storm Water & Drainage",
  "Solid Waste Management",
  "Electrical / Streetlights",
  "Police & Public Safety",
  "Water Supply",
  "General Administration",
] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const CATEGORY_DEPARTMENT: Record<Category, Department> = {
  "Road Damage": "Roads & Infrastructure",
  Waterlogging: "Storm Water & Drainage",
  "Waste Management": "Solid Waste Management",
  Streetlight: "Electrical / Streetlights",
  Drainage: "Storm Water & Drainage",
  "Public Safety": "Police & Public Safety",
  Other: "General Administration",
};

export interface HistoryEntry {
  status: Status;
  at: string;
  note: string;
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  category: Category;
  lat: number;
  lng: number;
  area: string;
  photo?: string | undefined;
  createdAt: string;
  status: Status;
  department?: Department | undefined;
  history: HistoryEntry[];
  summary: string;
  aiSource: "ai" | "rules";
  linkedTo?: string | undefined;
  reporter?: string | undefined;
}

export interface PriorityBreakdown {
  safety: number;
  urgency: number;
  duplicates: number;
  impact: number;
  total: number;
  level: "Critical" | "High" | "Medium" | "Low";
  reasons: string[];
}
