import { ImpostorGameFSM } from './impostor-fsm.js';
import { ChatController } from './chat-controller.js';
import { getRandomFootballer } from './footballer-service.js';
import type { TypedServer } from '../sockets/index.js';
import type { ImpostorGameContext, ImpostorPlayer, Footballer } from './types.js';

/**
 * Game Controller - orchestrates the entire impostor game flow
 */
export class ImpostorGameController {
    private fsm: ImpostorGameFSM;
    private chatController: ChatController;
    private io: TypedServer;
    private roomId: string;

    // Game configuration
    private readonly ASSIGNMENT_DURATION = 10000; // 10s
    private readonly CLUE_TURN_DURATION = 30000; // 30s per player
    private readonly DISCUSSION_DURATION = 90000; // 90s
    private readonly VOTING_DURATION = 45000; // 45s
    private readonly RESULT_DURATION = 8000; // 8s

    constructor(roomId: string, players: any[], io: TypedServer) {
        this.roomId = roomId;
        this.io = io;

        // Initialize FSM context
        const initialContext: ImpostorGameContext = {
            roomId,
            players: this.initializePlayers(players),
            currentRound: 1,
            totalRounds: 3,
            currentState: 'IDLE',
            currentTurnPlayerIndex: 0,
            footballer: null,
            votes: {},
            eliminatedPlayers: [],
            winner: null,
            phaseDuration: 0,
            phaseStartTime: Date.now(),
        };

        this.fsm = new ImpostorGameFSM(initialContext);
        this.chatController = new ChatController(roomId, io);
    }

    /**
     * Initialize players with impostor assignment
     */
    private initializePlayers(rawPlayers: any[]): ImpostorPlayer[] {
        // Select random footballer
        const footballer = getRandomFootballer();

        // Select random impostor
        const impostorIndex = Math.floor(Math.random() * rawPlayers.length);

        return rawPlayers.map((p, index) => ({
            id: p.id,
            name: p.name,
            isImpostor: index === impostorIndex,
            footballer: index === impostorIndex ? null : footballer,
            isEliminated: false,
            votesReceived: 0,
            clue: undefined,
        }));
    }

    /**
     * Start the game
     */
    async startGame() {
        console.log(`🎮 Starting Impostor Game in room ${this.roomId}`);

        // Transition to ASSIGNMENT
        this.fsm.transition('ASSIGNMENT');

        // Send roles to each player privately
        const context = this.fsm.getContext();
        context.players.forEach(player => {
            const socketId = this.getSocketIdForPlayer(player.id);
            if (socketId) {
                this.io.to(socketId).emit('impostor:role-assigned', {
                    footballer: player.footballer,
                    isImpostor: player.isImpostor,
                });
            }
        });

        // Broadcast state change
        this.broadcastStateChange('ASSIGNMENT', this.ASSIGNMENT_DURATION);

        // Auto-advance to CLUES_TURN after assignment duration
        setTimeout(() => {
            this.startCluePhase();
        }, this.ASSIGNMENT_DURATION);
    }

    /**
     * Start clue/pistas phase (turn-based)
     */
    private startCluePhase() {
        this.fsm.transition('CLUES_TURN');
        this.chatController.lockAllChats();

        // Start first player's turn
        this.startNextPlayerTurn();
    }

    /**
     * Start next player's turn
     */
    private startNextPlayerTurn() {
        const context = this.fsm.getContext();
        const activePlayers = context.players.filter(p => !p.isEliminated);

        if (context.currentTurnPlayerIndex >= activePlayers.length) {
            // All players have given clues, move to discussion
            this.startDiscussionPhase();
            return;
        }

        const currentPlayer = activePlayers[context.currentTurnPlayerIndex];

        // Enable chat for this player only
        this.chatController.enableTurnChat(currentPlayer.id);

        // Broadcast turn change
        this.io.to(this.roomId).emit('impostor:turn-changed', {
            playerId: currentPlayer.id,
            playerName: currentPlayer.name,
            duration: this.CLUE_TURN_DURATION,
        });

        // Auto-advance after time if no clue submitted
        setTimeout(() => {
            if (!currentPlayer.clue) {
                // Player didn't send clue, skip them
                this.advanceToNextTurn();
            }
        }, this.CLUE_TURN_DURATION);
    }

    /**
     * Handle clue submission
     */
    handleClueSubmission(playerId: string, clue: string) {
        const context = this.fsm.getContext();
        const player = context.players.find(p => p.id === playerId);

        if (!player) return;
        if (!this.chatController.canSendClue(playerId)) {
            console.warn(`Player ${playerId} tried to send clue out of turn`);
            return;
        }

        // Save clue
        player.clue = clue;

        // Broadcast clue to everyone
        this.io.to(this.roomId).emit('impostor:clue-received', {
            playerId: player.id,
            playerName: player.name,
            clue,
        });

        // Disable this player's chat and move to next
        this.chatController.disableTurnChat();
        this.advanceToNextTurn();
    }

    /**
     * Advance to next player's turn
     */
    private advanceToNextTurn() {
        const context = this.fsm.getContext();
        context.currentTurnPlayerIndex++;
        this.fsm.updateContext({ currentTurnPlayerIndex: context.currentTurnPlayerIndex });

        // Start next turn
        this.startNextPlayerTurn();
    }

    /**
     * Start discussion phase
     */
    private startDiscussionPhase() {
        this.fsm.transition('DISCUSSION');
        this.chatController.enableDiscussionChat();

        this.broadcastStateChange('DISCUSSION', this.DISCUSSION_DURATION);

        // Auto-advance to voting
        setTimeout(() => {
            this.startVotingPhase();
        }, this.DISCUSSION_DURATION);
    }

    /**
     * Start voting phase
     */
    private startVotingPhase() {
        this.fsm.transition('VOTING');
        this.chatController.lockAllChats();

        this.broadcastStateChange('VOTING', this.VOTING_DURATION);

        // Auto-advance after voting time (or when all votes cast)
        setTimeout(() => {
            this.tallyVotes();
        }, this.VOTING_DURATION);
    }

    /**
     * Handle vote submission
     */
    handleVote(voterId: string, targetId: string) {
        if (!this.fsm.canPerformAction('VOTE')) {
            console.warn(`Vote rejected - not in voting phase`);
            return;
        }

        const context = this.fsm.getContext();
        context.votes[voterId] = targetId;
        this.fsm.updateContext({ votes: context.votes });

        // Check if all votes are in
        const activePlayers = context.players.filter(p => !p.isEliminated);
        if (Object.keys(context.votes).length === activePlayers.length) {
            // All voted, tally immediately
            this.tallyVotes();
        }
    }

    /**
     * Tally votes and determine elimination
     */
    private tallyVotes() {
        const context = this.fsm.getContext();
        const voteCount: Record<string, number> = {};

        // Count votes
        Object.values(context.votes).forEach(targetId => {
            voteCount[targetId] = (voteCount[targetId] || 0) + 1;
        });

        // Find player with most votes
        let maxVotes = 0;
        let eliminatedPlayerId: string | null = null;
        let isTie = false;

        Object.entries(voteCount).forEach(([playerId, votes]) => {
            if (votes > maxVotes) {
                maxVotes = votes;
                eliminatedPlayerId = playerId;
                isTie = false;
            } else if (votes === maxVotes && votes > 0) {
                isTie = true;
            }
        });

        this.fsm.transition('RESULT');

        if (isTie || !eliminatedPlayerId) {
            // No elimination
            this.io.to(this.roomId).emit('impostor:votes-tallied', {
                results: voteCount,
                eliminated: null,
                tie: true,
            });

            setTimeout(() => this.checkWinCondition(), this.RESULT_DURATION);
            return;
        }

        // Eliminate player
        const eliminatedPlayer = context.players.find(p => p.id === eliminatedPlayerId)!;
        eliminatedPlayer.isEliminated = true;
        context.eliminatedPlayers.push(eliminatedPlayerId);

        this.io.to(this.roomId).emit('impostor:player-eliminated', {
            playerId: eliminatedPlayer.id,
            playerName: eliminatedPlayer.name,
            wasImpostor: eliminatedPlayer.isImpostor,
        });

        setTimeout(() => this.checkWinCondition(), this.RESULT_DURATION);
    }

    /**
     * Check win conditions
     */
    private checkWinCondition() {
        const context = this.fsm.getContext();
        const activePlayers = context.players.filter(p => !p.isEliminated);
        const impostor = context.players.find(p => p.isImpostor);

        // Crew wins if impostor eliminated
        if (impostor?.isEliminated) {
            context.winner = 'crew';
            this.fsm.updateContext({ winner: 'crew' });
            this.endGame();
            return;
        }

        // Impostor wins if 1v1
        if (activePlayers.length === 2) {
            context.winner = 'impostor';
            this.fsm.updateContext({ winner: 'impostor' });
            this.endGame();
            return;
        }

        // Continue to next round
        this.startNextRound();
    }

    /**
     * Start next round
     */
    private startNextRound() {
        const context = this.fsm.getContext();

        if (context.currentRound >= context.totalRounds) {
            // Max rounds reached, impostor wins
            context.winner = 'impostor';
            this.fsm.updateContext({ winner: 'impostor' });
            this.endGame();
            return;
        }

        this.fsm.transition('NEXT_ROUND');

        // Reset for new round
        context.currentRound++;
        context.currentTurnPlayerIndex = 0;
        context.votes = {};
        context.players.forEach(p => p.clue = undefined);

        this.fsm.updateContext(context);

        setTimeout(() => this.startGame(), 3000);
    }

    /**
     * End game
     */
    private endGame() {
        this.fsm.transition('GAME_END');
        const context = this.fsm.getContext();
        const impostor = context.players.find(p => p.isImpostor)!;

        this.io.to(this.roomId).emit('impostor:game-ended', {
            winner: context.winner!,
            impostorId: impostor.id,
            footballer: impostor.footballer?.name || context.players[0].footballer?.name || 'Unknown',
        });

        this.cleanup();
    }

    /**
     * Utility methods
     */
    private broadcastStateChange(state: string, duration: number) {
        this.io.to(this.roomId).emit('impostor:state-changed', {
            state,
            context: this.fsm.getContext(),
            duration,
        });
    }

    private getSocketIdForPlayer(playerId: string): string | null {
        // This would need to be implemented with actual socket tracking
        // For now, return null (implementation needed in socket handler)
        return null;
    }

    cleanup() {
        this.fsm.cleanup();
        console.log(`🧹 Cleaned up game controller for room ${this.roomId}`);
    }
}
