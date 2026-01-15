-- Add a unique constraint for usernames (SQLite via unique index)

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
