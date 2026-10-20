# RIP-X

A Halloween séance built with Next.js, React, TypeScript, and Tailwind CSS 4. Enter a public X username to turn their latest 25 posts into fictional last words, an obituary, and an illustrated haunting.

## Local development

Use Node.js 22.12+ and pnpm 10.17.1 (the version pinned in `package.json`).

1. Run `pnpm install`.
2. Copy `.env.example` to `.env.local` **if you do not already have one**, and fill in the X, OpenAI, Neon, and Blob settings. Use a development Neon branch rather than the production database.
3. Run `pnpm db:generate`. After checking that `DATABASE_URL_UNPOOLED` points to the intended development database, run `pnpm db:migrate`.
4. Run `pnpm dev`.
5. Open [localhost:3003](http://localhost:3003).

All API access and caching run on the server. Never prefix credentials with `NEXT_PUBLIC_`, commit `.env.local`, or put credentials in client components.

## X timeline caching

`getXIdentity()` and `getUserTweetsByUsername()` in `src/lib/x.ts` use `getCache()` from `@vercel/functions`. The profile is cached independently so a saved grave can be reused without fetching posts. For new memorials, the homepage requests 25 posts and caches the successful profile/timeline pair.

- `X_CACHE_TTL_SECONDS=3600` caches for one hour; this is also the default when omitted.
- Set `X_CACHE_TTL_SECONDS=0` to disable caching. Invalid values fall back to one hour.
- Whitespace, an initial `@`, and capitalization are normalized, so `@HeadZoo` and `headzoo` share an entry.
- Timeline keys include the requested count, TTL, and resolved X account ID, under the versioned `rip-x:x-timeline:v1` namespace. Profiles use `rip-x:x-profile:v1`.
- Upstream errors, partial responses, and protected accounts are not cached. Successful empty timelines are cached.
- Expired or malformed entries trigger a fresh lookup. Cache read/write failures fall back to the live X response.
- Concurrent identical misses share work within one server process. This is not a distributed lock; simultaneous cold misses on different instances can still call X.
- Only X data is in this temporary cache. Completed public memorials are saved separately in Neon and reused; opted-out submissions still generate fresh text and artwork.

Vercel supplies the cache automatically: no Redis integration, database, or additional cache credentials are needed. The installed SDK falls back to process-local memory outside Vercel; restarting the development server clears it.

The cache is regional, can be evicted before its TTL, and survives deployments. Preview and Production caches are separate. On Hobby, storage is shared across team projects; the RIP-X namespace prevents collisions with unrelated applications. See [Vercel Runtime Cache](https://vercel.com/docs/caching/runtime-cache).

Source posts can be up to the configured TTL old, including posts deleted or made private after they were fetched. There is no stale-on-error fallback after expiration and no permanent post archive. Disable caching if fresh visibility checks on every request are required.

For a manual purge, use Vercel's Runtime Cache controls. Entries are tagged `rip-x:x-timelines` and `rip-x:x-user:<lowercase-username>` for targeted server-side `getCache().expireTag(...)` invalidation if needed later. No public cache-reset endpoint is exposed. Next.js `revalidateTag` does not clear this cache. See the [Runtime Cache API](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package#getcache).

The lower-level `getUserTweets(userId, count)` helper remains uncached; the homepage uses the cached username helper.

## Deploy to Vercel

Use the existing [RIP-X Vercel project](https://vercel.com/sean-hs-projects-bdabc876/rip-x).

The complete rollout and removal runbook is in [DEPLOYMENT.md](./DEPLOYMENT.md). No migration runs automatically during build.

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
   - `DATABASE_URL`: pooled Neon connection for requests.
   - `DATABASE_URL_UNPOOLED`: direct Neon connection for migrations.
   - `BLOB_STORE_ID` and `BLOB_READ_WRITE_TOKEN`: the existing **public** `mosslings-blob` store. The token name starts with **BLOB**, not BLOG.
   - Keep Preview/Development on separate Neon branches. Blob objects use immutable `rip-x/hauntings/<memorial-id>/<attempt-id>.webp` paths in the shared store.
4. Keep **Fluid compute** enabled. The homepage already specifies a 120-second maximum duration for its sequential text/image generation. See [Vercel function duration](https://vercel.com/docs/functions/configuring-functions/duration).
5. Confirm the target database, then run `pnpm db:migrate` once with the intended Production `DATABASE_URL_UNPOOLED`. This creates the memorial table and its indexes; do not use `db push` or `migrate reset` on production.
6. Commit and push the application changes, migrations, new assets/source files, `package.json`, and `pnpm-lock.yaml` to `main`. The connected Vercel project will build a production deployment. If the commit is already deployed, redeploy after adding the environment variables; [environment changes only apply to new deployments](https://vercel.com/docs/environment-variables).
7. Smoke-test one consenting public username. Repeating it should reopen the saved grave without new text/image calls or a timeline fetch. After the profile cache expires, resolving the username can still call X. Test an opted-out submission separately: it must never appear in the graveyard.

Caching is not rate limiting: before broadly sharing the app, consider request limits and provider spending limits to protect the paid generation endpoints.

## Checks

```bash
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Unit tests use fake services and make no paid API calls. Repository integration and browser tests require an isolated local PostgreSQL database named `rip_x_test`, with this migration applied:

```bash
TEST_DATABASE_URL=postgresql://USER@127.0.0.1:PORT/rip_x_test pnpm test
TEST_DATABASE_URL=postgresql://USER@127.0.0.1:PORT/rip_x_test pnpm test:e2e
```

Install Playwright Chromium (`pnpm exec playwright install chromium`), or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to a local Chrome executable. Browser tests use port 3103, a separate `.next-e2e` output directory, fictional fixture records, and disabled X/OpenAI/Blob credentials. They reject nonlocal databases and remove only their fixture records afterwards. The usual developer server remains on 3003. Without `TEST_DATABASE_URL`, the database integration test is explicitly skipped.

A local build does not verify deployed credentials, Neon connectivity, Blob access mode, or the Vercel runtime cache.

## The graveyard

- One persistent memorial per stable X account ID, enforced by a unique database index.
- The homepage keeps the form visible and shows 12 recently published graves. `/graveyard` has name/username search and pages of 24.
- Clicking a stone opens an accessible dialog with last words, obituary, and illustrated haunting. `/graveyard/<id>` works directly and can be shared.
- The opt-out checkbox is unchecked by default and clearly explains public publication. Opted-out results use no database record or Blob upload. They are lost when the visitor leaves and do not remove an existing public grave.
- Concurrent public submissions are fenced by a three-minute lease. Only complete results become visible; failures can be retried. New generation is not triggered merely by browsing a grave.
- Source posts and personality portraits are never saved in Neon. The existing short-lived X cache still applies to opted-out requests.
- Six individual transparent headstone sprites and CSS fog form the scene; reduced-motion preferences stop the fog. Asset prompts and filenames are in [public/images/graveyard/PROMPTS.md](./public/images/graveyard/PROMPTS.md).
