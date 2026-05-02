-- DropForeignKey
ALTER TABLE "ChatMember" DROP CONSTRAINT "ChatMember_chatId_fkey";
ALTER TABLE "ChatMember" DROP CONSTRAINT "ChatMember_userId_fkey";
ALTER TABLE "Message" DROP CONSTRAINT "Message_chatId_fkey";
ALTER TABLE "Message" DROP CONSTRAINT "Message_senderId_fkey";
ALTER TABLE "MessageStatus" DROP CONSTRAINT "MessageStatus_messageId_fkey";
ALTER TABLE "MessageStatus" DROP CONSTRAINT "MessageStatus_userId_fkey";
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- Convert identifiers and foreign keys from TEXT to UUID
ALTER TABLE "User"
	ALTER COLUMN "id" TYPE UUID USING "id"::uuid;

ALTER TABLE "Chat"
	ALTER COLUMN "id" TYPE UUID USING "id"::uuid;

ALTER TABLE "ChatMember"
	ALTER COLUMN "id" TYPE UUID USING "id"::uuid,
	ALTER COLUMN "chatId" TYPE UUID USING "chatId"::uuid,
	ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;

ALTER TABLE "Message"
	ALTER COLUMN "id" TYPE UUID USING "id"::uuid,
	ALTER COLUMN "chatId" TYPE UUID USING "chatId"::uuid,
	ALTER COLUMN "senderId" TYPE UUID USING "senderId"::uuid;

ALTER TABLE "MessageStatus"
	ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	ALTER COLUMN "id" TYPE UUID USING "id"::uuid,
	ALTER COLUMN "messageId" TYPE UUID USING "messageId"::uuid,
	ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;

ALTER TABLE "RefreshToken"
	ALTER COLUMN "id" TYPE UUID USING "id"::uuid,
	ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;

-- Add indexes required for read scalability
CREATE INDEX "ChatMember_userId_idx" ON "ChatMember"("userId");
CREATE INDEX "Message_chatId_createdAt_idx" ON "Message"("chatId", "createdAt");
CREATE INDEX "MessageStatus_userId_idx" ON "MessageStatus"("userId");
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- Recreate foreign keys
ALTER TABLE "ChatMember"
	ADD CONSTRAINT "ChatMember_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChatMember"
	ADD CONSTRAINT "ChatMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Message"
	ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Message"
	ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageStatus"
	ADD CONSTRAINT "MessageStatus_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageStatus"
	ADD CONSTRAINT "MessageStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RefreshToken"
	ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
