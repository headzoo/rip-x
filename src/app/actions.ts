"use server";

import { ApiError } from "@xdevplatform/xdk";

import {
  generateHauntingArtwork,
  HauntingImageGenerationError,
  type HauntingArtwork,
} from "@/lib/haunting-image";
import {
  generateMemorial,
  MemorialGenerationError,
  type Memorial,
} from "@/lib/memorial";
import { getUserTweetsByUsername, getXIdentity } from "@/lib/x";
import { createMemorialRepository } from "@/lib/memorial-repository";
import { storeHauntingArtwork, discardUnpublishedArtwork } from "@/lib/artwork-storage";
import { createMemorialWorkflow, MemorialWorkflowError } from "@/lib/memorial-workflow";

const SOURCE_POST_COUNT = 25;

const createOrReadMemorial = createMemorialWorkflow({
  resolveIdentity: getXIdentity,
  async readPosts(identity) {
    const { tweets } = await getUserTweetsByUsername(identity.username, SOURCE_POST_COUNT, identity.id);
    return tweets.map((tweet) => ({
      createdAt: tweet.createdAt,
      text: (tweet.notePost?.text ?? tweet.text ?? "").trim(),
    }));
  },
  generate: generateMemorial,
  illustrate: generateHauntingArtwork,
  repository: createMemorialRepository(),
  storeArtwork: storeHauntingArtwork,
  discardArtwork: discardUnpublishedArtwork,
});

export type MemorialState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "success";
      id: string | null;
      username: string;
      displayName: string;
      hauntingArtwork: HauntingArtwork;
      postsAnalyzed: number;
      memorial: Memorial;
    };

export async function summonMemorial(
  _previousState: MemorialState,
  formData: FormData,
): Promise<MemorialState> {
  const username = String(formData.get("username") ?? "")
    .trim()
    .replace(/^@/, "");

  if (!/^[A-Za-z0-9_]{1,15}$/.test(username)) {
    return {
      status: "error",
      message: "Enter a valid X username using letters, numbers, or underscores.",
    };
  }

  try {
    const result = await createOrReadMemorial(username, formData.get("optOut") === "on");
    return { status: "success", ...result };
  } catch (error) {
    if (error instanceof MemorialWorkflowError) {
      const messages = {
        busy: "This spirit is already being summoned. Please try again in a moment.",
        hidden: "This account's memorial is not available for publication.",
        no_posts: `@${username} has no recent posts for the séance to read.`,
        lease_lost: "The séance took too long to reserve its grave. Please try again.",
      };
      return { status: "error", message: messages[error.code] };
    }
    if (error instanceof ApiError) {
      if (error.status === 404) {
        return {
          status: "error",
          message: `We couldn't find an X account named @${username}.`,
        };
      }

      if (error.status === 401 || error.status === 403) {
        return {
          status: "error",
          message: "The X API credentials are missing access to this endpoint.",
        };
      }

      if (error.status === 429) {
        return {
          status: "error",
          message: "The X API rate limit was reached. Please try again shortly.",
        };
      }
    }

    if (error instanceof MemorialGenerationError) {
      console.error("Failed to generate memorial", {
        code: error.code,
        cause:
          error.cause instanceof Error ? error.cause.name : "UnknownError",
      });

      if (error.code === "request_failed") {
        return {
          status: "error",
          message: "The spirits are silent right now. Please try the séance again.",
        };
      }

      return {
        status: "error",
        message: "The séance ended before all three parchments were ready. Please try again.",
      };
    }

    if (error instanceof HauntingImageGenerationError) {
      console.error("Failed to generate haunting artwork", {
        code: error.code,
        cause:
          error.cause instanceof Error ? error.cause.name : "UnknownError",
      });

      return {
        status: "error",
        message: "The ghost arrived, but its portrait would not develop. Please try again.",
      };
    }

    if (error instanceof Error) {
      if (error.message.startsWith("X_API_BEARER_TOKEN")) {
        return {
          status: "error",
          message: "Add X_API_BEARER_TOKEN to .env.local before summoning.",
        };
      }

      if (error.message.startsWith("OPENAI_")) {
        return {
          status: "error",
          message: "Add the OpenAI configuration to .env.local before summoning.",
        };
      }

      if (error.message.startsWith("The X account")) {
        return { status: "error", message: error.message };
      }
    }

    console.error("Failed to summon memorial", {
      name: error instanceof Error ? error.name : "UnknownError",
      code: error && typeof error === "object" && "code" in error ? String(error.code) : undefined,
    });

    return {
      status: "error",
      message: "The séance could not be completed or saved. Please try again shortly.",
    };
  }
}
