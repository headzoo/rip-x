import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Existing process variables win (CI and isolated test databases).
config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // No connection is needed for generate; migration commands require this URL.
  datasource: { url: process.env.DATABASE_URL_UNPOOLED ?? "" },
});
