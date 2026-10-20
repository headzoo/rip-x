import "server-only";

import { createHash } from "node:crypto";
import { getCache, type RuntimeCache } from "@vercel/functions";
import { z } from "zod";

import type { XUserTimeline } from "./x";

const DEFAULT_TTL_SECONDS = 60 * 60;

// This namespace also isolates RIP-X on plans that share a team-wide cache.
const runtimeCache = getCache({
  namespace: "rip-x:x-timeline:v1",
  keyHashFunction: (key) => createHash("sha256").update(key).digest("hex"),
});

const cacheEntrySchema = z.object({
  fetchedAt: z.number().int().nonnegative(),
  timeline: z.object({
    user: z
      .object({
        id: z.string(),
        username: z.string(),
        name: z.string().optional(),
        protected: z.literal(false).optional(),
      })
      .passthrough(),
    tweets: z.array(
      z
        .object({
          id: z.string(),
          text: z.string().optional(),
          createdAt: z.string().optional(),
          notePost: z
            .object({ text: z.string() })
            .passthrough()
            .optional(),
        })
        .passthrough(),
    ),
  }),
});

export function getXCacheTtlSeconds(
  configured = process.env.X_CACHE_TTL_SECONDS,
): number {
  if (configured === undefined || configured.trim() === "") {
    return DEFAULT_TTL_SECONDS;
  }

  const ttl = Number(configured);

  if (!/^\d+$/.test(configured.trim()) || !Number.isSafeInteger(ttl)) {
    console.warn("[x-cache] Invalid X_CACHE_TTL_SECONDS; using 3600 seconds.");
    return DEFAULT_TTL_SECONDS;
  }

  return ttl;
}

type TimelineLoader = (
  username: string,
  count: number,
) => Promise<XUserTimeline>;

interface CacheOptions {
  cache?: Pick<RuntimeCache, "get" | "set">;
  getTtl?: () => number;
  now?: () => number;
}

/** Cache X data only; memorial text and artwork are generated separately. */
export function createCachedXTimelineReader(
  loadTimeline: TimelineLoader,
  {
    cache = runtimeCache,
    getTtl = getXCacheTtlSeconds,
    now = Date.now,
  }: CacheOptions = {},
): TimelineLoader {
  // Coalesce misses within this process, not across Vercel instances/regions.
  const pending = new Map<string, Promise<XUserTimeline>>();

  return async (rawUsername, count) => {
    const username = rawUsername.trim().replace(/^@/, "").toLowerCase();

    if (!/^[a-z0-9_]{1,15}$/.test(username)) {
      throw new Error("Enter a valid X username.");
    }
    if (!Number.isSafeInteger(count) || count < 1) {
      throw new Error("Tweet count must be a positive integer.");
    }

    const ttl = getTtl();
    if (ttl === 0) return loadTimeline(username, count);

    // Include TTL so a configuration change cannot reuse an old TTL policy.
    const key = `${username}:${count}:${ttl}`;
    const existing = pending.get(key);
    if (existing) return existing;

    const request = (async () => {
      try {
        const entry = cacheEntrySchema.safeParse(await cache.get(key));

        if (entry.success) {
          const age = now() - entry.data.fetchedAt;
          if (
            age >= 0 &&
            age < ttl * 1000 &&
            entry.data.timeline.user.username.toLowerCase() === username &&
            entry.data.timeline.tweets.length <= count
          ) {
            return entry.data.timeline;
          }
        }
      } catch {
        // Cache outages must not prevent a live lookup. Never log source posts.
        console.warn("[x-cache] Read failed; fetching from X.");
      }

      const fetchedAt = now();
      // A failed or partial X request throws before anything can be stored.
      const timeline = await loadTimeline(username, count);

      try {
        await cache.set(
          key,
          { fetchedAt, timeline },
          {
            ttl,
            name: `RIP-X timeline (${count} posts)`,
            tags: ["rip-x:x-timelines", `rip-x:x-user:${username}`],
          },
        );
      } catch {
        console.warn("[x-cache] Write failed; using the fresh X response.");
      }

      return timeline;
    })();

    pending.set(key, request);
    try {
      return await request;
    } finally {
      pending.delete(key);
    }
  };
}
