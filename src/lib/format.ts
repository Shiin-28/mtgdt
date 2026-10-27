const php = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

/** 1234 -> "₱1,234.00" */
export function formatPhp(amount: number): string {
  return php.format(amount);
}

/** "just now", "5 min ago", "3 h ago", "2 d ago" */
export function timeAgo(iso: string, now = Date.now()): string {
  const mins = Math.round((now - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}
