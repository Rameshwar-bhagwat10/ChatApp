export interface SqlMigration {
	id: string;
	description: string;
	sql: string;
}

export const authMigrations: SqlMigration[] = [
	{
		id: '001_auth_core_tables',
		description: 'Create auth core tables for users, refresh tokens, and rate limits',
		sql: `
			CREATE TABLE IF NOT EXISTS users (
				id UUID PRIMARY KEY,
				email TEXT NOT NULL UNIQUE,
				username TEXT NOT NULL UNIQUE,
				password_hash TEXT NOT NULL,
				created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
				updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
			);

			CREATE TABLE IF NOT EXISTS refresh_tokens (
				id UUID PRIMARY KEY,
				user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				token_hash TEXT NOT NULL UNIQUE,
				expires_at TIMESTAMPTZ NOT NULL,
				created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
				revoked_at TIMESTAMPTZ NULL,
				replaced_by_token_id UUID NULL,
				user_agent TEXT NULL,
				ip_address TEXT NULL
			);

			CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
			ON refresh_tokens (user_id);

			CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
			ON refresh_tokens (expires_at);

			CREATE TABLE IF NOT EXISTS auth_rate_limits (
				route_key TEXT NOT NULL,
				identifier TEXT NOT NULL,
				window_start TIMESTAMPTZ NOT NULL,
				attempt_count INTEGER NOT NULL DEFAULT 1,
				updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
				PRIMARY KEY (route_key, identifier, window_start)
			);
		`,
	},
	{
		id: '002_auth_session_telemetry',
		description: 'Add token family and telemetry fields to refresh tokens',
		sql: `
			ALTER TABLE refresh_tokens
			ADD COLUMN IF NOT EXISTS token_family_id UUID;

			UPDATE refresh_tokens
			SET token_family_id = id
			WHERE token_family_id IS NULL;

			ALTER TABLE refresh_tokens
			ALTER COLUMN token_family_id SET NOT NULL;

			ALTER TABLE refresh_tokens
			ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ NULL;

			CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_family_id
			ON refresh_tokens (token_family_id);
		`,
	},
	{
		id: '003_auth_admin_audit_logs',
		description: 'Create admin auth audit log table',
		sql: `
			CREATE TABLE IF NOT EXISTS auth_admin_audit_logs (
				id UUID PRIMARY KEY,
				action TEXT NOT NULL,
				actor_type TEXT NOT NULL,
				actor_identifier TEXT NOT NULL,
				actor_ip_address TEXT NULL,
				actor_user_agent TEXT NULL,
				target_user_id UUID NOT NULL,
				status TEXT NOT NULL,
				revoked_session_count INTEGER NOT NULL DEFAULT 0,
				error_message TEXT NULL,
				created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
			);

			CREATE INDEX IF NOT EXISTS idx_auth_admin_audit_logs_target_user_id
			ON auth_admin_audit_logs (target_user_id);

			CREATE INDEX IF NOT EXISTS idx_auth_admin_audit_logs_created_at
			ON auth_admin_audit_logs (created_at);
		`,
	},
];
