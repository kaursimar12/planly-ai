-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "areaKey" TEXT;
ALTER TABLE "Profile" ADD COLUMN "embedding" BLOB;
ALTER TABLE "Profile" ADD COLUMN "embeddingText" TEXT;

-- CreateTable
CREATE TABLE "Area" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "weather" JSONB,
    "lastRefreshedAt" DATETIME,
    "lastRequestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "areaKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TEXT,
    "startTime" TEXT,
    "venue" TEXT,
    "address" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "price" REAL,
    "priceText" TEXT,
    "url" TEXT,
    "mapUrl" TEXT,
    "openingHours" TEXT,
    "source" TEXT NOT NULL,
    "retrievedAt" DATETIME NOT NULL,
    "social" INTEGER NOT NULL,
    "outdoor" BOOLEAN NOT NULL,
    "tags" JSONB NOT NULL,
    "embedding" BLOB,
    CONSTRAINT "Candidate_areaKey_fkey" FOREIGN KEY ("areaKey") REFERENCES "Area" ("key") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Candidate_areaKey_kind_idx" ON "Candidate"("areaKey", "kind");
