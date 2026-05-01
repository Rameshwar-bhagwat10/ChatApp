'use client';

import { ChatDashboard } from '../features/chat/ChatDashboard';
import { useState } from 'react';
import type { FormEvent } from 'react';

type AuthUser = {
	id: string;
	email: string;
	username: string;
	created_at?: string;
	createdAt?: string;
};

type Status = {
	type: 'success' | 'error';
	message: string;
};

type AuthMode = 'login' | 'signup';

type LoginResponse = {
	accessToken: string;
	refreshToken?: string;
	user: AuthUser;
	message?: string;
};

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const API_BASE_URL = `${RAW_API_URL.replace(/\/+$/, '')}/api/v1`;

const parseJsonSafely = async <T,>(response: Response): Promise<T | null> => {
	try {
		return (await response.json()) as T;
	} catch {
		return null;
	}
};

const getApiMessage = (payload: unknown, fallback: string): string => {
	if (
		typeof payload === 'object' &&
		payload !== null &&
		'message' in payload &&
		typeof payload.message === 'string'
	) {
		return payload.message;
	}

	return fallback;
};

const getRequestErrorMessage = (error: unknown, fallback: string): string => {
	if (error instanceof TypeError) {
		return `Unable to reach API at ${API_BASE_URL}. Ensure backend is running.`;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return fallback;
};

const HomePage = () => {
	const [mode, setMode] = useState<AuthMode>('login');
	const [email, setEmail] = useState('');
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');

	const [user, setUser] = useState<AuthUser | null>(null);
	const [accessToken, setAccessToken] = useState('');
	const [refreshToken, setRefreshToken] = useState('');
	const [status, setStatus] = useState<Status | null>(null);
	const [loadingAction, setLoadingAction] = useState<'auth' | 'profile' | 'logout' | null>(null);

	const isLoading = loadingAction !== null;
	const isAuthenticated = Boolean(accessToken && user);

	const clearStatus = () => {
		setStatus(null);
	};

	const clearAuthState = () => {
		setAccessToken('');
		setRefreshToken('');
		setUser(null);
	};

	const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		clearStatus();
		setLoadingAction('auth');

		try {
			if (mode === 'signup') {
				const signupResponse = await fetch(`${API_BASE_URL}/auth/signup`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email,
						username,
						password
					})
				});
				const signupPayload = await parseJsonSafely(signupResponse);
				if (!signupResponse.ok) {
					throw new Error(getApiMessage(signupPayload, 'Sign up failed'));
				}

				setMode('login');
				setStatus({
					type: 'success',
					message: 'Account created. Please log in to continue.'
				});
				return;
			}

			const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email,
					password
				})
			});
			const loginPayload = await parseJsonSafely<LoginResponse>(loginResponse);
			if (
				!loginResponse.ok ||
				!loginPayload?.accessToken ||
				!loginPayload.user
			) {
				throw new Error(getApiMessage(loginPayload, 'Login failed'));
			}

			setAccessToken(loginPayload.accessToken);
			setRefreshToken(loginPayload.refreshToken ?? '');
			setUser(loginPayload.user);
			setStatus({ type: 'success', message: 'Login successful.' });
		} catch (error) {
			const message = getRequestErrorMessage(error, mode === 'signup' ? 'Sign up failed' : 'Login failed');
			setStatus({ type: 'error', message });
		} finally {
			setLoadingAction(null);
		}
	};

	const handleGetProfile = async () => {
		clearStatus();
		setLoadingAction('profile');

		try {
			const response = await fetch(`${API_BASE_URL}/auth/me`, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${accessToken}`
				}
			});

			const data = await parseJsonSafely<{ message?: string; user?: AuthUser }>(response);
			if (!response.ok) {
				throw new Error(getApiMessage(data, 'Failed to fetch profile'));
			}

			if (data?.user) {
				setUser(data.user);
			}
			setStatus({ type: 'success', message: 'Profile fetched successfully.' });
		} catch (error) {
			const message = getRequestErrorMessage(error, 'Failed to fetch profile');
			setStatus({ type: 'error', message });
		} finally {
			setLoadingAction(null);
		}
	};

	const handleLogout = async () => {
		clearStatus();
		setLoadingAction('logout');

		try {
			const response = await fetch(`${API_BASE_URL}/auth/logout`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(
					refreshToken ? { refreshToken } : {}
				)
			});

			const data = await parseJsonSafely(response);
			if (!response.ok) {
				throw new Error(getApiMessage(data, 'Logout failed'));
			}

			clearAuthState();
			setStatus({ type: 'success', message: 'Logged out successfully.' });
		} catch (error) {
			const message = getRequestErrorMessage(error, 'Logout failed');
			setStatus({ type: 'error', message });
		} finally {
			setLoadingAction(null);
		}
	};

	if (isAuthenticated) {
		return (
			<div className="relative">
				<div className="absolute right-4 top-4 z-50 flex items-center gap-2 rounded-lg bg-slate-900/90 px-3 py-2 text-xs text-white shadow">
					<span className="max-w-52 truncate">{user?.email}</span>
					<button
						className="rounded bg-slate-700 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-60"
						type="button"
						onClick={handleGetProfile}
						disabled={isLoading}
					>
						{loadingAction === 'profile' ? 'Checking...' : 'Check Session'}
					</button>
					<button
						className="rounded bg-rose-600 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-60"
						type="button"
						onClick={handleLogout}
						disabled={isLoading}
					>
						{loadingAction === 'logout' ? 'Logging out...' : 'Logout'}
					</button>
				</div>
				<ChatDashboard authUser={user} />
			</div>
		);
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
			<div className="w-full max-w-md rounded-xl bg-white p-6 shadow">
				<h1 className="text-2xl font-semibold text-slate-900">
					{mode === 'login' ? 'Welcome back' : 'Create your account'}
				</h1>
				<p className="mt-1 text-sm text-slate-600">
					{mode === 'login'
						? 'Log in to open your chat workspace.'
						: 'Register, then log in to enter chat.'}
				</p>

				{status ? (
					<div
						className={`mt-4 rounded-md px-3 py-2 text-sm ${
							status.type === 'success'
								? 'bg-emerald-100 text-emerald-700'
								: 'bg-rose-100 text-rose-700'
						}`}
					>
						{status.message}
					</div>
				) : null}

				<form className="mt-5 flex flex-col gap-3" onSubmit={handleAuthSubmit}>
					<input
						className="rounded border px-3 py-2"
						type="email"
						placeholder="Email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						disabled={isLoading}
						required
					/>
					{mode === 'signup' ? (
						<input
							className="rounded border px-3 py-2"
							type="text"
							placeholder="Username"
							value={username}
							onChange={(event) => setUsername(event.target.value)}
							disabled={isLoading}
							required
						/>
					) : null}
					<input
						className="rounded border px-3 py-2"
						type="password"
						placeholder="Password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						disabled={isLoading}
						required
					/>
					<button
						className="rounded bg-slate-900 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
						type="submit"
						disabled={isLoading}
					>
						{loadingAction === 'auth'
							? mode === 'login'
								? 'Logging in...'
								: 'Creating account...'
							: mode === 'login'
								? 'Login'
								: 'Create account'}
					</button>
				</form>

				<button
					className="mt-4 text-sm text-slate-700 underline underline-offset-2"
					type="button"
					onClick={() => {
						clearStatus();
						setMode((previousMode) => (previousMode === 'login' ? 'signup' : 'login'));
					}}
					disabled={isLoading}
				>
					{mode === 'login'
						? 'Need an account? Register'
						: 'Already have an account? Login'}
				</button>
			</div>
		</main>
	);
};

export default HomePage;
