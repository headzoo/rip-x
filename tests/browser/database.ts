import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export const fixtureIds = Array.from({ length: 34 }, (_, i) => `990000000000000${String(i).padStart(3, "0")}`);
export function fixtureDatabase() {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString) throw new Error("Set TEST_DATABASE_URL to an isolated local rip_x_test database.");
  const url = new URL(connectionString);
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.pathname !== "/rip_x_test") {
    throw new Error("Browser fixtures must never run against a nonlocal database.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
