import { browser } from '$app/environment';
import { writable as storageWritable } from 'svelte-local-storage-store';
import { readable, writable } from 'svelte/store';
import type { MultiplayerGame } from './types';

/**
 * Stores current time. Updates every second.
 */
export const time = readable(new Date(), (set) => {
    const interval = setInterval(() => set(new Date()), 1000);
    return () => clearInterval(interval);
});

export function multiplayerWSStore(webSocketURL: string) {
    let socket: WebSocket | undefined;

    const { subscribe } = writable<MultiplayerGame | undefined>(
        undefined,
        (set) => {
            if (!browser) {
                return;
            }

            try {
                socket = new WebSocket(webSocketURL);
            } catch {
                set(undefined);
                return;
            }

            let lastPingTime = Date.now();
            let lastPingMs = 0;

            socket.addEventListener('open', () => {
                console.log('Connecting to web socket');
            });
            socket.addEventListener('message', (message) => {
                const data = JSON.parse(message.data);
                if (data.type === 'game') {
                    set(data?.data);
                } else if (data.type === 'pong') {
                    lastPingMs = Date.now() - lastPingTime;
                }
            });

            const interval = setInterval(() => {
                lastPingTime = Date.now();
                socket?.send(
                    JSON.stringify({
                        type: 'ping',
                        data: { id: crypto.randomUUID(), lastPingMs },
                    }),
                );
            }, 1000);

            return () => {
                socket?.close();
                socket = undefined;
                clearInterval(interval);
            };
        },
    );

    const updatePosition = (position: number) => {
        socket?.send(
            JSON.stringify({ type: 'update-position', data: position }),
        );
    };

    return {
        subscribe,
        updatePosition,
    };
}

export interface Preferences {
    name: string;
}

export const preferences = storageWritable<Preferences | undefined>(
    'preferences',
    undefined,
);
