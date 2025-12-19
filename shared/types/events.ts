// Eventos WebSocket compartidos

// Cliente → Servidor
export interface ClientToServerEvents {
    // Room events
    'room:create': (data: { hostName: string; maxPlayers: number; mode: 'NORMAL' | 'ADVANCED' | 'GUESS_WHO'; botMode?: boolean }) => void;
    'room:join': (data: { roomCode: string; playerName: string }) => void;
    'room:leave': (data: { roomId: string }) => void;
    'room:get-state': (data: { roomCode: string }) => void;
    'player:ready': (data: { roomId: string; isReady: boolean }) => void;

    // Guess Who Events
    'guesswho:select-player': (data: { roomId: string; playerId: string }) => void;
    'guesswho:ask-question': (data: { roomId: string; question: string; questionId?: string }) => void;
    'guesswho:answer': (data: { roomId: string; answer: 'yes' | 'no' }) => void;
    'guesswho:guess': (data: { roomId: string; targetPlayerId: string }) => void;
    'guesswho:restart': (data: { roomId: string }) => void;
    'guesswho:init': (data: { roomId: string }) => void;

    // Chat events
    'chat:message': (data: { roomId: string; message: string }) => void;

    // Presence events
    'player:action': (data: { roomId: string; action: string }) => void;
}

// Servidor → Cliente
export interface ServerToClientEvents {
    // Connection
    'connect': () => void;
    'disconnect': (reason: string) => void;

    // Room events
    'room:created': (data: { roomId: string; roomCode: string; hostId: string; maxPlayers: number; mode: string }) => void;
    'room:joined': (data: { roomId: string; players: any[]; hostId: string; maxPlayers: number; mode: string }) => void;
    'room:state': (data: { roomId: string; players: any[]; hostId: string; maxPlayers: number; mode: string }) => void;
    'room:updated': (data: { players: any[] }) => void;
    'room:player-joined': (data: { player: any; totalPlayers: number }) => void;
    'room:player-left': (data: { playerId: string; playerName: string; totalPlayers: number }) => void;
    'room:error': (data: { code: string; message: string }) => void;

    // Guess Who Events
    'guesswho:start-selection': () => void;
    'guesswho:game-started': (data: { roomId: string; opponentName: string; firstTurn: string }) => void;
    'guesswho:turn-change': (data: { currentTurn: string }) => void;
    'guesswho:question-received': (data: { question: string; questionId?: string }) => void;
    'guesswho:answer-received': (data: { answer: 'yes' | 'no'; question: string }) => void;
    'guesswho:game-ended': (data: { winner: string; reason: string; opponentSecretPlayer?: any }) => void;
    'guesswho:opponent-guessed': (data: { correct: boolean; targetPlayerId: string }) => void;

    // Chat events
    'chat:new-message': (data: { playerId: string; playerName: string; message: string; timestamp: number; type?: string }) => void;

    // Timer events
    'timer:tick': (data: { remaining: number; phase: string; round: number }) => void;

    // Presence events
    'player:updated': (data: { playerId: string; action: string; timestamp: number }) => void;

    // Error events
    'error': (data: { code: string; message: string; details?: any }) => void;
}

export interface InterServerEvents {
    ping: () => void;
}

export interface SocketData {
    playerId: string;
    playerName: string;
    roomId?: string;
}
