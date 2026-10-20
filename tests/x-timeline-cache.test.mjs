import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createCachedXTimelineReader,
  getXCacheTtlSeconds,
} from "../src/lib/x-timeline-cache.ts";

function timeline(username = "headzoo") {
  return {
    user: { id: "123", username, name: "Sean", protected: false },
    tweets: [
      {
        id: "456",
        text: "A public post.",
        createdAt: "2026-10-20T00:00:00.000Z",
        notePost: { text: "A full-length public post." },
      },
    ],
  };
}

function fixture() {
  const entries = new Map();
  const writes = [];
  const loads = [];
  const cache = {
    async get(key) {
      return entries.get(key) ?? null;
    },
    async set(key, value, options) {
      entries.set(key, structuredClone(value));
      writes.push({ key, options });
    },
  };
  const load = async (username, count) => {
    loads.push({ username, count });
    return timeline(username);
  };
  const options = { cache, getTtl: () => 3600, now: () => 1000 };
  const read = createCachedXTimelineReader(load, options);
  return { entries, writes, loads, cache, load, options, read };
}

test("reuses profile and posts across normalized username variants", async () => {
  const f = fixture();
  const first = await f.read(" @HeadZoo ", 25);
  assert.deepEqual(await f.read("HEADZOO", 25), first);
  assert.deepEqual(f.loads, [{ username: "headzoo", count: 25 }]);
  assert.equal(f.writes[0].options.ttl, 3600);
  assert.deepEqual(f.writes[0].options.tags, [
    "rip-x:x-timelines",
    "rip-x:x-user:headzoo",
  ]);
});

test("another reader can reuse the shared cache, without process-local state", async () => {
  const f = fixture();
  await f.read("headzoo", 25);
  const secondReader = createCachedXTimelineReader(f.load, f.options);
  assert.deepEqual(await secondReader("headzoo", 25), timeline());
  assert.equal(f.loads.length, 1);
});

test("usernames and requested post counts have separate cache entries", async () => {
  const f = fixture();
  await f.read("headzoo", 5);
  await f.read("headzoo", 25);
  await f.read("another_user", 25);
  await f.read("headzoo", 5);
  assert.equal(f.loads.length, 3);
  assert.equal(f.entries.size, 3);
});

test("expired entries are refreshed even if the cache still returns them", async () => {
  const f = fixture();
  let time = 1000;
  const read = createCachedXTimelineReader(f.load, {
    ...f.options,
    now: () => time,
  });
  await read("headzoo", 25);
  time += 3600 * 1000 - 1;
  await read("headzoo", 25);
  assert.equal(f.loads.length, 1);
  time += 1;
  await read("headzoo", 25);
  assert.equal(f.loads.length, 2);
});

test("changing TTL does not reuse an entry with the previous TTL", async () => {
  const f = fixture();
  let ttl = 3600;
  const read = createCachedXTimelineReader(f.load, {
    ...f.options,
    getTtl: () => ttl,
  });
  await read("headzoo", 25);
  ttl = 60;
  await read("headzoo", 25);
  assert.equal(f.loads.length, 2);
  assert.equal(f.writes[1].options.ttl, 60);
});

test("TTL zero bypasses all cache reads and writes", async () => {
  const f = fixture();
  const read = createCachedXTimelineReader(f.load, {
    ...f.options,
    getTtl: () => 0,
    cache: {
      async get() {
        assert.fail("disabled cache was read");
      },
      async set() {
        assert.fail("disabled cache was written");
      },
    },
  });
  await read("headzoo", 25);
  await read("headzoo", 25);
  assert.equal(f.loads.length, 2);
});

test("invalid usernames and counts fail before cache or upstream access", async () => {
  const f = fixture();
  for (const username of ["", "@@", "a/b", "a".repeat(16)]) {
    await assert.rejects(f.read(username, 25), /valid X username/);
  }
  for (const count of [0, -1, 1.5, NaN, Infinity]) {
    await assert.rejects(f.read("headzoo", count), /positive integer/);
  }
  assert.equal(f.loads.length, 0);
  assert.equal(f.writes.length, 0);
});

test("malformed, wrong-user, protected, future-dated, and oversized entries are misses", async () => {
  for (const invalid of [
    { broken: true },
    { fetchedAt: 1000, timeline: timeline("someone_else") },
    {
      fetchedAt: 1000,
      timeline: { ...timeline(), user: { ...timeline().user, protected: true } },
    },
    { fetchedAt: 2000, timeline: timeline() },
    {
      fetchedAt: 1000,
      timeline: { ...timeline(), tweets: Array(26).fill(timeline().tweets[0]) },
    },
  ]) {
    const f = fixture();
    f.entries.set("headzoo:25:3600", invalid);
    assert.deepEqual(await f.read("headzoo", 25), timeline());
    assert.equal(f.loads.length, 1);
  }
});

test("upstream failures are not cached and the next request can retry", async () => {
  const f = fixture();
  let attempts = 0;
  const read = createCachedXTimelineReader(async () => {
    if (++attempts === 1) throw new Error("X API unavailable");
    return timeline();
  }, f.options);
  await assert.rejects(read("headzoo", 25), /X API unavailable/);
  assert.equal(f.writes.length, 0);
  assert.deepEqual(await read("headzoo", 25), timeline());
  assert.equal(attempts, 2);
});

test("concurrent misses in the same reader share one upstream request", async () => {
  const f = fixture();
  const results = await Promise.all([
    f.read("@HeadZoo", 25),
    f.read("headzoo", 25),
    f.read("HEADZOO", 25),
  ]);
  assert.equal(f.loads.length, 1);
  assert.equal(f.writes.length, 1);
  assert.deepEqual(results, [timeline(), timeline(), timeline()]);
});

test("cache read failure falls back to X", async (t) => {
  t.mock.method(console, "warn", () => {});
  const f = fixture();
  const read = createCachedXTimelineReader(f.load, {
    ...f.options,
    cache: {
      ...f.cache,
      async get() {
        throw new Error("cache offline");
      },
    },
  });
  assert.deepEqual(await read("headzoo", 25), timeline());
  assert.equal(f.loads.length, 1);
  assert.equal(f.writes.length, 1);
});

test("cache write failure still returns the fresh timeline", async (t) => {
  t.mock.method(console, "warn", () => {});
  const f = fixture();
  const read = createCachedXTimelineReader(f.load, {
    ...f.options,
    cache: {
      ...f.cache,
      async set() {
        throw new Error("cache offline");
      },
    },
  });
  assert.deepEqual(await read("headzoo", 25), timeline());
  assert.deepEqual(await read("headzoo", 25), timeline());
  assert.equal(f.loads.length, 2);
});

test("a successful empty timeline can be reused without calling X repeatedly", async () => {
  const f = fixture();
  let calls = 0;
  const read = createCachedXTimelineReader(async () => {
    calls++;
    return { ...timeline(), tweets: [] };
  }, f.options);
  await read("headzoo", 25);
  assert.deepEqual((await read("headzoo", 25)).tweets, []);
  assert.equal(calls, 1);
});

test("TTL configuration accepts whole seconds and falls back safely", (t) => {
  t.mock.method(console, "warn", () => {});
  assert.equal(getXCacheTtlSeconds(""), 3600);
  assert.equal(getXCacheTtlSeconds(" 60 "), 60);
  assert.equal(getXCacheTtlSeconds("0"), 0);
  for (const invalid of ["-1", "1.5", "Infinity", "abc", "9007199254740992"]) {
    assert.equal(getXCacheTtlSeconds(invalid), 3600);
  }
});
