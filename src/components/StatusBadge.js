import { STATUS_COLORS } from "@/lib/constants";

export default function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS["Active"];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap" style={{ background: c.bg, color: c.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {status}
    </span>
  );
}
