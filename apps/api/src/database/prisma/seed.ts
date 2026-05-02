import { ChatType, Role } from '@prisma/client';
import { prisma } from './client';

const seed = async (): Promise<void> => {
	const users = await Promise.all([
		prisma.user.upsert({
			where: { email: 'alice@example.com' },
			update: {},
			create: {
				email: 'alice@example.com',
				username: 'alice',
				passwordHash: 'seed-password-hash-alice',
			},
		}),
		prisma.user.upsert({
			where: { email: 'bob@example.com' },
			update: {},
			create: {
				email: 'bob@example.com',
				username: 'bob',
				passwordHash: 'seed-password-hash-bob',
			},
		}),
		prisma.user.upsert({
			where: { email: 'carol@example.com' },
			update: {},
			create: {
				email: 'carol@example.com',
				username: 'carol',
				passwordHash: 'seed-password-hash-carol',
			},
		}),
	]);

	const alice = users[0];
	const bob = users[1];
	const carol = users[2];

	if (!alice || !bob || !carol) {
		throw new Error('Failed to seed users');
	}

	const existingPrivateChat = await prisma.chat.findFirst({
		where: {
			type: ChatType.PRIVATE,
			AND: [
				{ members: { some: { userId: alice.id } } },
				{ members: { some: { userId: bob.id } } },
				{ members: { every: { userId: { in: [alice.id, bob.id] } } } },
			],
		},
	});

	if (!existingPrivateChat) {
		await prisma.chat.create({
			data: {
				type: ChatType.PRIVATE,
				members: {
					create: [
						{ userId: alice.id, role: Role.MEMBER },
						{ userId: bob.id, role: Role.MEMBER },
					],
				},
			},
		});
	}

	const existingGroupChat = await prisma.chat.findFirst({
		where: {
			type: ChatType.GROUP,
			AND: [
				{ members: { some: { userId: alice.id } } },
				{ members: { some: { userId: bob.id } } },
				{ members: { some: { userId: carol.id } } },
				{ members: { every: { userId: { in: [alice.id, bob.id, carol.id] } } } },
			],
		},
	});

	if (!existingGroupChat) {
		await prisma.chat.create({
			data: {
				type: ChatType.GROUP,
				members: {
					create: [
						{ userId: alice.id, role: Role.ADMIN },
						{ userId: bob.id, role: Role.MEMBER },
						{ userId: carol.id, role: Role.MEMBER },
					],
				},
			},
		});
	}
};

void seed()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (error: unknown) => {
		console.error('Prisma seed failed', error);
		await prisma.$disconnect();
		process.exit(1);
	});
