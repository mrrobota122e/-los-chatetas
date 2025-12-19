// Impostor Game - Finite State Machine Types
export type ImpostorGameState =
    | 'IDLE'        // Waiting to start
    | 'ASSIGNMENT'  // Showing roles
    | 'CLUES_TURN'  // Turn-based clues phase
    | 'DISCUSSION'  // Open discussion
    | 'VOTING'      // Voting phase
    | 'RESULT'      // Show elimination result
    | 'NEXT_ROUND'  // Transition to next round
    | 'GAME_END';   // Game finished

export interface Footballer {
    name: string;
    team: string;
    position: string;
    nationality: string;
}

export interface ImpostorPlayer {
    id: string;
    name: string;
    isImpostor: boolean;
    footballer: Footballer | null;
    isEliminated: boolean;
    votesReceived: number;
    clue?: string;
}

export interface ImpostorGameContext {
    roomId: string;
    players: ImpostorPlayer[];
    currentRound: number;
    totalRounds: number;
    currentState: ImpostorGameState;
    currentTurnPlayerIndex: number;
    footballer: Footballer | null;
    votes: Record<string, string>; // voterId => targetId
    eliminatedPlayers: string[];
    winner: 'crew' | 'impostor' | null;
    phaseDuration: number;
    phaseStartTime: number;
}

export interface StateTransition {
    from: ImpostorGameState;
    to: ImpostorGameState;
    condition?: (context: ImpostorGameContext) => boolean;
}
