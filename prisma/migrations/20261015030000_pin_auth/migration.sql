CREATE TABLE "OwnerSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OwnerSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "OwnerSession_expiresAt_idx" ON "OwnerSession"("expiresAt");
CREATE TABLE "PinAttempt" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "failures" INTEGER NOT NULL DEFAULT 0,
  "lockouts" INTEGER NOT NULL DEFAULT 0,
  "blockedUntil" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL
);
