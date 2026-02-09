export const ROLES = { LENDER: "Lender", PROCESSOR: "Processor", ASSISTANT: "Assistant" };

export const STATUS_OPTIONS = [
  "Active", "CTC", "Submitted", "Approved w/ Conditions", "Suspended",
  "Pending Sale", "Funded", "Paid", "Denied", "Withdrawn",
];

export const CLOSED_STATUSES = ["Paid", "Funded", "Denied", "Withdrawn"];

export const STATUS_COLORS = {
  Active:                  { bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6" },
  CTC:                     { bg: "#fef3c7", text: "#92400e", dot: "#f59e0b" },
  Submitted:               { bg: "#e0e7ff", text: "#3730a3", dot: "#6366f1" },
  "Approved w/ Conditions":{ bg: "#fce7f3", text: "#9d174d", dot: "#ec4899" },
  Suspended:               { bg: "#f3f4f6", text: "#374151", dot: "#9ca3af" },
  "Pending Sale":          { bg: "#fff7ed", text: "#9a3412", dot: "#f97316" },
  Funded:                  { bg: "#d1fae5", text: "#065f46", dot: "#10b981" },
  Paid:                    { bg: "#dcfce7", text: "#166534", dot: "#22c55e" },
  Denied:                  { bg: "#fee2e2", text: "#991b1b", dot: "#ef4444" },
  Withdrawn:               { bg: "#f1f5f9", text: "#475569", dot: "#94a3b8" },
};

export const LOAN_TYPES = ["Conventional", "VA", "FHA", "USDA", "Jumbo"];

export const fmtDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
};

export const fmtCurrency = (n) => {
  if (!n && n !== 0) return "";
  return "$" + Number(n).toLocaleString("en-US");
};
