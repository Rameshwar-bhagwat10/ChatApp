import type { User } from '@prisma/client';
import { prisma } from '../../database/prisma/client';

interface ErrorWithStatusCode extends Error {
	statusCode: number;
}

export interface PublicUser {
	id: string;
	email: string;
	username: string;
	createdAt: Date;
	updatedAt: Date;
}

const createNotFoundError = (message: string): ErrorWithStatusCode => {
	const error = new Error(message) as ErrorWithStatusCode;
	error.statusCode = 404;
	return error;
};

const toPublicUser = (user: User): PublicUser => ({
	id: user.id,
	email: user.email,
	username: user.username,
	createdAt: user.createdAt,
	updatedAt: user.updatedAt,
});

const getUserById = async (id: string): Promise<User | null> =>
	prisma.user.findUnique({
		where: { id },
	});

const getUserByEmail = async (email: string): Promise<User | null> =>
	prisma.user.findUnique({
		where: { email },
	});

const getCurrentUser = async (userId: string): Promise<PublicUser> => {
	const user = await getUserById(userId);

	if (!user) {
		throw createNotFoundError('User not found');
	}

	return toPublicUser(user);
};

export const userService = {
	getUserById,
	getUserByEmail,
	getCurrentUser,
};
