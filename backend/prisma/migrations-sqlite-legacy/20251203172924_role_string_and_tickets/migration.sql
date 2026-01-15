-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "adminReply" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "sponsorId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "name" TEXT,
    "phone" TEXT,
    "country" TEXT,
    "profileImageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLogin" DATETIME,
    "currentPackage" TEXT,
    "activationDate" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    "withdraw_wallet_bep20" TEXT,
    "deposit_wallet_trc20" TEXT,
    "deposit_wallet_bep20" TEXT,
    CONSTRAINT "User_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("activationDate", "country", "created_at", "currentPackage", "deposit_wallet_bep20", "deposit_wallet_trc20", "email", "id", "lastLogin", "name", "passwordHash", "phone", "profileImageUrl", "referralCode", "sponsorId", "status", "updatedAt", "username", "withdraw_wallet_bep20") SELECT "activationDate", "country", "created_at", "currentPackage", "deposit_wallet_bep20", "deposit_wallet_trc20", "email", "id", "lastLogin", "name", "passwordHash", "phone", "profileImageUrl", "referralCode", "sponsorId", "status", "updatedAt", "username", "withdraw_wallet_bep20" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
