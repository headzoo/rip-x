import "server-only";

import { Client, type Schemas } from "@xdevplatform/xdk";
import { getCache } from "@vercel/functions";
import { createHash } from "node:crypto";

import { createCachedXTimelineReader } from "./x-timeline-cache";

let client: Client | undefined;

function getXClient(): Client {
  const bearerToken = process.env.X_API_BEARER_TOKEN;

  if (!bearerToken) {
    throw new Error(
      "X_API_BEARER_TOKEN is not configured. Add it to .env.local and to the Vercel project environment variables.",
    );
  }

  client ??= new Client({ bearerToken });
  return client;
}

/**
 * Returns up to `count` of a user's most recent posts, newest first.
 * X returns between 5 and 100 posts per request, so larger counts are paginated.
 */
export async function getUserTweets(
  userId: string,
  count: number,
): Promise<Schemas.Post[]> {
  if (!/^\d{1,19}$/.test(userId)) {
    throw new Error("X userId must contain between 1 and 19 digits.");
  }

  if (!Number.isSafeInteger(count) || count < 1) {
    throw new Error("Tweet count must be a positive integer.");
  }

  const tweets: Schemas.Post[] = [];
  let paginationToken: string | undefined;

  do {
    const remaining = count - tweets.length;
    const response = await getXClient().users.getPosts(userId, {
      maxResults: Math.max(5, Math.min(100, remaining)),
      paginationToken,
      postFields: [
        "attachments",
        "conversation_id",
        "created_at",
        "entities",
        "lang",
        "public_metrics",
      ],
    });

    if (response.errors?.length) {
      throw new Error("X returned an incomplete timeline response.");
    }

    tweets.push(...(response.data ?? []));
    paginationToken = response.meta?.nextToken;
  } while (tweets.length < count && paginationToken);

  return tweets.slice(0, count);
}

export interface XUserTimeline {
  user: Schemas.User;
  tweets: Schemas.Post[];
}

const readProfile = createCachedXTimelineReader(
  async (username) => {
    const response = await getXClient().users.getByUsername(username, {
      userFields: ["name", "profile_image_url", "username", "protected"],
    });

    if (!response.data?.id) {
      throw new Error(`The X account @${username} could not be found.`);
    }
    if (response.data.protected) {
      throw new Error(
        `The X account @${username} is protected. Only public accounts can be summoned.`,
      );
    }
    if (response.errors?.length) {
      throw new Error("X returned an incomplete profile response.");
    }

    return {
      user: response.data,
      tweets: [],
    };
  },
  { cache: getCache({
    namespace: "rip-x:x-profile:v1",
    keyHashFunction: (key) => createHash("sha256").update(key).digest("hex"),
  }) },
);

/** Resolve identity independently, before deciding whether posts are needed. */
export async function getXIdentity(username: string) {
  const { user } = await readProfile(username, 1);
  if (!user.id || !user.username) throw new Error("The X account could not be resolved.");
  return { id: user.id, username: user.username, name: user.name?.trim() || `@${user.username}` };
}

/** Reuses the public profile and timeline for X_CACHE_TTL_SECONDS (one hour). */
export const getUserTweetsByUsername = createCachedXTimelineReader(
  async (username, count, identityId) => {
    const { user } = await readProfile(username, 1);
    if (!user.id || (identityId && identityId !== user.id)) {
      throw new Error("The X account changed during this request. Please try again.");
    }
    return { user, tweets: await getUserTweets(user.id, count) };
  },
);
