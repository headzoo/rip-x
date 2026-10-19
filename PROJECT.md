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
4. **Generation** — OpenAI produces structured last words, an obituary, and a haunting based only on the personality portrait and display name.
5. **Reveal** — Once all three pieces are ready, the username form fades out. Three separate parchments appear vertically: last words first, obituary second, haunting third. Focus and scrolling move to the first parchment.
6. **Aftermath** — A restrained browser effect or optional downloadable artifact makes the experience feel as though it has escaped the result card.

The reveal should be paced theatrically. A short “reading the remains” state is more appropriate than an ordinary loading spinner, as long as it does not make the real wait feel artificially long.

## Generated Result

The writer returns a single structured result with three required fields:

1. **Last words** — A short, witty, invented final utterance in the subject's voice. It is not a quote from their posts or a report of their real final words.
2. **Obituary** — A headline, epitaph, three paragraphs of comic remembrance, and a closing line. Its very first prose sentence names the person and announces a specific, absurd fictional cause of death driven by their personality. The remaining prose explores their human contradictions; it contains no ghost activity, afterlife scene, or haunting location.
3. **Haunting** — A specific imagined location, two paragraphs showing why the ghost is there and how it haunts, and a sentence of unfinished business. All supernatural activity belongs here.

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
- Do not persist the source posts by default. Process them server-side and discard them after generation unless storage becomes an explicit product requirement.

The homepage language says “your X username,” but technically an app-only token can look up other public accounts. If the experience permits arbitrary usernames, the fictional framing and anti-harassment guardrails become even more important.

## Technical Shape

The application is a Next.js App Router project hosted on Vercel.

### Server-side flow

1. Validate and normalize the username.
2. Resolve it to an X user ID.
3. Fetch 25 recent posts for the current obituary flow (the broader concept targets 100).
4. Convert the raw API response into a compact analysis payload.
5. Ask OpenAI for a private, structured personality portrait: temperament, habits of mind, social style, a comic contradiction, and an endearing quality. Strip away individual post topics, quotes, anecdotes, and identifying details.
6. Make a separate OpenAI request with only that portrait and the display name. The writer has no source posts or previous response history; it generates all three pieces together with a strict schema, keeping the haunting outside the obituary.
7. Validate both responses. Return the three-part memorial to the browser only when complete, and discard the intermediate portrait after generation. Both requests use the configured text model and disable response storage.

X and OpenAI credentials must remain in server-only modules. The browser should never receive either secret or the full raw prompt.

Expected environment variables:

```bash
X_API_BEARER_TOKEN=
OPENAI_API_KEY=
OPENAI_MODEL=
OPENAI_IMAGE_MODEL=
```

Keeping the text and image models configurable will be useful during the hackathon when balancing speed, cost, writing quality, and visual style.

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
- OpenAI failure: preserve the fetched state only in memory long enough for a safe retry.
- Moderation refusal: return a tasteful generic haunted profile instead of exposing internal errors.

The UI can phrase these states thematically, but should still tell the visitor what happened and what they can do next.

## MVP Scope

The hackathon MVP is complete when a visitor can:

1. Enter a valid public X username.
2. Trigger retrieval of the account's latest 25 posts.
3. Receive three structured AI-generated pieces: last words, obituary, and haunting.
4. Read the result in a polished Halloween interface on desktop and mobile.
5. Experience one small browser-level haunting after the reveal.

The MVP does not require accounts, a database, saved generations, social login, or a large sharing system.

## Success Criteria

RIP-X succeeds if:

- The output is recognizably personal after reading only the result.
- The spooky fiction feels specific rather than template-generated.
- The complete flow works reliably with a public X account.
- The source posts and API credentials remain private to the server.
- The experience contains one memorable moment that makes the visitor feel the site has crossed from a form into their browser.
- The concept can be understood in a short hackathon demo without a long explanation.

## Immediate Next Steps

1. Choose one of the three homepage visual directions as the production design system.
2. Consider expanding the current 25-post retrieval to the original 100-post target, with clear post-type handling.
3. Add the OpenAI server dependency, environment configuration, and structured response schema.
4. Draft and test the obituary/ghost prompt against varied public timelines.
5. Build the staged generation and reveal experience.
6. Add one opt-in or browser-local haunting mechanic and rehearse the end-to-end demo.
