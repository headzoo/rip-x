# Graveyard rollout and operations

## Resources and boundaries

- Vercel project: `rip-x`, team `sean-hs-projects-bdabc876`.
- Neon integration: `neon-yellow-kite`. Prisma 7 uses `DATABASE_URL` for runtime
  pooling and `DATABASE_URL_UNPOOLED` for migrations.
- Existing Blob store: `mosslings-blob`. Do not create a replacement or change
  Mosslings files. RIP-X writes only
  `rip-x/hauntings/<memorial UUID>/<generation-attempt UUID>.webp`.
- This implementation requires a **public** Blob store. Verify the existing
  store's access mode in Vercel Storage before deployment. If it is private,
  stop: it needs an authenticated image-serving route rather than public URLs.
- `BLOB_READ_WRITE_TOKEN` is the correct spelling. `BLOB_STORE_ID` is retained for
  Vercel's store binding; the SDK can authenticate with the read/write token.
  Never expose either token or database credentials through `NEXT_PUBLIC_*`.

This implementation does not migrate Neon, deploy to Vercel, or upload a test
image automatically. The build only generates the Prisma client and builds Next.

## First rollout

1. Confirm the Neon integration is connected to the RIP-X project. In Vercel's
   environment settings confirm both database URLs refer to the intended branch
   and database. Use separate branches for Production and Preview/Development.
   Do not print the URLs or check them into Git.
2. Connect the existing Blob store to RIP-X, preserving its existing consumers.
   Confirm it is public and that `BLOB_STORE_ID` / `BLOB_READ_WRITE_TOKEN` are
   available in each intended deployment environment.
3. Retain the existing X and OpenAI variables. Set Node 22.x, install command
   `pnpm install --frozen-lockfile`, build command `pnpm build`, and default
   Next.js output. Keep Fluid compute and the 120-second generation allowance.
4. Install dependencies and run `pnpm db:generate`. Review the committed
   `prisma/migrations/20261020000000_graveyard/migration.sql`.
5. In a trusted shell with the intended environment loaded, verify the database
   target and run `pnpm db:migrate` (`prisma migrate deploy`). Explicit shell
   variables take precedence over `.env.local`; the CLI otherwise loads
   `.env.local` then `.env`. Do not accidentally run against a development or
   production branch just because its URL was left in that file.
6. Commit/push the code, migration, generated scene assets, and lockfile.
   Do not commit `.env.local`, generated Prisma client files, or test output.
   Redeploy if environment variables changed after an earlier deployment.
7. In the deployed app, test one consenting account, then repeat it. Check one
   READY row, one durable image in the RIP-X prefix, no second AI generation,
   a working direct memorial URL, and an entry on both graveyard surfaces.
8. Test the opt-out checkbox with a consenting account: three parchments should
   display without a new row or Blob object. The UI must say it was not saved.
   Check mobile, empty/search states, Escape/close, and keyboard navigation.

If the migration has not been applied, the form can still produce an opted-out
transient result, but public generation and listing will report an error. The
graveyard never substitutes fake public graves when storage is unavailable.

## Stored data and concurrency

`rip_x_memorials` stores identity metadata, status/claim/lease, completed generated
content, public image URL/path/alt/dimensions, analyzed-post count, stable sprite
variant, and timestamps. It does **not** store source posts, the personality
analysis, or an identifiable portrait of the account owner.

`GENERATING` and `FAILED` records are not public. A unique `xUserId` prevents
duplicate graves. An atomic conditional update assigns a three-minute lease;
the completion update requires its exact claim token and unexpired lease.
An old worker cannot publish over a reclaimed request. `READY` is reusable,
`HIDDEN` prevents automatic republication.

There is no arbitrary regeneration API. The first successful public result is a
snapshot; a changed X display name or handle does not rewrite its content.
An identity/profile lookup is still required to map a submitted handle to the
stable account ID. Cached identity/visibility can be up to the configured X TTL
old. An opt-out is per submission, not proof of account ownership or a takedown.

If generation fails, its claim is marked FAILED, or expires if the process dies.
Attempt-specific immutable image paths prevent concurrent workers overwriting
each other's files. When a publish is definitely rejected, only that attempt's
upload is deleted. When a database commit is uncertain, the image is deliberately
retained to avoid deleting artwork referenced by a committed row.

## Removing a memorial (operator only)

There is deliberately no public unauthenticated delete endpoint. A visitor who
knows a username is not necessarily its owner. Handle takedown requests manually
and verify the exact account/record before changing it.

1. Use the trusted Neon console or `pnpm db:studio` with the correct environment.
   Locate the row by stable X account ID; verify the username, display name, and
   memorial UUID. Record that row's exact artwork pathname/URL.
2. Set its status to `HIDDEN` and clear `claimToken` and `leaseExpiresAt`. Keep the
   identity row so subsequent public submissions cannot recreate the grave.
   Listing and detail reads filter to READY, use no shared response cache, and
   no longer expose this row. Previously opened pages are not remotely erased.
3. In the Blob dashboard delete **only** the image whose full pathname matches
   that row and starts with `rip-x/hauntings/<that exact UUID>/`. Never delete a
   folder, the shared store, or any Mosslings assets. Public Blob/CDN caching or
   third-party copies may outlive removal; confirm the URL becomes unavailable.
4. Clear the row's generated `content` and image URL/path/alt/dimensions if the
   request requires content removal. Keep `status=HIDDEN` and its identity.
5. Verify the detail endpoint returns 404 and search no longer shows it. If
   needed, invalidate the X cache's `rip-x:x-user:<lowercase-username>` tag in
   both profile and timeline namespaces.

For orphan maintenance, compare only RIP-X paths against this application's
artwork references. Do not remove recent attempts or anything belonging to a
different environment's database. No automatic cleanup job is installed.

## Rollback and costs

The migration is additive. Roll back the application deployment without dropping
the memorial table or Blob objects. Never run `prisma migrate reset` in production.
Keep database backups and confirm the correct Neon branch before operations.

Persistent graves avoid repeated generation, but opt-out and first-time accounts
can still incur paid X/OpenAI calls. This feature is not a rate limiter. Configure
provider spending limits and Vercel abuse protection before broad promotion.
There is no identity verification, automatic moderation queue, or account-owner
self-service removal in this increment.
