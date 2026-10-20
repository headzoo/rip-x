import "server-only";

import { put, del } from "@vercel/blob";
import type { HauntingArtwork } from "./memorial-contract";
import type { GenerationClaim } from "./memorial-repository";

export interface StoredArtwork {
  artwork: HauntingArtwork;
  pathname: string;
}

export async function storeHauntingArtwork(
  artwork: HauntingArtwork,
  claim: GenerationClaim,
): Promise<StoredArtwork> {
  const match = /^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/.exec(artwork.src);
  if (!match) throw new Error("Expected generated WebP artwork.");
  const data = Buffer.from(match[1], "base64");
  if (!data.length || data.length > 2_000_000) throw new Error("Invalid artwork size.");

  // Immutable attempt-specific paths in the shared Mosslings store.
  const pathname = `rip-x/hauntings/${claim.id}/${claim.token}.webp`;
  const blob = await put(pathname, data, {
    access: "public", contentType: "image/webp",
    addRandomSuffix: false, allowOverwrite: false,
    cacheControlMaxAge: 3600,
  });
  return { artwork: { ...artwork, src: blob.url }, pathname: blob.pathname };
}

export async function discardUnpublishedArtwork(stored: StoredArtwork): Promise<void> {
  if (!/^rip-x\/hauntings\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/.test(stored.pathname)) {
    throw new Error("Refusing to delete an asset outside RIP-X's attempt namespace.");
  }
  // Delete only the specific upload created by this attempt, never list/purge.
  await del(stored.pathname);
}
