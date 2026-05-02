import { ChatType, Role, type Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma/client';
import type { CreateChatPayload } from './chat.validation';

interface ErrorWithStatusCode extends Error {
	statusCode: number;
}

interface ServiceUserSummary {
	id: string;
	email: string;
	username: string;
	createdAt: Date;
	updatedAt: Date;
}

interface ServiceChatMember {
	id: string;
	chatId: string;
	userId: string;
	role: Role;
	joinedAt: Date;
	user: ServiceUserSummary;
}

interface ServiceMessageSummary {
	id: string;
	chatId: string;
	senderId: string;
	content: string;
	type: 'TEXT' | 'IMAGE' | 'FILE';
	createdAt: Date;
	sender: ServiceUserSummary;
}

export interface ChatDetails {
	id: string;
	type: ChatType;
	createdAt: Date;
	members: ServiceChatMember[];
	lastMessage: ServiceMessageSummary | null;
}

interface CreateChatInput extends CreateChatPayload {
	requesterUserId: string;
}

const createError = (statusCode: number, message: string): ErrorWithStatusCode => {
	const error = new Error(message) as ErrorWithStatusCode;
	error.statusCode = statusCode;
	return error;
};

const chatInclude = {
	members: {
		orderBy: { joinedAt: 'asc' },
		include: {
			user: {
				select: {
					id: true,
					email: true,
					username: true,
					createdAt: true,
					updatedAt: true,
				},
			},
		},
	},
	messages: {
		orderBy: { createdAt: 'desc' },
		take: 1,
		include: {
			sender: {
				select: {
					id: true,
					email: true,
					username: true,
					createdAt: true,
					updatedAt: true,
				},
			},
		},
	},
} satisfies Prisma.ChatInclude;

type ChatWithMembersAndLastMessage = Prisma.ChatGetPayload<{
	include: typeof chatInclude;
}>;

const normalizeMemberIds = (userIds: string[]): string[] =>
	Array.from(
		new Set(
			userIds
				.map((userId) => userId.trim())
				.filter((userId) => userId.length > 0),
		),
	);

const validateChatParticipants = ({
	type,
	memberIds,
	requesterUserId,
}: {
	type: ChatType;
	memberIds: string[];
	requesterUserId: string;
}): void => {
	if (!memberIds.includes(requesterUserId)) {
		throw createError(400, 'Authenticated user must be included in userIds');
	}

	if (type === ChatType.PRIVATE && memberIds.length !== 2) {
		throw createError(400, 'PRIVATE chat requires exactly 2 users');
	}

	if (type === ChatType.GROUP && memberIds.length < 2) {
		throw createError(400, 'GROUP chat requires at least 2 users');
	}
};

const ensureUsersExist = async (memberIds: string[]): Promise<void> => {
	const existingUsers = await prisma.user.findMany({
		where: {
			id: {
				in: memberIds,
			},
		},
		select: {
			id: true,
		},
	});

	if (existingUsers.length !== memberIds.length) {
		throw createError(400, 'One or more users do not exist');
	}
};

const toChatDetails = (chat: ChatWithMembersAndLastMessage): ChatDetails => {
	const latestMessage = chat.messages[0];

	return {
		id: chat.id,
		type: chat.type,
		createdAt: chat.createdAt,
		members: chat.members,
		lastMessage: latestMessage
			? {
					id: latestMessage.id,
					chatId: latestMessage.chatId,
					senderId: latestMessage.senderId,
					content: latestMessage.content,
					type: latestMessage.type,
					createdAt: latestMessage.createdAt,
					sender: latestMessage.sender,
				}
			: null,
	};
};

const createChat = async ({ type, userIds, requesterUserId }: CreateChatInput): Promise<ChatDetails> => {
	const memberIds = normalizeMemberIds(userIds);
	validateChatParticipants({ type, memberIds, requesterUserId });
	await ensureUsersExist(memberIds);

	const chat = await prisma.chat.create({
		data: {
			type,
			members: {
				create: memberIds.map((userId) => ({
					userId,
					role: type === ChatType.GROUP && userId === requesterUserId ? Role.ADMIN : Role.MEMBER,
				})),
			},
		},
		include: chatInclude,
	});

	return toChatDetails(chat);
};

const getUserChats = async (userId: string): Promise<ChatDetails[]> => {
	const chats = await prisma.chat.findMany({
		where: {
			members: {
				some: {
					userId,
				},
			},
		},
		include: chatInclude,
	});

	return chats
		.map((chat) => toChatDetails(chat))
		.sort((left, right) => {
			const leftActivity = left.lastMessage?.createdAt ?? left.createdAt;
			const rightActivity = right.lastMessage?.createdAt ?? right.createdAt;
			return rightActivity.getTime() - leftActivity.getTime();
		});
};

const getChatById = async ({
	chatId,
	userId,
}: {
	chatId: string;
	userId: string;
}): Promise<ChatDetails> => {
	const chat = await prisma.chat.findFirst({
		where: {
			id: chatId,
			members: {
				some: { userId },
			},
		},
		include: chatInclude,
	});

	if (!chat) {
		throw createError(403, 'Forbidden');
	}

	return toChatDetails(chat);
};

export const chatService = {
	createChat,
	getUserChats,
	getChatById,
};
