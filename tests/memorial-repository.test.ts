import { test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createMemorialRepository } from "../src/lib/memorial-repository";
import { memorial, artwork } from "./fixtures/memorial";

const testUrl = process.env.TEST_DATABASE_URL;

test("real database: unique claims, reclaim, fencing, reuse, and hidden graves", { skip: !testUrl }, async () => {
  const url = new URL(testUrl!);
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname) && url.pathname === "/rip_x_test",
    "Integration tests are restricted to a local rip_x_test database.");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: testUrl }) });
  const xUserId = `${Date.now()}`;
  let time = new Date();
  const repository = createMemorialRepository(() => db, () => time);
  const identity = { id: xUserId, username: "fixture_test", name: "Fixture Test" };
  try {
    const claims = await Promise.all(Array.from({ length: 8 }, () => repository.claim(identity)));
    assert.equal(claims.filter((r) => r.kind === "claimed").length, 1);
    assert.equal(claims.filter((r) => r.kind === "busy").length, 7);
    const first = claims.find((r) => r.kind === "claimed")!;
    if (first.kind !== "claimed") throw new Error("No initial claim");
    time = new Date(time.getTime() + 181_000);
    const retry = await repository.claim(identity);
    assert.equal(retry.kind, "claimed");
    if (retry.kind !== "claimed") throw new Error("No reclaimed lease");
    const content = { memorial, hauntingArtwork: artwork, artworkPath: "rip-x/test.webp", postsAnalyzed: 25 };
    assert.equal(await repository.publish(first.claim, content), null);
    await repository.fail(first.claim);
    assert.equal((await db.memorial.findUniqueOrThrow({ where: { xUserId } })).claimToken, retry.claim.token);
    assert.ok(await repository.publish(retry.claim, content));
    assert.equal((await repository.claim({ ...identity, username: "renamed_test" })).kind, "ready");
    assert.equal(await db.memorial.count({ where: { xUserId } }), 1);
    // A failed claim is retryable immediately, without allocating a second grave.
    await db.memorial.update({ where: { xUserId }, data: { status: "FAILED" } });
    const failedRetry = await repository.claim(identity);
    assert.equal(failedRetry.kind, "claimed");
    if (failedRetry.kind !== "claimed") throw new Error("No failed retry");
    await repository.fail(failedRetry.claim);
    assert.equal((await db.memorial.findUniqueOrThrow({ where: { xUserId } })).status, "FAILED");
    await db.memorial.update({ where: { xUserId }, data: { status: "HIDDEN" } });
    assert.equal((await repository.claim(identity)).kind, "hidden");
  } finally {
    await db.memorial.deleteMany({ where: { xUserId } });
    await db.$disconnect();
  }
});
