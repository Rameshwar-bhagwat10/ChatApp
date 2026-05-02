import { ChatType, Prisma, Role, type Chat, type ChatMember } from '@prisma/client';
import { prisma } from '../../database/prisma/client';

interface ErrorWithStatusCode extends Error {
	statusCode: number;
}

export interface CreateChatInput {
	type: ChatType;
	memberIds: string[];
}

export interface AddUserToChatInput {
	chatId: string;
	userId: string;
	role?: Role;
}

export interface GetUserChatsInput {
	userId: string;
	cursor?: string | null;
	limit?: number;
}

export type ChatWithMembers = Chat & {
	members: ChatMember[];
};

export interface ChatPageResult {
	chats: ChatWithMembers[];
	nextCursor: string | null;
	hasMore: boolean;
}

const DEFAULT_CHAT_LIMIT = 50;
const MAX_CHAT_LIMIT = 100;
const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createError = (statusCode: number, message: string): ErrorWithStatusCode => {
	const error = new Error(message) as ErrorWithStatusCode;
	error.statusCode = statusCode;
	return error;
};

const normalizeLimit = (limit: number | undefined): number => {
	if (typeof limit !== 'number' || !Number.isInteger(limit) || limit <= 0) {
		return DEFAULT_CHAT_LIMIT;
	}

	return Math.min(limit, MAX_CHAT_LIMIT);
};

const normalizeMemberIds = (memberIds: string[]): string[] =>
	Array.from(
		new Set(
			memberIds
				.map((memberId) => memberId.trim())
				.filter((memberId) => memberId.length > 0),
		),
	);

const assertValidCreateChatInput = ({ type, memberIds }: CreateChatInput): void => {
	if (type === ChatType.PRIVATE && memberIds.length !== 2) {
		throw createError(400, 'Private chats require exactly 2 members');
	}

	if (type === ChatType.GROUP && memberIds.length < 2) {
		throw createError(400, 'Group chats require at least 2 members');
	}
};

const createChat = async (input: CreateChatInput): Promise<ChatWithMembers> => {
	const normalizedMemberIds = normalizeMemberIds(input.memberIds);
	assertValidCreateChatInput({ type: input.type, memberIds: normalizedMemberIds });

	try {
		return await prisma.chat.create({
			data: {
				type: input.type,
				members: {
					create: normalizedMemberIds.map((userId, index) => ({
						userId,
						role: input.type === ChatType.GROUP && index === 0 ? Role.ADMIN : Role.MEMBER,
					})),
				},
			},
			include: {
				members: true,
			},
		});
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
			throw createError(400, 'One or more member IDs do not exist');
		}

		throw error;
	}
};

const getUserChats = async ({
	userId,
	cursor = null,
	limit,
}: GetUserChatsInput): Promise<ChatPageResult> => {
	if (cursor && !UUID_PATTERN.test(cursor)) {
		throw createError(400, 'Invalid chat cursor');
	}

	const take = normalizeLimit(limit) + 1;
	const chats = await prisma.chat.findMany({
		where: {
			members: {
				some: {
					userId,
				},
			},
		},
		include: {
			members: true,
		},
		orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
		take,
		...(cursor
			? {
					cursor: { id: cursor },
					skip: 1,
				}
			: {}),
	});

	const effectiveLimit = take - 1;
	const hasMore = chats.length > effectiveLimit;
	const pagedChats = hasMore ? chats.slice(0, effectiveLimit) : chats;
	const lastChat = pagedChats[pagedChats.length - 1];

	return {
		chats: pagedChats,
		nextCursor: hasMore && lastChat ? lastChat.id : null,
		hasMore,
	};
};

const addUserToChat = async ({
	chatId,
	userId,
	role = Role.MEMBER,
}: AddUserToChatInput): Promise<ChatMember> => {
	const chat = await prisma.chat.findUnique({
		where: { id: chatId },
		select: { id: true },
	});

	if (!chat) {
		throw createError(404, 'Chat not found');
	}

	try {
		return await prisma.chatMember.create({
			data: {
				chatId,
				userId,
				role,
			},
		});
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === 'P2002') {
				throw createError(409, 'User is already a member of this chat');
			}

			if (error.code === 'P2003') {
				throw createError(400, 'User does not exist');
			}
		}

		throw error;
	}
};

const listChats = async (): Promise<ChatWithMembers[]> =>
	prisma.chat.findMany({
		include: {
			members: true,
		},
		orderBy: {
			createdAt: 'desc',
		},
	});

export const chatService = {
	createChat,
	getUserChats,
	addUserToChat,
	listChats,
};
