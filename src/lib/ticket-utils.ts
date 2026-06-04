export const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  in_progress: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
  escalated: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  resolved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  closed: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
  medium: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  high: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  urgent: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
};

/** Main category buckets used for analytics + AI routing. */
export const MAIN_CATEGORIES = ["Online Gambling", "Physical Casino", "Internal Staff"] as const;
export type MainCategory = (typeof MAIN_CATEGORIES)[number];

export const CATEGORIES = [
  // Online Gambling
  { value: "withdrawals", label: "Withdrawals", main: "Online Gambling" as MainCategory },
  { value: "deposits", label: "Deposits", main: "Online Gambling" as MainCategory },
  { value: "betting", label: "Betting issues", main: "Online Gambling" as MainCategory },
  { value: "verification", label: "Account verification", main: "Online Gambling" as MainCategory },
  { value: "login", label: "Login problems", main: "Online Gambling" as MainCategory },
  { value: "promotions", label: "Promotions / bonuses", main: "Online Gambling" as MainCategory },
  { value: "responsible_gambling", label: "Responsible gambling support", main: "Online Gambling" as MainCategory },
  // Physical Casino
  { value: "security_incident", label: "Security incident", main: "Physical Casino" as MainCategory },
  { value: "theft", label: "Theft report", main: "Physical Casino" as MainCategory },
  { value: "lost_found", label: "Lost & found", main: "Physical Casino" as MainCategory },
  { value: "customer_complaint", label: "Customer complaint", main: "Physical Casino" as MainCategory },
  { value: "property_damage", label: "Property damage", main: "Physical Casino" as MainCategory },
  { value: "facility_issue", label: "Facility issue", main: "Physical Casino" as MainCategory },
  { value: "venue_services", label: "Venue services", main: "Physical Casino" as MainCategory },
  // Internal Staff
  { value: "it", label: "IT", main: "Internal Staff" as MainCategory },
  { value: "hr", label: "HR", main: "Internal Staff" as MainCategory },
  { value: "finance", label: "Finance", main: "Internal Staff" as MainCategory },
  { value: "operations", label: "Operations", main: "Internal Staff" as MainCategory },
  { value: "internal_security", label: "Internal security", main: "Internal Staff" as MainCategory },
  { value: "maintenance", label: "Maintenance", main: "Internal Staff" as MainCategory },
  { value: "facilities", label: "Facilities", main: "Internal Staff" as MainCategory },
  { value: "other", label: "Other", main: "Internal Staff" as MainCategory },
] as const;

export const STAFF_CATEGORIES = ["hr", "it", "finance", "operations", "internal_security", "maintenance", "facilities"] as const;
export const CUSTOMER_CATEGORIES = [
  "withdrawals", "deposits", "betting", "verification", "login", "promotions", "responsible_gambling",
  "security_incident", "theft", "lost_found", "customer_complaint", "property_damage", "facility_issue", "venue_services",
] as const;

export const STATUSES = ["open", "pending", "in_progress", "escalated", "resolved", "closed"] as const;
export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const RESPONSE_TONES = ["formal", "friendly", "urgent"] as const;
export type ResponseTone = (typeof RESPONSE_TONES)[number];

export function formatStatus(s: string) {
  return s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function mainCategoryFor(category: string): MainCategory {
  return CATEGORIES.find((c) => c.value === category)?.main ?? "Internal Staff";
}
