export interface User {
    id: string;
    name: string;
    country: string;
    ping: number;
    position: number;
    connected: boolean;
    admin: boolean;
    finished?: number;
}

export const enum GameState {
    Waiting,
    Countdown,
    Playing,
    Finished,
}

export const countdownTime = 10000;

export interface MultiplayerGame {
    state: GameState;
    startTime?: number;
    endTime?: number;
    countdownTime?: number;
    users: Record<string, User>;
    passage?: {
        index: number;
        length: number;
    };
    statistics: Record<string, any>;
}
