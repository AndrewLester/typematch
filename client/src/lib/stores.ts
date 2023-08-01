import { browser } from '$app/environment';
import { persisted } from 'svelte-local-storage-store';
import { readable, writable } from 'svelte/store';
import { sleep } from './async';
import type { SingleplayerStatistics } from './statistics';
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
        (_, update) => {
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
                        update((game) => {
                            const local = game?.local || {};
                            const now = Date.now();
                            const useNow = (time: number) =>
                                Math.abs(now - time) < 10000;
                            const update = (property: keyof typeof local) => {
                                if (data.data[property] && !local[property]) {
                                    local[property] = useNow(
                                        data.data[property],
                                    )
                                        ? now
                                        : data.data[property];
                                }
                            };
                            update('countdownTime');

                            return { local, ...data.data };
                        });
                    } else if (data.type === 'pong') {
                        lastPingMs = Date.now() - lastPingTime;
                    }
                });
                socket.addEventListener('close', async () => {
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

    const isConnected = () => {
        if (!socket) return false;
        return socket.readyState === WebSocket.OPEN;
    };

    const updatePosition = (position: number) => {
        if (!isConnected()) return;
        socket?.send(
            JSON.stringify({ type: 'update-position', data: position }),
        );
    };

    const sendStatistics = (statistics: SingleplayerStatistics) => {
        if (!isConnected()) return;
        socket?.send(JSON.stringify({ type: 'statistics', data: statistics }));
    };

    return {
        subscribe,
        updatePosition,
        sendStatistics,
        isConnected,
    };
}

export interface Preferences {
    name: string;
}

export const preferences = persisted<Preferences | undefined>(
    'preferences',
    undefined,
);
