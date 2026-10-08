-- DropIndex
DROP INDEX "Candidate_areaKey_kind_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Area";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Candidate";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "interests" JSONB NOT NULL,
    "hobbies" JSONB NOT NULL,
    "dislikes" JSONB NOT NULL,
    "budgetMin" INTEGER,
    "budgetMax" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "meetNewPeople" BOOLEAN NOT NULL DEFAULT false,
    "groupSize" TEXT,
    "maxDistanceKm" INTEGER NOT NULL DEFAULT 25,
    "activityIntensity" TEXT,
    "locationName" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Profile" ("activityIntensity", "budgetMax", "budgetMin", "currency", "dislikes", "groupSize", "hobbies", "id", "interests", "latitude", "locationName", "longitude", "maxDistanceKm", "meetNewPeople", "onboarded", "updatedAt", "userId") SELECT "activityIntensity", "budgetMax", "budgetMin", "currency", "dislikes", "groupSize", "hobbies", "id", "interests", "latitude", "locationName", "longitude", "maxDistanceKm", "meetNewPeople", "onboarded", "updatedAt", "userId" FROM "Profile";
DROP TABLE "Profile";
ALTER TABLE "new_Profile" RENAME TO "Profile";
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

