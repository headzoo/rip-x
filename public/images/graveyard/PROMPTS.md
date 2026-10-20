# Graveyard artwork

Created with the built-in image generation tool, October 20, 2026. Individual
headstones were generated separately (not cut from a sheet), then resized and
encoded as 512×512 WebP with Sharp, preserving alpha. The background is 1800×1200.
CSS desaturates the stones, adds names and hover lighting, and animates the fog.

## Headstone prompt template

Use case: stylized-concept. Asset type: individual transparent 2D cemetery sprite
for a gothic web scene. Create ONE **[subject]**. A rich hand-painted realistic
Victorian game cutout, near frontal view slightly elevated to show a little base
depth. Weathered gray limestone with muted olive moss, soft cold moonlight from
upper left and faint warm candle bounce. Entire object and small earth/grass base
visible, centered, portrait silhouette on square canvas, occupying about 80%
canvas height and 65% width, generous clear margin. Broad flat blank dark stone
panel at the center for HTML names to be added later. No writing, no letters, no
numbers, no RIP, no other objects, no scene, no frame, no watermark. Genuine
transparent background and alpha, NOT a checkerboard illustration. Clean isolated
edges. This is one cohesive sprite, no spritesheet.

Subjects and final files:

- `headstone-arch.webp`: a broad rounded arch gravestone with subtly carved crescent at top
- `headstone-gothic.webp`: a broad pointed gothic arch gravestone with worn carved border
- `headstone-broken.webp`: a broad rectangular grave marker with a broken uneven upper corner
- `headstone-cross.webp`: a small stone cross mounted atop a broad rectangular inscribed-panel gravestone
- `headstone-urn.webp`: a broad rectangular gravestone with a small carved funerary urn at its top
- `headstone-scroll.webp`: a broad weathered Victorian gravestone with rolled scroll shoulders

## Clearing prompt — `clearing.webp`

Use case: stylized-concept. Asset type: wide atmospheric background for an
interactive Victorian graveyard website. Rich hand-painted realistic gothic game
environment, very dark moonlit empty cemetery clearing, wet mossy earth and
sparse brown grasses in foreground, distant wrought iron fence across back, bare
gnarled trees framing extreme sides, tiny ruined chapel at far back, muted slate
green charcoal and antique gold palette, faint moonlight from upper left, mist
low across distant ground only. Center and lower two thirds open empty ground
where separate headstone sprites will be placed. Landscape composition. No
foreground gravestones, no people, no writing, no lettering, no UI, no watermark.
Detailed edges, unobtrusive center, haunted and beautiful rather than cartoon.

## Ground prompt — `ground.webp` (768×768)

Use case: stylized-concept. Asset type: seamless square ground texture for a
Victorian graveyard 2D game website. Top-down view of dark damp earth, sparse
muted olive moss and very short grass, tiny worn stones, fallen dry leaves.
Rich hand-painted realism, low contrast, extremely dark charcoal brown and green
tones under diffuse cold moonlight. Even detail and even lighting across entire
image, seamlessly tileable in all directions, no horizon, no sky, no trees,
no gravestones, no large objects, no lettering, no border. This is a subtle
repeating ground layer beneath separate tombstone sprites.
