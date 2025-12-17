export type GameMode = 'NORMAL' | 'ADVANCED';
export type RoomStatus = 'WAITING' | 'IN_GAME' | 'FINISHED';
export type GamePhase = 'CLUES' | 'DISCUSSION' | 'VOTING' | 'ELIMINATION';
export type GameStatus = 'IN_PROGRESS' | 'INNOCENTS_WIN' | 'IMPOSTOR_WIN';
export type PlayerRole = 'INNOCENT' | 'IMPOSTOR';
export type PlayerAction = 'idle' | 'thinking' | 'speaking' | 'voting' | 'eliminated';
export interface Player {
    id: string;
    socketId: string;
    name: string;
    roomId?: string;
    isReady: boolean;
    isHost: boolean;
    avatarColor: string;
    action?: PlayerAction;
}
export interface Room {
    id: string;
    code: string;
    hostId: string;
    maxPlayers: number;
    minPlayers: number;
    mode: GameMode;
    status: RoomStatus;
    players: Player[];
    createdAt: Date;
}
export interface Game {
    id: string;
    roomId: string;
    word: string;
    impostorId: string;
    currentRound: number;
    maxRounds: number;
    phase: GamePhase;
    status: GameStatus;
    players: Player[];
    startedAt: Date;
}
export interface ChatMessage {
    playerId: string;
    playerName: string;
    message: string;
    timestamp: number;
    type?: 'normal' | 'system' | 'clue';
}
export interface VoteResult {
    voterId: string;
    targetId: string;
}
export interface GameStatistics {
    totalRounds: number;
    totalVotes: number;
    duration: number;
    mvp: {
        playerId: string;
        playerName: string;
        reason: string;
    };
}
//# sourceMappingURL=index.d.ts.map