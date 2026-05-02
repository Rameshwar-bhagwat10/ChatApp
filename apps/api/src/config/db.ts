import { logger } from '@chat-app/utils';
import type { QueryResult, QueryResultRow } from 'pg';
import { Pool } from 'pg';
import { authMigrations } from '../database/migrations';
import { apiConfig } from './env';

interface DatabaseClient {
	query: <TRow extends QueryResultRow = QueryResultRow>(
		queryText: string,
		values?: unknown[],
	) => Promise<QueryResult<TRow>>;
	release: () => void;
}

interface DatabasePool {
	query: <TRow extends QueryResultRow = QueryResultRow>(
		queryText: string,
		values?: unknown[],
	) => Promise<QueryResult<TRow>>;
	connect: () => Promise<DatabaseClient>;
	on?: (event: 'error', handler: (error: Error) => void) => void;
}

let pool: DatabasePool | null = null;
let migrationsApplied = false;
let cleanupIntervalInitialized = false;

const isPgMemConnectionString = (connectionString: string): boolean =>
	connectionString.startsWith('pg-mem://');

const toDatabaseSchema = (connectionString: string): string => {
	if (isPgMemConnectionString(connectionString)) {
		return 'public';
	}

	const parsedConnection = new URL(connectionString);
	const schema = parsedConnection.searchParams.get('schema')?.trim() || 'public';

	if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
		throw new Error(`Invalid schema value in DATABASE_URL: ${schema}`);
	}

	return schema;
};

const createDatabasePool = async (): Promise<DatabasePool> => {
	if (isPgMemConnectionString(apiConfig.DATABASE_URL)) {
		const { newDb } = await import('pg-mem');
		const memoryDatabase = newDb({
			autoCreateForeignKeyIndices: true,
		});
		const memoryAdapter = memoryDatabase.adapters.createPg();

		return new memoryAdapter.Pool();
	}

	const postgresPool = new Pool({
		connectionString: apiConfig.DATABASE_URL,
		options: `-c search_path=${toDatabaseSchema(apiConfig.DATABASE_URL)}`,
		max: 20,
		idleTimeoutMillis: 30_000,
		connectionTimeoutMillis: 10_000,
	});

	postgresPool.on('error', (error: Error) => {
		logger.error('Unexpected PostgreSQL pool error', { message: error.message });
	});

	return postgresPool;
};

const getPool = async (): Promise<DatabasePool> => {
	if (pool) {
		return pool;
	}

	pool = await createDatabasePool();
	return pool;
};

export const isPostgresStorageEnabled = (): boolean => apiConfig.authStorageBackend === 'postgres';

export const queryDatabase = async <TRow extends QueryResultRow = QueryResultRow>(
	queryText: string,
	values: unknown[] = [],
): Promise<QueryResult<TRow>> => {
	if (!isPostgresStorageEnabled()) {
		throw new Error('Database query requested while postgres storage is disabled');
	}

	const activePool = await getPool();
	return activePool.query<TRow>(queryText, values);
};

export const withDatabaseTransaction = async <T>(
	callback: (client: DatabaseClient) => Promise<T>,
): Promise<T> => {
	if (!isPostgresStorageEnabled()) {
		throw new Error('Database transaction requested while postgres storage is disabled');
	}

	const activePool = await getPool();
	const client = await activePool.connect();

	try {
		await client.query('BEGIN');
		const result = await callback(client);
		await client.query('COMMIT');
		return result;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
};

const runDatabaseMigrations = async (): Promise<void> => {
	await queryDatabase(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			id TEXT PRIMARY KEY,
			description TEXT NOT NULL,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`);

	for (const migration of authMigrations) {
		const existing = await queryDatabase<{ id: string }>(
			`SELECT id FROM schema_migrations WHERE id = $1 LIMIT 1`,
			[migration.id],
		);

		if (existing.rows.length > 0) {
			continue;
		}

		await withDatabaseTransaction(async (client) => {
			const statements = migration.sql
				.split(';')
				.map((statement) => statement.trim())
				.filter((statement) => statement.length > 0);

			for (const statement of statements) {
				await client.query(statement);
			}

			await client.query(
				`INSERT INTO schema_migrations (id, description) VALUES ($1, $2)`,
				[migration.id, migration.description],
			);
		});

		logger.info('Applied SQL migration', { migrationId: migration.id });
	}
};

const cleanupAuthStorage = async (): Promise<void> => {
	const rateLimitCutoffIso = new Date(Date.now() - apiConfig.authRateLimitRetentionMs).toISOString();
	const refreshTokenCutoffIso = new Date(
		Date.now() - apiConfig.authRefreshTokenRetentionMs,
	).toISOString();

	await queryDatabase(
		`DELETE FROM auth_rate_limits
		 WHERE window_start < $1::timestamptz`,
		[rateLimitCutoffIso],
	);

	await queryDatabase(
		`DELETE FROM refresh_tokens
		 WHERE expires_at < $1::timestamptz
		    OR (revoked_at IS NOT NULL AND revoked_at < $1::timestamptz)`,
		[refreshTokenCutoffIso],
	);
};

const initializeCleanupSchedule = (): void => {
	if (cleanupIntervalInitialized || apiConfig.authCleanupIntervalMs <= 0) {
		return;
	}

	const timer = setInterval(() => {
		void cleanupAuthStorage().catch((error: unknown) => {
			const message = error instanceof Error ? error.message : 'Unknown cleanup error';
			logger.error('Failed auth storage cleanup', { message });
		});
	}, apiConfig.authCleanupIntervalMs);

	timer.unref();
	cleanupIntervalInitialized = true;
};

export const initializeDatabase = async (): Promise<void> => {
	if (!isPostgresStorageEnabled()) {
		logger.warn('PostgreSQL storage is disabled; using non-production auth storage backend', {
			backend: apiConfig.authStorageBackend,
		});
		return;
	}

	const activePool = await getPool();
	await activePool.query('SELECT 1');

	if (!migrationsApplied) {
		await runDatabaseMigrations();
		migrationsApplied = true;
	}

	await cleanupAuthStorage();
	initializeCleanupSchedule();
	logger.info('PostgreSQL connection and migrations initialized');
};
