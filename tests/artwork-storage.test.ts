import { test } from "node:test";
import assert from "node:assert/strict";
import { storeHauntingArtwork, discardUnpublishedArtwork } from "../src/lib/artwork-storage";
import { artwork, saved } from "./fixtures/memorial";

test("storage rejects non-generated and empty artwork before accessing Blob", async () => {
  const claim = { id: saved.id, token: saved.id };
  await assert.rejects(storeHauntingArtwork(artwork, claim), /Expected generated WebP/);
  await assert.rejects(storeHauntingArtwork({ ...artwork, src: "data:image/webp;base64,=" }, claim), /Invalid artwork size/);
});

test("cleanup refuses paths outside an exact RIP-X attempt namespace", async () => {
  for (const pathname of ["mosslings/portrait.webp", "rip-x/", "../rip-x/hauntings/other.webp"]) {
    await assert.rejects(discardUnpublishedArtwork({ artwork, pathname }), /Refusing to delete/);
  }
});
