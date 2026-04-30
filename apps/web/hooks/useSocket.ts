'use client';

import { useEffect, useState } from 'react';
import type { ChatSocketClient } from '../services/socket';
import { socketLifecycleAdapter } from '../services/socketAdapter';
import type { SocketLifecycleAdapter } from '../services/socketAdapter';
import { ENABLE_REALTIME_SOCKET } from '../lib/constants';

type ConnectionState = 'mock' | 'connecting' | 'connected' | 'disconnected';

interface UseSocketOptions {
	lifecycleAdapter?: SocketLifecycleAdapter;
}

export const useSocket = ({ lifecycleAdapter = socketLifecycleAdapter }: UseSocketOptions = {}) => {
	const [connectionState, setConnectionState] = useState<ConnectionState>(
		ENABLE_REALTIME_SOCKET ? 'connecting' : 'mock',
	);
	const [socket, setSocket] = useState<ChatSocketClient | null>(null);

	useEffect(() => {
		if (!ENABLE_REALTIME_SOCKET) {
			setConnectionState('mock');
			return;
		}

		const activeSocket = lifecycleAdapter.acquire();
		setSocket(activeSocket);
		setConnectionState(activeSocket.connected ? 'connected' : 'connecting');

		const handleConnect = () => {
			setConnectionState('connected');
		};

		const handleDisconnect = () => {
			setConnectionState('disconnected');
		};

		const handleConnectError = () => {
			setConnectionState('disconnected');
		};

		activeSocket.on('connect', handleConnect);
		activeSocket.on('disconnect', handleDisconnect);
		activeSocket.on('connect_error', handleConnectError);

		return () => {
			activeSocket.off('connect', handleConnect);
			activeSocket.off('disconnect', handleDisconnect);
			activeSocket.off('connect_error', handleConnectError);
			lifecycleAdapter.release();
			setSocket(null);
		};
	}, [lifecycleAdapter]);

	const isConnected = connectionState === 'connected';
	const connectionLabel =
		connectionState === 'mock'
			? 'Mock mode'
			: connectionState === 'connected'
				? 'Connected'
				: connectionState === 'connecting'
					? 'Connecting...'
					: 'Disconnected';

	return {
		socket,
		isConnected,
		isRealtimeEnabled: ENABLE_REALTIME_SOCKET,
		connectionState,
		connectionLabel,
	};
};
