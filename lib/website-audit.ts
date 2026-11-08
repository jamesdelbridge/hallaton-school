export function formatWebsiteAudit(fields: Record<string, string | boolean | Date | null | undefined>) {
  return Object.entries(fields).map(([label, value]) => `${label}:\n${value instanceof Date ? value.toISOString() : value == null ? "(none)" : value}`).join("\n\n");
}
