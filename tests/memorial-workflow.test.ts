import { test } from "node:test";
import assert from "node:assert/strict";
import { createMemorialWorkflow } from "../src/lib/memorial-workflow";
import { parseGraveyardQuery, headstoneForAccount, normalizeUsername } from "../src/lib/graveyard-policy";
import { memorial, artwork, saved } from "./fixtures/memorial";

function setup() {
  const calls: string[] = [];
  const deps: Parameters<typeof createMemorialWorkflow>[0] = {
    resolveIdentity: async (username) => { calls.push(`identity:${username}`); return { id: "123", username, name: "Morgan" }; },
    readPosts: async () => { calls.push("posts"); return [{ text: "Test source." }]; },
    generate: async () => { calls.push("generate"); return memorial; },
    illustrate: async () => { calls.push("illustrate"); return artwork; },
    repository: {
      claim: async () => { calls.push("claim"); return { kind: "claimed", claim: { id: saved.id, token: saved.id } }; },
      publish: async () => { calls.push("publish"); return saved; },
      fail: async () => { calls.push("fail"); },
    },
    storeArtwork: async () => { calls.push("store"); return { artwork, pathname: "rip-x/test.webp" }; },
    discardArtwork: async () => { calls.push("discard"); },
  };
  return { deps, calls };
}

test("public flow publishes only after text, image, and durable upload", async () => {
  const { deps, calls } = setup();
  assert.equal((await createMemorialWorkflow(deps)(" @Morgan_Test ", false)).id, saved.id);
  assert.deepEqual(calls, ["identity:morgan_test", "claim", "posts", "generate", "illustrate", "store", "publish"]);
});
test("opt-out performs no claim, lookup, save, Blob upload, or deletion", async () => {
  const { deps, calls } = setup();
  const result = await createMemorialWorkflow(deps)("Morgan_Test", true);
  assert.equal(result.id, null);
  assert.deepEqual(calls, ["identity:morgan_test", "posts", "generate", "illustrate"]);
});
test("saved grave is reused without fetching posts or generating anything", async () => {
  const { deps, calls } = setup();
  deps.repository.claim = async () => ({ kind: "ready", value: saved });
  assert.deepEqual(await createMemorialWorkflow(deps)("morgan_test", false), saved);
  assert.deepEqual(calls, ["identity:morgan_test"]);
});
for (const kind of ["busy", "hidden"] as const) test(`${kind} claims do not generate`, async () => {
  const { deps, calls } = setup();
  deps.repository.claim = async () => ({ kind });
  await assert.rejects(createMemorialWorkflow(deps)("morgan_test", false), { code: kind });
  assert.deepEqual(calls, ["identity:morgan_test"]);
});
test("failure before publishing releases the claim without a visible grave", async () => {
  const { deps, calls } = setup();
  deps.illustrate = async () => { throw new Error("image offline"); };
  await assert.rejects(createMemorialWorkflow(deps)("morgan_test", false), /image offline/);
  assert.ok(calls.includes("fail"));
  assert.ok(!calls.includes("store") && !calls.includes("publish"));
});
test("empty posts release claim and skip AI", async () => {
  const { deps, calls } = setup();
  deps.readPosts = async () => [{ text: " " }];
  await assert.rejects(createMemorialWorkflow(deps)("morgan_test", false), { code: "no_posts" });
  assert.ok(calls.includes("fail"));
  assert.ok(!calls.includes("generate"));
});
test("lost lease deletes only that attempt's unreferenced upload", async () => {
  const { deps, calls } = setup();
  deps.repository.publish = async () => null;
  await assert.rejects(createMemorialWorkflow(deps)("morgan_test", false), { code: "lease_lost" });
  assert.ok(calls.includes("discard") && calls.includes("fail"));
});
test("uncertain database commit preserves possibly referenced artwork", async () => {
  const { deps, calls } = setup();
  deps.repository.publish = async () => { throw new Error("connection lost after commit"); };
  await assert.rejects(createMemorialWorkflow(deps)("morgan_test", false));
  assert.ok(!calls.includes("discard"));
});
test("invalid usernames fail before external services", async () => {
  const { deps, calls } = setup();
  await assert.rejects(createMemorialWorkflow(deps)("not a username", false));
  assert.deepEqual(calls, []);
});
test("bounded pagination and deterministic sprite selection", () => {
  assert.deepEqual(parseGraveyardQuery(new URLSearchParams("page=-4&compact=1&q=%40Morgan")), { query: "Morgan", page: 1, limit: 12 });
  assert.equal(parseGraveyardQuery(new URLSearchParams("page=999999")).page, 10000);
  assert.equal(normalizeUsername(" @MORGAN "), "morgan");
  assert.equal(headstoneForAccount("123"), headstoneForAccount("123"));
  assert.ok(headstoneForAccount("123") < 6);
});
