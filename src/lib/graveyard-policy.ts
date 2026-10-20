export const GRAVES_PER_PAGE = 24;
export const HOME_GRAVE_COUNT = 12;
export const GENERATION_LEASE_MS = 180_000;
export const HEADSTONE_COUNT = 6;

export function normalizeUsername(raw: string): string {
  const username = raw.trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9_]{1,15}$/.test(username)) {
    throw new Error("Enter a valid X username using letters, numbers, or underscores.");
  }
  return username;
}

export function headstoneForAccount(xUserId: string): number {
  let hash = 0;
  for (const char of xUserId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % HEADSTONE_COUNT;
}

export function parseGraveyardQuery(params: URLSearchParams) {
  const query = (params.get("q") ?? "").trim().replace(/^@/, "").slice(0, 50);
  const rawPage = params.get("page") ?? "1";
  const page = /^\d+$/.test(rawPage) ? Math.min(10_000, Math.max(1, Number(rawPage))) : 1;
  const limit = params.get("compact") === "1" ? HOME_GRAVE_COUNT : GRAVES_PER_PAGE;
  return { query, page, limit };
}
