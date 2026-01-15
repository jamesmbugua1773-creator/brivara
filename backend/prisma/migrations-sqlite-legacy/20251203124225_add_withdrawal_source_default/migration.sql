-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Withdrawal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "fee" REAL NOT NULL,
    "network" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'REBATE',
    "txId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    CONSTRAINT "Withdrawal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Withdrawal" ("amount", "fee", "id", "network", "status", "timestamp", "txId", "userId") SELECT "amount", "fee", "id", "network", "status", "timestamp", "txId", "userId" FROM "Withdrawal";
DROP TABLE "Withdrawal";
ALTER TABLE "new_Withdrawal" RENAME TO "Withdrawal";
CREATE UNIQUE INDEX "Withdrawal_txId_key" ON "Withdrawal"("txId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
