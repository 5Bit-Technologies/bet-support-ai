import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDuration } from "./analytics-utils";

export type ReportPayload = {
  title: string;
  period: string;
  generatedAt: Date;
  metrics: {
    total: number; open: number; resolved: number; closed: number;
    escalated: number; backlog: number;
    avgResolutionMs: number | null; avgResponseMs: number | null;
  };
  categories: { name: string; value: number }[];
  staff: { name: string; assigned: number; resolved: number; avgResolutionMs: number | null }[];
  insights: { headline: string; detail: string }[];
};

export function downloadCSV(report: ReportPayload) {
  const lines: string[] = [];
  lines.push(`"${report.title}"`);
  lines.push(`Period,${report.period}`);
  lines.push(`Generated,${report.generatedAt.toISOString()}`);
  lines.push("");
  lines.push("METRICS");
  lines.push("Metric,Value");
  const m = report.metrics;
  lines.push(`Total tickets,${m.total}`);
  lines.push(`Open,${m.open}`);
  lines.push(`Resolved,${m.resolved}`);
  lines.push(`Closed,${m.closed}`);
  lines.push(`Escalated,${m.escalated}`);
  lines.push(`Backlog,${m.backlog}`);
  lines.push(`Avg resolution,${formatDuration(m.avgResolutionMs)}`);
  lines.push(`Avg first response,${formatDuration(m.avgResponseMs)}`);
  lines.push("");
  lines.push("CATEGORIES");
  lines.push("Category,Tickets");
  report.categories.forEach((c) => lines.push(`${c.name},${c.value}`));
  lines.push("");
  lines.push("STAFF PERFORMANCE");
  lines.push("Staff,Assigned,Resolved,Avg resolution");
  report.staff.forEach((s) =>
    lines.push(`"${s.name}",${s.assigned},${s.resolved},${formatDuration(s.avgResolutionMs)}`),
  );
  lines.push("");
  lines.push("INSIGHTS");
  report.insights.forEach((i) => lines.push(`"${i.headline}","${i.detail.replace(/"/g, "'")}"`));

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, `${slug(report.title)}.csv`);
}

export function downloadPDF(report: ReportPayload) {
  const doc = new jsPDF();
  doc.setFontSize(18); doc.text(report.title, 14, 18);
  doc.setFontSize(10); doc.setTextColor(120);
  doc.text(`Period: ${report.period}`, 14, 25);
  doc.text(`Generated: ${report.generatedAt.toLocaleString()}`, 14, 30);
  doc.setTextColor(0);

  const m = report.metrics;
  autoTable(doc, {
    startY: 38,
    head: [["Metric", "Value"]],
    body: [
      ["Total tickets", String(m.total)],
      ["Open", String(m.open)],
      ["Resolved", String(m.resolved)],
      ["Closed", String(m.closed)],
      ["Escalated", String(m.escalated)],
      ["Backlog", String(m.backlog)],
      ["Avg resolution", formatDuration(m.avgResolutionMs)],
      ["Avg first response", formatDuration(m.avgResponseMs)],
    ],
    headStyles: { fillColor: [88, 28, 135] },
    styles: { fontSize: 9 },
  });

  if (report.categories.length) {
    autoTable(doc, {
      head: [["Category", "Tickets"]],
      body: report.categories.map((c) => [c.name.replace(/_/g, " "), String(c.value)]),
      headStyles: { fillColor: [30, 64, 175] },
      styles: { fontSize: 9 },
    });
  }

  if (report.staff.length) {
    autoTable(doc, {
      head: [["Staff", "Assigned", "Resolved", "Avg resolution"]],
      body: report.staff.map((s) => [s.name, String(s.assigned), String(s.resolved), formatDuration(s.avgResolutionMs)]),
      headStyles: { fillColor: [4, 120, 87] },
      styles: { fontSize: 9 },
    });
  }

  if (report.insights.length) {
    const finalY = (doc as any).lastAutoTable?.finalY ?? 40;
    doc.setFontSize(12); doc.text("AI Insights", 14, finalY + 12);
    autoTable(doc, {
      startY: finalY + 16,
      head: [["Insight", "Detail"]],
      body: report.insights.map((i) => [i.headline, i.detail]),
      headStyles: { fillColor: [120, 53, 15] },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: "auto" } },
    });
  }

  doc.save(`${slug(report.title)}.pdf`);
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
}
