import { browser } from '$app/env';
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

            socket = new WebSocket(webSocketURL);
            socket.addEventListener('open', () => {
                console.log('Connecting to web socket');
            });
            socket.addEventListener('message', (message) => {
                const data = JSON.parse(message.data);
                if (data.type === 'game') {
                    set(data?.data);
                }
            });

            return () => {
                socket?.close();
                socket = undefined;
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
    userId: string;
}

export const preferences = storageWritable<Preferences | undefined>(
    'preferences',
    undefined,
);
