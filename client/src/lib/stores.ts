import { browser } from '$app/environment';
import { writable as storageWritable } from 'svelte-local-storage-store';
import { readable, writable } from 'svelte/store';
import { sleep } from './async';
import type { MultiplayerGame } from './types';

export const clock = (interval: number) =>
    readable(new Date(), (set) => {
        const intervalId = setInterval(() => set(new Date()), interval);
        return () => clearInterval(intervalId);
    });
export const time = clock(1000);

export function multiplayerWSStore(webSocketURL: string) {
    let socket: WebSocket | undefined;
    let manuallyClosed = false;

    const { subscribe } = writable<MultiplayerGame | undefined>(
        undefined,
        (set) => {
            if (!browser) {
                return;
            }

            manuallyClosed = false;

            const connect = (delay = 1000) => {
                try {
                    socket = new WebSocket(webSocketURL);
                } catch (e) {
                    console.log(e);
                    return;
                }

                let interval: any = null;
                let lastPingTime = Date.now();
                let lastPingMs = 0;

                socket.addEventListener('open', () => {
                    console.log('Connecting to web socket');

                    interval = setInterval(() => {
                        lastPingTime = Date.now();

                        socket?.send(
                            JSON.stringify({
                                type: 'ping',
                                data: { id: crypto.randomUUID(), lastPingMs },
                            }),
                        );
                    }, 1000);
                });
                socket.addEventListener('message', (message) => {
                    const data = JSON.parse(message.data);
                    if (data.type === 'game') {
                        set(data?.data);
                    } else if (data.type === 'pong') {
                        lastPingMs = Date.now() - lastPingTime;
                    }
                });
                socket.addEventListener('close', async () => {
                    console.log('closed :(');
                    clearInterval(interval);
                    // attempt to reconnect
                    await sleep(delay);

                    if (!manuallyClosed) {
                        connect(delay * 2);
                    }
                });
            };

            connect();

            return () => {
                socket?.close();
                socket = undefined;
                manuallyClosed = true;
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
