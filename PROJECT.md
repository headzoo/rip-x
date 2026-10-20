# RIP-X Project Brief

## Overview

RIP-X is a Halloween experience for the Hackyard.tech hackathon. A visitor enters their X username, the site reads their 25 most recent public posts, and an OpenAI model imagines what remains after they are gone.

The result is three separate pieces of parchment, in order: imagined last words, a personalized fictional obituary, and a haunting. The haunting explains where the visitor's ghost ended up, how its personality manifests there, and what unfinished business keeps it around. It is separate from the obituary.

The product should feel less like a generic AI summary and more like a digital séance conducted through a person's public timeline.

## Hackathon Fit

The Hackyard prompt asks for something that “haunts” and creeps into something real. RIP-X starts with something real and personal—the visitor's X history—and turns it into a supernatural artifact.

The personalized writing is the heart of the project, but the strongest version should also leave a small, tangible haunting behind. Within a one-week solo scope, the best candidates are browser-level effects that require no invasive permissions:

- The page title, favicon, cursor, or background subtly changes after the story is generated.
- The haunting remembers the visitor in local browser storage and behaves differently when they return.
- The visitor can intentionally download their obituary or a haunted text file as a keepsake.
- A clearly opt-in stretch feature could create a calendar event marking the beginning of the haunting.

One polished, reliable “it followed me home” mechanic is better than several unfinished integrations.

## Core Experience

1. **Invitation** — The homepage presents one prominent X username field inside a strongly Halloween-themed interface.
2. **Retrieval** — The server resolves the username and downloads up to 25 of the account's latest public posts through X API v2.
3. **Reading the remains** — A private analysis infers temperament, habits of mind, social style, contradictions, and humor, without passing individual post topics or quotations to the writer.
4. **Generation** — OpenAI produces structured last words, an obituary, and a haunting based only on the personality portrait and display name, then turns the haunting into an original ghost scene.
5. **Reveal** — Once all three pieces and the apparition are ready, an accessible dialog opens the three parchments: last words first, obituary second, and an illustrated haunting third. The username form remains at the top of the homepage.
6. **Aftermath** — Unless the visitor checks the explicit opt-out, the complete memorial becomes one persistent headstone in the shared graveyard. The homepage shows recent graves; `/graveyard` supports browsing and search; each saved memorial has a direct URL. No ghost neighbors, interactions, or social simulation.

The reveal should be paced theatrically. While the request is processing, six translucent ghosts, about 150px tall, drift independently around the viewport. A shared 12-frame sprite sheet animates their billowing gowns and mouths opening to moan. They fade away when the request completes or fails. The effect does not intercept clicks or screen-reader navigation, and reduced-motion preferences show still apparitions. It does not add any artificial delay to the request.

## Generated Result

The writer returns a single structured result with three required fields:

1. **Last words** — A short, witty, invented final utterance in the subject's voice. It is not a quote from their posts or a report of their real final words.
2. **Obituary** — A headline, epitaph, three paragraphs of comic remembrance, and a closing survivor roll call beginning “They were survived by…”. Its very first prose sentence names the person and announces a specific, absurd fictional cause of death driven by their personality. The remaining prose explores their human contradictions. The closing line includes invented pets and houseplants whose comic reactions reflect that personality, ending on a punchline. It contains no ghost activity, afterlife scene, or haunting location.
3. **Haunting** — A specific imagined location, an AI-generated image showing the ghost haunting it, two paragraphs explaining the haunting, and a sentence of unfinished business. All supernatural activity belongs here.

Each parchment has its own jokes. They should feel like the same person without repeating the last words, recycling paragraphs, or referencing individual recent posts.

The best output will combine accurate recognition with one surprising supernatural leap. It should feel personal enough that the visitor recognizes themselves, but imaginative enough that it is clearly a Halloween fiction.

## Tone and Design Direction

The desired tone is eerie, theatrical, intimate, and darkly funny. It should not feel like a cheerful Halloween template or a conventional social analytics dashboard.

Useful visual qualities include:

- Near-black surfaces with bone, tarnished metal, phosphor, or oxidized red accents.
- Typography that pairs an expressive horror display face with highly readable body text.
- Subtle smoke, scanlines, candlelight, signal noise, scratches, or spectral bloom.
- Deliberate motion: flicker, delayed reveals, text appearing in measured fragments, and environmental changes after generation.
- Familiar interface elements made uncanny without sacrificing usability.

The three current visual explorations—Victorian séance, analog dead channel, and possessed operating system—are all viable. The possessed OS and dead-channel directions most directly support the hackathon's “haunts something real” language, while the séance direction provides the strongest premium storytelling atmosphere.

## Product Boundaries

The site is making fiction about living people. That fact needs to remain clear without draining the fun from the experience.

- Label the result as an AI-generated fictional obituary or Halloween story.
- Do not imply that the account owner has actually died, is in danger, or has committed real crimes or misconduct.
- A cartoonishly absurd, non-graphic fictional demise opens the obituary. It must be a personality-based joke, never a claim about an actual death or medical condition.
- Avoid cruel conclusions about health, relationships, identity, trauma, or other sensitive traits.
- Base recognizable details on the supplied posts, but clearly separate grounded observations from supernatural invention.
- Infer personality without quoting, paraphrasing, or alluding to individual posts in the generated result.
- Do not analyze protected accounts or attempt to bypass account privacy.
- Keep source posts server-side. The explicitly approved exception to transient processing is a short-lived X profile/timeline cache (one hour by default) to avoid repeated API charges. Do not build a permanent archive of source posts or expose cached raw timelines to the browser.

The homepage language says “your X username,” but technically an app-only token can look up other public accounts. If the experience permits arbitrary usernames, the fictional framing and anti-harassment guardrails become even more important.

## Technical Shape

The application is a Next.js App Router project hosted on Vercel.

### Server-side flow

1. Validate and normalize the username.
2. Resolve the public account's stable X ID using the independently cached profile. For public requests, reuse a READY memorial or acquire a unique generation claim.
3. For new or opted-out results, read the cached profile/timeline pair bound to the resolved ID, requested count, and TTL. On a miss or expiration, fetch up to 25 recent posts and cache the successful response.
4. Convert the raw API response into a compact analysis payload.
5. Ask OpenAI for a private, structured personality portrait: temperament, habits of mind, social style, a comic contradiction, and an endearing quality. Strip away individual post topics, quotes, anecdotes, and identifying details.
6. Make a separate OpenAI request with only that portrait and the display name. The writer has no source posts or previous response history; it generates all three pieces together with a strict schema, keeping the haunting outside the obituary.
7. Validate both text responses, then generate a compressed landscape WebP from the haunting's location, activity, and unfinished business using the configured image model. The scene depicts a personalized but non-identifiable ghost rather than claiming to reproduce the account owner's appearance.
8. Return the three-part memorial and apparition to the browser only when complete, and discard the intermediate portrait after generation. Both text requests use the configured text model and disable response storage.

For public requests, resolve the account identity first and acquire a database
claim keyed by stable X ID. Reuse a completed memorial without fetching posts or
calling AI. For new results, store the artwork in the shared Vercel Blob store
under the RIP-X prefix, then atomically publish the complete record in Neon.
Opted-out requests skip all database claims and Blob uploads and return a transient
image/result instead. Expiring claims and token-checked updates prevent duplicate
graves and late-worker overwrites. See `DEPLOYMENT.md` for rollout and removal.

X and OpenAI credentials must remain in server-only modules. The browser should never receive either secret or the full raw prompt.

Expected environment variables:

```bash
X_API_BEARER_TOKEN=
X_CACHE_TTL_SECONDS=3600
OPENAI_API_KEY=
OPENAI_MODEL=
OPENAI_IMAGE_MODEL=
DATABASE_URL=
DATABASE_URL_UNPOOLED=
BLOB_STORE_ID=
BLOB_READ_WRITE_TOKEN=
```

Keeping the text and image models configurable will be useful during the hackathon when balancing speed, cost, writing quality, and visual style.

### X data cache

Use `getCache()` from `@vercel/functions`, with no separate cache credentials.
Profiles have an independent namespace; timelines include the profile and source
posts. Both expire after one hour by default; `X_CACHE_TTL_SECONDS=0` disables
caching. Normalize case and a leading `@` so username variants share an entry.
Timeline keys include the requested count, TTL, and resolved stable X ID.

This cache survives Vercel deployments, is regional, and is separate for Preview and Production. Locally, the SDK uses process memory. It is an optimization, not durable storage: cache failures fall back to X, and only successful complete responses are stored. Concurrent identical misses are coalesced within each server process, not across instances.

The tradeoff is that source data and account visibility can be up to the configured TTL old. Do not serve expired data during an X outage. Generated text, personality portraits, and haunting images are not stored in this cache. Completed public memorials and image references are instead durable in Neon, with images in Vercel Blob; only new or opted-out memorials perform fresh AI generation.

### Post selection

The X endpoint can return posts, replies, and reposts. These carry different signals:

- Original posts are the strongest evidence of voice and interests.
- Replies provide conversational tone and recurring relationships.
- Reposts reveal interests but should not be presented as the visitor's own words.

The analysis step should retain this distinction instead of treating every item as an equivalent authored statement.

### AI response contract

The OpenAI request should return structured JSON matching a defined TypeScript schema. This makes it possible to design the reveal intentionally, retry malformed responses, moderate individual fields, and change presentation without reparsing prose.

The prompt should ask the model to:

- Infer personality from recurring behavior across posts, rather than turning recent topics into jokes. Keep a sparse portrait when the evidence is thin.
- Write last words, an affectionate comic eulogy, and a separate haunting based on that personality. Keep ghost activity and afterlife scenes in the haunting and avoid repeating jokes across the pieces.
- Open the first obituary paragraph with the comic cause of death immediately; a joke in the headline alone is not enough. Keep the imagined last words compatible with that demise.
- Avoid declaring invented real-world facts as true.
- Make the ghost story vivid and specific.
- Keep the tone spooky and playful rather than malicious.
- Avoid quoting sensitive or private-looking material unnecessarily.
- Produce a useful result even when the timeline is sparse or mundane.

## Failure States

Failure handling is part of the fiction, but clarity comes first.

- Invalid or missing account: “No spirit answers to that name.”
- Protected account: explain that the séance cannot cross a private boundary.
- Too few posts: generate a shorter “faint signal” result or ask for another account.
- X rate limit or outage: explain that the signal has gone quiet and invite a retry.
- OpenAI failure: a retry can reuse the X profile/timeline cache while it remains within its TTL; do not persist the intermediate personality portrait.
- Moderation refusal: return a tasteful generic haunted profile instead of exposing internal errors.

The UI can phrase these states thematically, but should still tell the visitor what happened and what they can do next.

## MVP Scope

The hackathon MVP is complete when a visitor can:

1. Enter a valid public X username.
2. Trigger retrieval of the account's latest 25 posts.
3. Receive three structured AI-generated pieces: last words, obituary, and haunting.
4. Read the result in a polished Halloween interface on desktop and mobile.
5. Browse a sprite-based graveyard with CSS fog and open saved memorials.
6. Opt out of publication before submission without changing an existing grave.

The approved graveyard expansion uses Prisma/Neon and Vercel Blob for saved
generations, but does not require visitor accounts, social login, or social ghost
interactions. Publication is the disclosed default; the opt-out is unchecked.
This choice does not verify ownership of an entered username. All generated
content remains explicitly fictional, with operator-only takedowns.

## Success Criteria

RIP-X succeeds if:

- The output is recognizably personal after reading only the result.
- The spooky fiction feels specific rather than template-generated.
- The complete flow works reliably with a public X account.
- The source posts and API credentials remain private to the server.
- The experience contains one memorable moment that makes the visitor feel the site has crossed from a form into their browser.
- The concept can be understood in a short hackathon demo without a long explanation.

## Immediate Next Steps

1. Verify Neon environment bindings and the existing Blob store's public access mode.
2. Apply the reviewed Prisma migration to the intended database, then deploy.
3. Smoke-test public reuse and opt-out with consenting accounts in Vercel.
4. Configure provider spending limits and abuse protection before public promotion.
5. Rehearse the graveyard, direct-link, and mobile demo flows.
