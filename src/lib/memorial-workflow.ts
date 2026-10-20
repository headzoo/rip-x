import { MemorialSchema, type Memorial, type HauntingArtwork, type SavedMemorial } from "./memorial-contract";
import { normalizeUsername } from "./graveyard-policy";
import type { XIdentity, MemorialRepository } from "./memorial-repository";
import type { StoredArtwork } from "./artwork-storage";
import type { MemorialSourcePost } from "./memorial";

export class MemorialWorkflowError extends Error {
  constructor(public readonly code: "busy" | "hidden" | "no_posts" | "lease_lost") {
    super(code);
    this.name = "MemorialWorkflowError";
  }
}

interface Dependencies {
  resolveIdentity(username: string): Promise<XIdentity>;
  readPosts(identity: XIdentity): Promise<MemorialSourcePost[]>;
  generate(input: { displayName: string; posts: MemorialSourcePost[] }): Promise<Memorial>;
  illustrate(input: { haunting: Memorial["haunting"]; username: string }): Promise<HauntingArtwork>;
  repository: MemorialRepository;
  storeArtwork: typeof import("./artwork-storage").storeHauntingArtwork;
  discardArtwork(stored: StoredArtwork): Promise<void>;
}

export interface MemorialResult {
  id: string | null;
  username: string;
  displayName: string;
  postsAnalyzed: number;
  memorial: Memorial;
  hauntingArtwork: HauntingArtwork;
}

export function createMemorialWorkflow(deps: Dependencies) {
  return async (rawUsername: string, optOut: boolean): Promise<MemorialResult> => {
    const identity = await deps.resolveIdentity(normalizeUsername(rawUsername));
    if (!/^\d{1,19}$/.test(identity.id)) throw new Error("Invalid X identity.");

    // Privacy is decided before any database claim or Blob upload.
    const result = optOut ? null : await deps.repository.claim(identity);
    if (result?.kind === "ready") return result.value;
    if (result?.kind === "busy" || result?.kind === "hidden") throw new MemorialWorkflowError(result.kind);
    const claim = result?.kind === "claimed" ? result.claim : null;
    let stored: StoredArtwork | undefined;
    let publishAttempted = false;
    let definitelyUnpublished = false;

    try {
      const posts = (await deps.readPosts(identity)).filter((post) => post.text.trim());
      if (!posts.length) throw new MemorialWorkflowError("no_posts");
      const memorial = MemorialSchema.parse(await deps.generate({ displayName: identity.name, posts }));
      const hauntingArtwork = await deps.illustrate({ haunting: memorial.haunting, username: identity.username });
      if (!claim) return {
        id: null, username: identity.username, displayName: identity.name,
        postsAnalyzed: posts.length, memorial, hauntingArtwork,
      };

      stored = await deps.storeArtwork(hauntingArtwork, claim);
      publishAttempted = true;
      const published: SavedMemorial | null = await deps.repository.publish(claim, {
        memorial, hauntingArtwork: stored.artwork, artworkPath: stored.pathname, postsAnalyzed: posts.length,
      });
      if (!published) {
        definitelyUnpublished = true;
        throw new MemorialWorkflowError("lease_lost");
      }
      return published;
    } catch (error) {
      // An uncertain DB commit may have saved the URL. Never delete that image
      // blindly; an operator can reconcile an orphan later without broken graves.
      if (stored && (!publishAttempted || definitelyUnpublished)) {
        await deps.discardArtwork(stored).catch(() => console.warn("[graveyard] Upload cleanup needs attention."));
      }
      if (claim) {
        await deps.repository.fail(claim).catch(() => console.warn("[graveyard] Claim will recover when its lease expires."));
      }
      throw error;
    }
  };
}
