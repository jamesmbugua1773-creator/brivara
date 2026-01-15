-- CreateTable
CREATE TABLE "UserDepositAddress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserDepositAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UserDepositAddress_address_key" ON "UserDepositAddress"("address");

-- CreateIndex
CREATE UNIQUE INDEX "UserDepositAddress_userId_network_key" ON "UserDepositAddress"("userId", "network");
