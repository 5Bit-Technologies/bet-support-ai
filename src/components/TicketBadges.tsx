import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS, PRIORITY_COLORS, formatStatus } from "@/lib/ticket-utils";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant="outline" className={cn("font-medium", STATUS_COLORS[status])}>{formatStatus(status)}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <Badge variant="outline" className={cn("font-medium capitalize", PRIORITY_COLORS[priority])}>{priority}</Badge>;
}

export function SentimentBadge({ sentiment }: { sentiment: string | null | undefined }) {
  if (!sentiment) return null;
  const map: Record<string, string> = {
    positive: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    neutral: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
    negative: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
    frustrated: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  };
  return <Badge variant="outline" className={cn("font-medium capitalize", map[sentiment])}>{sentiment}</Badge>;
}
