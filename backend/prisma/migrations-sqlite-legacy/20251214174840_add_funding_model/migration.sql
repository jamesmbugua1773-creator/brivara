-- CreateTable
CREATE TABLE "Funding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "totalEarned" REAL NOT NULL DEFAULT 0,
    "requiredReturn" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "fundedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repaidAt" DATETIME,
    "txId" TEXT NOT NULL,
    CONSTRAINT "Funding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Funding_txId_key" ON "Funding"("txId");
