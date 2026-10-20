import "server-only";

import { randomUUID } from "node:crypto";
import type { PrismaClient, Memorial as MemorialRow } from "@/generated/prisma/client";
import { getDatabase } from "./db";
import {
  ArtworkSchema, MemorialSchema,
  type GravePage, type SavedMemorial, type Memorial, type HauntingArtwork,
} from "./memorial-contract";
import { GENERATION_LEASE_MS, headstoneForAccount } from "./graveyard-policy";

export interface XIdentity { id: string; username: string; name: string }
export interface GenerationClaim { id: string; token: string }
export type ClaimResult =
  | { kind: "claimed"; claim: GenerationClaim }
  | { kind: "ready"; value: SavedMemorial }
  | { kind: "busy" | "hidden" };

export interface PublishedContent {
  memorial: Memorial;
  hauntingArtwork: HauntingArtwork;
  artworkPath: string;
  postsAnalyzed: number;
}

export interface MemorialRepository {
  claim(identity: XIdentity): Promise<ClaimResult>;
  publish(claim: GenerationClaim, content: PublishedContent): Promise<SavedMemorial | null>;
  fail(claim: GenerationClaim): Promise<void>;
}

function toSaved(row: MemorialRow): SavedMemorial {
  const memorial = MemorialSchema.parse(row.content);
  const hauntingArtwork = ArtworkSchema.parse({
    src: row.artworkUrl, alt: row.artworkAlt,
    width: row.artworkWidth, height: row.artworkHeight,
  });
  return {
    id: row.id, username: row.username, displayName: row.displayName,
    epitaph: memorial.obituary.epitaph, memorial, hauntingArtwork,
    headstoneVariant: row.headstoneVariant,
    publishedAt: row.publishedAt!.toISOString(),
    postsAnalyzed: row.postsAnalyzed,
  };
}

export function createMemorialRepository(
  database: () => PrismaClient = getDatabase,
  now: () => Date = () => new Date(),
): MemorialRepository {
  return {
    async claim(identity) {
      const db = database();
      const token = randomUUID();
      const time = now();
      const leaseExpiresAt = new Date(time.getTime() + GENERATION_LEASE_MS);
      try {
        const created = await db.memorial.create({
          data: {
            xUserId: identity.id, username: identity.username.toLowerCase(),
            displayName: identity.name, claimToken: token, leaseExpiresAt,
            headstoneVariant: headstoneForAccount(identity.id),
          },
        });
        return { kind: "claimed", claim: { id: created.id, token } };
      } catch (error) {
        if (!(error && typeof error === "object" && "code" in error && error.code === "P2002")) throw error;
      }

      // A single conditional UPDATE lets only one worker reclaim an expired job.
      const acquired = await db.memorial.updateMany({
        where: {
          xUserId: identity.id,
          OR: [
            { status: "FAILED" },
            { status: "GENERATING", leaseExpiresAt: { lte: time } },
          ],
        },
        data: {
          status: "GENERATING", claimToken: token, leaseExpiresAt,
          username: identity.username.toLowerCase(), displayName: identity.name,
        },
      });
      const row = await db.memorial.findUniqueOrThrow({ where: { xUserId: identity.id } });
      if (acquired.count === 1) return { kind: "claimed", claim: { id: row.id, token } };
      if (row.status === "READY") return { kind: "ready", value: toSaved(row) };
      return { kind: row.status === "HIDDEN" ? "hidden" : "busy" };
    },
    async publish(claim, content) {
      const db = database();
      const memorial = MemorialSchema.parse(content.memorial);
      const artwork = ArtworkSchema.parse(content.hauntingArtwork);
      const time = now();
      const updated = await db.memorial.updateMany({
        where: {
          id: claim.id, claimToken: claim.token, status: "GENERATING",
          leaseExpiresAt: { gt: time },
        },
        data: {
          status: "READY", content: memorial,
          artworkUrl: artwork.src, artworkPath: content.artworkPath,
          artworkAlt: artwork.alt, artworkWidth: artwork.width, artworkHeight: artwork.height,
          postsAnalyzed: content.postsAnalyzed, publishedAt: time,
          claimToken: null, leaseExpiresAt: null,
        },
      });
      if (!updated.count) return null;
      const row = await db.memorial.findUniqueOrThrow({ where: { id: claim.id } });
      return row.status === "READY" ? toSaved(row) : null;
    },
    async fail(claim) {
      await database().memorial.updateMany({
        where: { id: claim.id, claimToken: claim.token, status: "GENERATING" },
        data: { status: "FAILED", claimToken: null, leaseExpiresAt: null },
      });
    },
  };
}

export async function getPublicMemorial(id: string): Promise<SavedMemorial | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const row = await getDatabase().memorial.findFirst({ where: { id, status: "READY" } });
  return row ? toSaved(row) : null;
}

export async function listPublicMemorials(
  { query, page, limit }: { query: string; page: number; limit: number },
): Promise<GravePage> {
  const rows = await getDatabase().memorial.findMany({
    where: {
      status: "READY",
      ...(query ? { OR: [
        { username: { contains: query, mode: "insensitive" as const } },
        { displayName: { contains: query, mode: "insensitive" as const } },
      ] } : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    skip: (page - 1) * limit, take: limit + 1,
    select: {
      id: true, username: true, displayName: true, content: true,
      headstoneVariant: true, publishedAt: true,
    },
  });
  return {
    page, hasMore: rows.length > limit,
    graves: rows.slice(0, limit).map((row) => ({
      id: row.id, username: row.username, displayName: row.displayName,
      epitaph: MemorialSchema.parse(row.content).obituary.epitaph,
      headstoneVariant: row.headstoneVariant, publishedAt: row.publishedAt!.toISOString(),
    })),
  };
}
