import "server-only";

import OpenAI from "openai";

let client: OpenAI | undefined;

function getRequiredEnv(
  name: "OPENAI_API_KEY" | "OPENAI_MODEL" | "OPENAI_IMAGE_MODEL",
): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is not configured. Add it to .env.local and to the Vercel project environment variables.`,
    );
  }

  return value;
}

/**
 * Returns the shared server-side OpenAI client.
 *
 * The client is created lazily so importing this module during a build does not
 * require credentials. Never import this module from a Client Component.
 */
export function getOpenAIClient(): OpenAI {
  client ??= new OpenAI({
    apiKey: getRequiredEnv("OPENAI_API_KEY"),
  });

  return client;
}

/** Model used for obituary and ghost-story generation. */
export function getOpenAIModel(): string {
  return getRequiredEnv("OPENAI_MODEL");
}

/** Model reserved for generated artwork. */
export function getOpenAIImageModel(): string {
  return getRequiredEnv("OPENAI_IMAGE_MODEL");
}
