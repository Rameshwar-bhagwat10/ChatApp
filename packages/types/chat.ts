export type ChatType = 'direct' | 'group';

export interface Chat {
	id: string;
	type: ChatType;
	name?: string;
	memberIds: string[];
	createdAt: string;
	updatedAt: string;
}
