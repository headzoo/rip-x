import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Reuse Next's image-processing dependency; this is an offline asset utility.
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const source = fileURLToPath(new URL("../docs/assets/summoning-ghost-sprites.png", import.meta.url));
const output = fileURLToPath(new URL("../public/images/summoning-ghost-sprites-v2.webp", import.meta.url));
const columns = 4;
const rows = 3;
const frameWidth = 384;
const frameHeight = 440;
const fringe = 12;
const padding = 16;
const { data, info: { width, height } } = await sharp(source)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const pixels = width * height;
const owners = new Int32Array(pixels);
const queue = new Int32Array(pixels);
const components = [];

function neighbors(pixel) {
  const x = pixel % width;
  return [
    x > 0 ? pixel - 1 : -1,
    x < width - 1 ? pixel + 1 : -1,
    pixel >= width ? pixel - width : -1,
    pixel < pixels - width ? pixel + width : -1,
  ];
}

// The generated layout is only approximate: the middle row's gowns cross
// nominal column boundaries. Locate each actual silhouette before cutting.
for (let start = 0; start < pixels; start++) {
  if (owners[start] || data[start * 4 + 3] < 16) continue;
  const component = {
    id: components.length + 1,
    left: width, top: height, right: 0, bottom: 0, size: 0,
  };
  let head = 0;
  let tail = 1;
  queue[0] = start;
  owners[start] = component.id;
  while (head < tail) {
    const pixel = queue[head++];
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    component.left = Math.min(component.left, x);
    component.right = Math.max(component.right, x);
    component.top = Math.min(component.top, y);
    component.bottom = Math.max(component.bottom, y);
    for (const next of neighbors(pixel)) {
      if (next < 0 || owners[next] || data[next * 4 + 3] < 16) continue;
      owners[next] = component.id;
      queue[tail++] = next;
    }
  }
  component.size = tail;
  components.push(component);
}

const ghosts = components
  .filter(({ size }) => size > 10_000)
  .sort((a, b) =>
    Math.floor(a.top / (height / rows)) - Math.floor(b.top / (height / rows))
    || a.left - b.left,
  );
assert.equal(ghosts.length, columns * rows, "Expected twelve separate ghosts");

// Expand ownership into the faint gauze edges without changing their alpha.
// Every source pixel belongs to at most one ghost, even between close gowns.
const ghostIds = new Set(ghosts.map(({ id }) => id));
const distance = new Uint8Array(pixels).fill(255);
let head = 0;
let tail = 0;
for (let pixel = 0; pixel < pixels; pixel++) {
  if (ghostIds.has(owners[pixel])) {
    distance[pixel] = 0;
    queue[tail++] = pixel;
  } else {
    owners[pixel] = 0;
  }
}
while (head < tail) {
  const pixel = queue[head++];
  if (distance[pixel] === fringe) continue;
  for (const next of neighbors(pixel)) {
    if (next < 0 || owners[next]) continue;
    owners[next] = owners[pixel];
    distance[next] = distance[pixel] + 1;
    queue[tail++] = next;
  }
}

const frames = [];
for (const [index, ghost] of ghosts.entries()) {
  // Align the forehead rather than the bounding box, whose width changes
  // with the fabric. This keeps the head still as the hem and sleeves move.
  let headX = 0;
  let headPixels = 0;
  for (let y = ghost.top + 12; y < ghost.top + 36; y++) {
    for (let x = ghost.left; x <= ghost.right; x++) {
      const pixel = y * width + x;
      if (owners[pixel] === ghost.id && data[pixel * 4 + 3] >= 128) {
        headX += x;
        headPixels++;
      }
    }
  }
  assert.ok(headPixels > 0, `Missing head in frame ${index + 1}`);
  const offsetX = 148 - Math.round(headX / headPixels);
  const offsetY = 32 - ghost.top;
  const frame = Buffer.alloc(frameWidth * frameHeight * 4);
  for (let y = Math.max(0, ghost.top - fringe); y <= Math.min(height - 1, ghost.bottom + fringe); y++) {
    for (let x = Math.max(0, ghost.left - fringe); x <= Math.min(width - 1, ghost.right + fringe); x++) {
      const pixel = y * width + x;
      if (owners[pixel] !== ghost.id || data[pixel * 4 + 3] === 0) continue;
      const targetX = x + offsetX;
      const targetY = y + offsetY;
      assert.ok(
        targetX >= padding && targetX < frameWidth - padding
        && targetY >= padding && targetY < frameHeight - padding,
        `Frame ${index + 1} must retain a transparent ${padding}px border`,
      );
      data.copy(frame, (targetY * frameWidth + targetX) * 4, pixel * 4, pixel * 4 + 4);
    }
  }
  frames.push({
    input: frame,
    raw: { width: frameWidth, height: frameHeight, channels: 4 },
    left: index % columns * frameWidth,
    top: Math.floor(index / columns) * frameHeight,
  });
}

const result = await sharp({
  create: {
    width: frameWidth * columns,
    height: frameHeight * rows,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(frames)
  .webp({ quality: 85, alphaQuality: 100, effort: 6 })
  .toFile(output);
console.log(`Packed ${frames.length} isolated ${frameWidth}×${frameHeight} frames with ≥${padding}px transparent borders.`);
console.log(`${output} (${result.size} bytes)`);
