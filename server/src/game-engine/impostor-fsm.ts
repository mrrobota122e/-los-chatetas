import type { ImpostorGameState, ImpostorGameContext, StateTransition } from './types.js';

/**
 * Impostor Game Finite State Machine
 * Manages strict game flow with automatic state transitions
 */
export class ImpostorGameFSM {
    private state: ImpostorGameState = 'IDLE';
    private context: ImpostorGameContext;
    private transitions: StateTransition[] = [];
    private timer: NodeJS.Timeout | null = null;

    constructor(initialContext: ImpostorGameContext) {
        this.context = initialContext;
        this.defineTransitions();
    }

    private defineTransitions() {
        this.transitions = [
            { from: 'IDLE', to: 'ASSIGNMENT' },
            { from: 'ASSIGNMENT', to: 'CLUES_TURN' },
            { from: 'CLUES_TURN', to: 'DISCUSSION', condition: (ctx) => this.allCluesSubmitted(ctx) },
            { from: 'DISCUSSION', to: 'VOTING' },
            { from: 'VOTING', to: 'RESULT', condition: (ctx) => this.allVotesCast(ctx) },
            { from: 'RESULT', to: 'GAME_END', condition: (ctx) => ctx.winner !== null },
            { from: 'RESULT', to: 'NEXT_ROUND', condition: (ctx) => ctx.winner === null },
            { from: 'NEXT_ROUND', to: 'ASSIGNMENT' },
        ];
    }

    /**
     * Transition to a new state
     */
    transition(newState: ImpostorGameState): boolean {
        const validTransition = this.transitions.find(
            (t) => t.from === this.state && t.to === newState
        );

        if (!validTransition) {
            console.error(`Invalid transition from ${this.state} to ${newState}`);
            return false;
        }

        if (validTransition.condition && !validTransition.condition(this.context)) {
            console.error(`Transition condition not met for ${this.state} → ${newState}`);
            return false;
        }

        console.log(`🔀 State transition: ${this.state} → ${newState}`);
        this.state = newState;
        return true;
    }

    /**
     * Auto-advance to next state after timer
     */
    autoAdvance(duration: number, nextState: ImpostorGameState, callback?: () => void) {
        if (this.timer) {
            clearTimeout(this.timer);
        }

        this.timer = setTimeout(() => {
            const success = this.transition(nextState);
            if (success && callback) {
                callback();
            }
        }, duration);
    }

    /**
     * Checks
     */
    private allCluesSubmitted(ctx: ImpostorGameContext): boolean {
        const activePlayers = ctx.players.filter(p => !p.isEliminated);
        return activePlayers.every(p => p.clue !== undefined && p.clue !== '');
    }

    private allVotesCast(ctx: ImpostorGameContext): boolean {
        const activePlayers = ctx.players.filter(p => !p.isEliminated);
        return Object.keys(ctx.votes).length === activePlayers.length;
    }

    /**
     * Getters
     */
    getState(): ImpostorGameState {
        return this.state;
    }

    getContext(): ImpostorGameContext {
        return this.context;
    }

    updateContext(updates: Partial<ImpostorGameContext>) {
        this.context = { ...this.context, ...updates };
    }

    /**
     * Validate action against current state
     */
    canPerformAction(action: 'SEND_CLUE' | 'VOTE' | 'CHAT'): boolean {
        switch (action) {
            case 'SEND_CLUE':
                return this.state === 'CLUES_TURN';
            case 'VOTE':
                return this.state === 'VOTING';
            case 'CHAT':
                return this.state === 'DISCUSSION';
            default:
                return false;
        }
    }

    cleanup() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
}
