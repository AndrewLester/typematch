export interface User {
    id: string;
    name: string;
    city: string | undefined;
    country: string;
    webSocket: WebSocket;
    ping: number;
    position: number;
}

export const enum GameState {
    Waiting,
    Playing,
    Finished,
}

export interface MultiplayerGame {
    state: GameState;
    users: Record<string, User>;
    passageIndex: number;
}
