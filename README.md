# RIP-X

A Halloween séance built with Next.js, React, TypeScript, and Tailwind CSS 4. Enter a public X username to turn their latest 25 posts into fictional last words, an obituary, and an illustrated haunting.

## Local development

Use Node.js 22.12+ and pnpm 10.17.1 (the version pinned in `package.json`).

1. Run `pnpm install`.
2. Copy `.env.example` to `.env.local` **if you do not already have one**, and fill in the X and OpenAI credentials and model settings.
3. Run `pnpm dev`.
4. Open [localhost:3003](http://localhost:3003).

All API access and caching run on the server. Never prefix credentials with `NEXT_PUBLIC_`, commit `.env.local`, or put credentials in client components.

## X timeline caching

`getUserTweetsByUsername()` in `src/lib/x.ts` uses `getCache()` from `@vercel/functions` to cache a successful **profile and timeline together**. The homepage requests 25 posts.

- `X_CACHE_TTL_SECONDS=3600` caches for one hour; this is also the default when omitted.
- Set `X_CACHE_TTL_SECONDS=0` to disable caching. Invalid values fall back to one hour.
- Whitespace, an initial `@`, and capitalization are normalized, so `@HeadZoo` and `headzoo` share an entry.
- Keys include the requested count and TTL, under the versioned `rip-x:x-timeline:v1` namespace.
- Upstream errors, partial responses, and protected accounts are not cached. Successful empty timelines are cached.
- Expired or malformed entries trigger a fresh lookup. Cache read/write failures fall back to the live X response.
- Concurrent identical misses share work within one server process. This is not a distributed lock; simultaneous cold misses on different instances can still call X.
- Only X data is cached. Every submission still generates new memorial text and artwork and incurs those API calls.

Vercel supplies the cache automatically: no Redis integration, database, or additional cache credentials are needed. The installed SDK falls back to process-local memory outside Vercel; restarting the development server clears it.

The cache is regional, can be evicted before its TTL, and survives deployments. Preview and Production caches are separate. On Hobby, storage is shared across team projects; the RIP-X namespace prevents collisions with unrelated applications. See [Vercel Runtime Cache](https://vercel.com/docs/caching/runtime-cache).

Source posts can be up to the configured TTL old, including posts deleted or made private after they were fetched. There is no stale-on-error fallback after expiration and no permanent post archive. Disable caching if fresh visibility checks on every request are required.

For a manual purge, use Vercel's Runtime Cache controls. Entries are tagged `rip-x:x-timelines` and `rip-x:x-user:<lowercase-username>` for targeted server-side `getCache().expireTag(...)` invalidation if needed later. No public cache-reset endpoint is exposed. Next.js `revalidateTag` does not clear this cache. See the [Runtime Cache API](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package#getcache).

The lower-level `getUserTweets(userId, count)` helper remains uncached; the homepage uses the cached username helper.

## Deploy to Vercel

Use the existing [RIP-X Vercel project](https://vercel.com/sean-hs-projects-bdabc876/rip-x).

1. In project settings, confirm the Git repository is `headzoo/rip-x` with `main` as the production branch.
2. Set the framework preset to **Next.js**, with the repository root as the root directory. Use:
   - Node.js version: **22.x** (matching local verification).
   - Install command: `pnpm install --frozen-lockfile`.
   - Build command: `pnpm build` (retains the project's Webpack build).
   - Output directory: the Next.js default; do not configure a static export.
3. Add the following variables in **Settings → Environment Variables**, for **Production**, and **Preview** if preview deployments should work:
   - `X_API_BEARER_TOKEN`: the X app-only bearer token with access to user lookup and timeline endpoints.
   - `OPENAI_API_KEY`: your API key.
   - `OPENAI_MODEL`: your configured text model, currently `gpt-5.6` in `.env.example`.
   - `OPENAI_IMAGE_MODEL`: your configured image model, currently `gpt-image-2` in `.env.example`.
   - `X_CACHE_TTL_SECONDS`: `3600` (optional).
4. Keep **Fluid compute** enabled. The homepage already specifies a 120-second maximum duration for its sequential text/image generation. See [Vercel function duration](https://vercel.com/docs/functions/configuring-functions/duration).
5. Commit and push the application changes, new assets/source files, `package.json`, and `pnpm-lock.yaml` to `main`. The connected Vercel project will build a production deployment. If the commit is already deployed, redeploy after adding the environment variables; [environment changes only apply to new deployments](https://vercel.com/docs/environment-variables).
6. Smoke-test a public username. Repeat it within one hour and inspect **Observability → Runtime Cache** for hits. The second request should reuse X data, but still wait for and pay for new OpenAI text/image generation.

Caching is not rate limiting: before broadly sharing the app, consider request limits and provider spending limits to protect the paid generation endpoints.

## Checks

```bash
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

The cache tests use fake timelines/cache storage and make no paid API calls. A local production build does not verify the deployed Vercel cache or production credentials.
