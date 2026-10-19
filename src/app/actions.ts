"use server";

import { ApiError } from "@xdevplatform/xdk";

import {
  generateMemorial,
  MemorialGenerationError,
  type Memorial,
} from "@/lib/memorial";
import { getUserTweetsByUsername } from "@/lib/x";

const SOURCE_POST_COUNT = 25;

export type MemorialState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "success";
      username: string;
      displayName: string;
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
    const { user, tweets } = await getUserTweetsByUsername(
      username,
      SOURCE_POST_COUNT,
    );
    const resolvedUsername = user.username ?? username;
    const displayName = user.name?.trim() || `@${resolvedUsername}`;
    const posts = tweets
      .map((tweet) => ({
        createdAt: tweet.createdAt,
        text: (tweet.notePost?.text ?? tweet.text ?? "").trim(),
      }))
      .filter((tweet) => tweet.text.length > 0);

    if (posts.length === 0) {
      return {
        status: "error",
        message: `@${resolvedUsername} has no recent posts for the séance to read.`,
      };
    }

    const memorial = await generateMemorial({
      displayName,
      posts,
    });

    return {
      status: "success",
      username: resolvedUsername,
      displayName,
      postsAnalyzed: posts.length,
      memorial,
    };
  } catch (error) {
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

    console.error("Failed to summon memorial", error);

    return {
      status: "error",
      message: "The veil would not open. Please try again shortly.",
    };
  }
}
