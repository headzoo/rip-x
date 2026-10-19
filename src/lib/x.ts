import "server-only";

import { Client, type Schemas } from "@xdevplatform/xdk";

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

    tweets.push(...(response.data ?? []));
    paginationToken = response.meta?.nextToken;
  } while (tweets.length < count && paginationToken);

  return tweets.slice(0, count);
}

export interface XUserTimeline {
  user: Schemas.User;
  tweets: Schemas.Post[];
}

export async function getUserTweetsByUsername(
  rawUsername: string,
  count: number,
): Promise<XUserTimeline> {
  const username = rawUsername.trim().replace(/^@/, "");

  if (!/^[A-Za-z0-9_]{1,15}$/.test(username)) {
    throw new Error("Enter a valid X username.");
  }

  const response = await getXClient().users.getByUsername(username, {
    userFields: ["name", "profile_image_url", "username"],
  });

  if (!response.data?.id) {
    throw new Error(`The X account @${username} could not be found.`);
  }

  return {
    user: response.data,
    tweets: await getUserTweets(response.data.id, count),
  };
}
