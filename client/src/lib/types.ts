export interface User {
    id: string;
    name: string;
    country: string;
    ping: number;
    position: number;
    connected: boolean;
    admin: boolean;
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
    startTime: number;
    countdownTime: number;
    users: Record<string, User>;
    passageIndex: number;
}
