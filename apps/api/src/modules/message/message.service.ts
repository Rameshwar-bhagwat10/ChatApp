import { MessageType, Status, type Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma/client';

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

interface ServiceMessageStatus {
	id: string;
	messageId: string;
	userId: string;
	status: Status;
	createdAt: Date;
	updatedAt: Date;
}

export interface MessageDetails {
	id: string;
	chatId: string;
	senderId: string;
	content: string;
	type: MessageType;
	createdAt: Date;
	sender: ServiceUserSummary;
	statuses: ServiceMessageStatus[];
}

export interface CreateMessageInput {
	chatId: string;
	senderId: string;
	content: string;
	type?: MessageType;
}

export interface GetMessagesByChatInput {
	chatId: string;
	userId: string;
	page: number;
	limit: number;
}

export interface MessageListResult {
	messages: MessageDetails[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

const createError = (statusCode: number, message: string): ErrorWithStatusCode => {
	const error = new Error(message) as ErrorWithStatusCode;
	error.statusCode = statusCode;
	return error;
};

const messageInclude = {
	sender: {
		select: {
			id: true,
			email: true,
			username: true,
			createdAt: true,
			updatedAt: true,
		},
	},
	statuses: {
		orderBy: { createdAt: 'asc' },
	},
} satisfies Prisma.MessageInclude;

type MessageWithRelations = Prisma.MessageGetPayload<{
	include: typeof messageInclude;
}>;

const toMessageDetails = (message: MessageWithRelations): MessageDetails => ({
	id: message.id,
	chatId: message.chatId,
	senderId: message.senderId,
	content: message.content,
	type: message.type,
	createdAt: message.createdAt,
	sender: message.sender,
	statuses: message.statuses,
});

const ensureMembership = async ({
	chatId,
	userId,
}: {
	chatId: string;
	userId: string;
}): Promise<void> => {
	const membership = await prisma.chatMember.findUnique({
		where: {
			chatId_userId: {
				chatId,
				userId,
			},
		},
		select: { id: true },
	});

	if (!membership) {
		throw createError(403, 'Forbidden');
	}
};

const createMessage = async ({
	chatId,
	senderId,
	content,
	type = MessageType.TEXT,
}: CreateMessageInput): Promise<MessageDetails> => {
	const trimmedContent = content.trim();

	if (trimmedContent.length === 0) {
		throw createError(400, 'content is required');
	}

	const message = await prisma.$transaction(async (transaction) => {
		const members = await transaction.chatMember.findMany({
			where: { chatId },
			select: { userId: true },
		});

		if (!members.some((member) => member.userId === senderId)) {
			throw createError(403, 'Forbidden');
		}

		const createdMessage = await transaction.message.create({
			data: {
				chatId,
				senderId,
				content: trimmedContent,
				type,
			},
		});

		await transaction.messageStatus.createMany({
			data: members.map((member) => ({
				messageId: createdMessage.id,
				userId: member.userId,
				status: member.userId === senderId ? Status.SEEN : Status.SENT,
			})),
		});

		return transaction.message.findUniqueOrThrow({
			where: {
				id: createdMessage.id,
			},
			include: messageInclude,
		});
	});

	return toMessageDetails(message);
};

const getMessagesByChat = async ({
	chatId,
	userId,
	page,
	limit,
}: GetMessagesByChatInput): Promise<MessageListResult> => {
	await ensureMembership({
		chatId,
		userId,
	});

	const skip = (page - 1) * limit;

	const [total, messages] = await prisma.$transaction([
		prisma.message.count({
			where: { chatId },
		}),
		prisma.message.findMany({
			where: { chatId },
			orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
			skip,
			take: limit,
			include: messageInclude,
		}),
	]);

	return {
		messages: messages.map((message) => toMessageDetails(message)),
		pagination: {
			page,
			limit,
			total,
			totalPages: total === 0 ? 0 : Math.ceil(total / limit),
		},
	};
};

export const messageService = {
	createMessage,
	getMessagesByChat,
};
