import { MessageType, Status, type Message, type MessageStatus } from '@prisma/client';
import { prisma } from '../../database/prisma/client';

interface ErrorWithStatusCode extends Error {
	statusCode: number;
}

export interface CreateMessageInput {
	chatId: string;
	senderId: string;
	content: string;
	type?: MessageType;
}

export interface GetMessagesByChatInput {
	chatId: string;
	cursor?: string | null;
	limit?: number;
}

export type MessageWithStatuses = Message & {
	statuses: MessageStatus[];
};

export interface MessagePageResult {
	messages: MessageWithStatuses[];
	nextCursor: string | null;
	hasMore: boolean;
}

const DEFAULT_MESSAGE_LIMIT = 100;
const MAX_MESSAGE_LIMIT = 200;
const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createError = (statusCode: number, message: string): ErrorWithStatusCode => {
	const error = new Error(message) as ErrorWithStatusCode;
	error.statusCode = statusCode;
	return error;
};

const normalizeLimit = (limit: number | undefined): number => {
	if (typeof limit !== 'number' || !Number.isInteger(limit) || limit <= 0) {
		return DEFAULT_MESSAGE_LIMIT;
	}

	return Math.min(limit, MAX_MESSAGE_LIMIT);
};

const createMessage = async ({
	chatId,
	senderId,
	content,
	type = MessageType.TEXT,
}: CreateMessageInput): Promise<MessageWithStatuses> => {
	const trimmedContent = content.trim();

	if (trimmedContent.length === 0) {
		throw createError(400, 'Message content is required');
	}

	return prisma.$transaction(async (transaction) => {
		const chatMembers = await transaction.chatMember.findMany({
			where: { chatId },
			select: { userId: true },
		});

		if (chatMembers.length === 0) {
			throw createError(404, 'Chat not found or has no members');
		}

		const senderMembership = chatMembers.find((member) => member.userId === senderId);

		if (!senderMembership) {
			throw createError(403, 'Sender is not a member of this chat');
		}

		const message = await transaction.message.create({
			data: {
				chatId,
				senderId,
				content: trimmedContent,
				type,
			},
		});

		await transaction.messageStatus.createMany({
			data: chatMembers.map((member) => ({
				messageId: message.id,
				userId: member.userId,
				status: member.userId === senderId ? Status.SEEN : Status.SENT,
			})),
		});

		return transaction.message.findUniqueOrThrow({
			where: { id: message.id },
			include: { statuses: true },
		});
	});
};

const getMessagesByChat = async ({
	chatId,
	cursor = null,
	limit,
}: GetMessagesByChatInput): Promise<MessagePageResult> => {
	if (cursor && !UUID_PATTERN.test(cursor)) {
		throw createError(400, 'Invalid message cursor');
	}

	const take = normalizeLimit(limit) + 1;
	const messages = await prisma.message.findMany({
		where: { chatId },
		orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
		take,
		...(cursor
			? {
					cursor: { id: cursor },
					skip: 1,
				}
			: {}),
		include: { statuses: true },
	});

	const effectiveLimit = take - 1;
	const hasMore = messages.length > effectiveLimit;
	const pagedMessages = hasMore ? messages.slice(0, effectiveLimit) : messages;
	const lastMessage = pagedMessages[pagedMessages.length - 1];

	return {
		messages: pagedMessages,
		nextCursor: hasMore && lastMessage ? lastMessage.id : null,
		hasMore,
	};
};

export const messageService = {
	createMessage,
	getMessagesByChat,
};
