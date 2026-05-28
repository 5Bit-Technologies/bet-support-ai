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

export const CATEGORIES = [
  { value: "withdrawals", label: "Withdrawals" },
  { value: "deposits", label: "Deposits" },
  { value: "betting", label: "Betting issues" },
  { value: "verification", label: "Account verification" },
  { value: "login", label: "Login problems" },
  { value: "promotions", label: "Promotions / bonuses" },
  { value: "hr", label: "HR" },
  { value: "it", label: "IT" },
  { value: "finance", label: "Finance" },
  { value: "facilities", label: "Facilities" },
  { value: "internal_security", label: "Internal security" },
  { value: "other", label: "Other" },
] as const;

export const STATUSES = ["open", "pending", "in_progress", "escalated", "resolved", "closed"] as const;
export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export function formatStatus(s: string) {
  return s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
