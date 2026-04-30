export interface LoginPayload {
	email: string;
	password: string;
}

export interface SignupPayload {
	username: string;
	email: string;
	password: string;
}

export interface AuthSession {
	userId: string;
	token: string;
	expiresAt: string;
}
