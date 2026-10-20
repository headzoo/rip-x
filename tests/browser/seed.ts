import { fixtureDatabase, fixtureIds } from "./database";
import { memorial, artwork } from "../fixtures/memorial";

async function seed() {
  const db = fixtureDatabase();
  const names = ["Morgan Nightingale", "Edgar Holloway", "Agnes Blackthorn", "Theodore Graves", "Evelyn Ash", "Silas Crowe"];
  try {
    await db.memorial.deleteMany({ where: { xUserId: { in: fixtureIds } } });
    if (process.argv.includes("--cleanup")) return;
    await db.memorial.createMany({ data: fixtureIds.map((id, i) => ({
      id: `22222222-2222-4222-8222-${String(i).padStart(12, "0")}`,
      xUserId: id, username: `fixture_${i}`, displayName: names[i % names.length],
      status: i === 32 ? "HIDDEN" as const : i === 33 ? "GENERATING" as const : "READY" as const,
      content: memorial, artworkUrl: artwork.src, artworkAlt: artwork.alt,
      artworkWidth: artwork.width, artworkHeight: artwork.height,
      headstoneVariant: i % 6, postsAnalyzed: 25,
      publishedAt: new Date(Date.UTC(2026, 9, 20, 12, 0, 32 - i)),
    })) });
  } finally { await db.$disconnect(); }
}

seed().catch(() => { console.error("Isolated browser fixture setup failed."); process.exitCode = 1; });
