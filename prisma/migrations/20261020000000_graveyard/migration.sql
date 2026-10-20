CREATE SCHEMA IF NOT EXISTS "public";
CREATE TYPE "MemorialStatus" AS ENUM ('GENERATING', 'READY', 'FAILED', 'HIDDEN');
CREATE TABLE "rip_x_memorials" (
    "id" UUID NOT NULL,
    "xUserId" VARCHAR(19) NOT NULL,
    "username" VARCHAR(15) NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "MemorialStatus" NOT NULL DEFAULT 'GENERATING',
    "content" JSONB,
    "artworkUrl" TEXT,
    "artworkPath" TEXT,
    "artworkAlt" TEXT,
    "artworkWidth" INTEGER,
    "artworkHeight" INTEGER,
    "postsAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "headstoneVariant" INTEGER NOT NULL DEFAULT 0,
    "claimToken" UUID,
    "leaseExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    CONSTRAINT "rip_x_memorials_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rip_x_memorials_xUserId_key" ON "rip_x_memorials"("xUserId");
CREATE INDEX "rip_x_memorials_status_publishedAt_id_idx" ON "rip_x_memorials"("status", "publishedAt" DESC, "id");
CREATE INDEX "rip_x_memorials_username_idx" ON "rip_x_memorials"("username");
