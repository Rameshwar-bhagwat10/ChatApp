-- Ensure shared users table exists
CREATE TABLE IF NOT EXISTS "users" (
	"id" UUID NOT NULL,
	"email" TEXT NOT NULL,
	"username" TEXT NOT NULL,
	"password_hash" TEXT NOT NULL,
	"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");

-- Ensure shared refresh token table exists
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
	"id" UUID NOT NULL,
	"user_id" UUID NOT NULL,
	"token_family_id" UUID NOT NULL,
	"token_hash" TEXT NOT NULL,
	"expires_at" TIMESTAMP(3) NOT NULL,
	"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"last_used_at" TIMESTAMP(3),
	"revoked_at" TIMESTAMP(3),
	"replaced_by_token_id" UUID,
	"user_agent" TEXT,
	"ip_address" TEXT,
	CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user_id" ON "refresh_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_expires_at" ON "refresh_tokens"("expires_at");
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_token_family_id" ON "refresh_tokens"("token_family_id");

-- Migrate chat users from legacy Prisma "User" table into shared "users"
DO $$
BEGIN
	IF to_regclass('"User"') IS NOT NULL THEN
		INSERT INTO "users" ("id", "email", "username", "password_hash", "created_at", "updated_at")
		SELECT
			u."id",
			u."email",
			u."username",
			u."passwordHash",
			u."createdAt",
			COALESCE(u."createdAt", CURRENT_TIMESTAMP)
		FROM "User" u
		ON CONFLICT ("id") DO UPDATE SET
			"email" = EXCLUDED."email",
			"username" = EXCLUDED."username",
			"password_hash" = EXCLUDED."password_hash";
	END IF;
END $$;

-- Migrate legacy Prisma refresh tokens into shared refresh_tokens
DO $$
BEGIN
	IF to_regclass('"RefreshToken"') IS NOT NULL THEN
		INSERT INTO "refresh_tokens" (
			"id",
			"user_id",
			"token_family_id",
			"token_hash",
			"expires_at",
			"created_at"
		)
		SELECT
			rt."id",
			rt."userId",
			rt."id",
			rt."token",
			rt."expiresAt",
			rt."createdAt"
		FROM "RefreshToken" rt
		ON CONFLICT ("id") DO NOTHING;
	END IF;
END $$;

-- Repoint chat foreign keys to shared users table
ALTER TABLE "ChatMember" DROP CONSTRAINT IF EXISTS "ChatMember_userId_fkey";
ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_senderId_fkey";
ALTER TABLE "MessageStatus" DROP CONSTRAINT IF EXISTS "MessageStatus_userId_fkey";

ALTER TABLE "ChatMember"
	ADD CONSTRAINT "ChatMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Message"
	ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageStatus"
	ADD CONSTRAINT "MessageStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "refresh_tokens_user_id_fkey";
ALTER TABLE "refresh_tokens"
	ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Remove duplicate legacy Prisma tables
DROP TABLE IF EXISTS "RefreshToken";
DROP TABLE IF EXISTS "User";
