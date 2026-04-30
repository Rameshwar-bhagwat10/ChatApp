import type { ChatSocketClient } from './socket';
import { acquireSocketClient, releaseSocketClient } from './socket';

export interface SocketLifecycleAdapter {
	acquire: () => ChatSocketClient;
	release: () => void;
}

export const socketLifecycleAdapter: SocketLifecycleAdapter = {
	acquire: () => acquireSocketClient(),
	release: () => releaseSocketClient(),
};
