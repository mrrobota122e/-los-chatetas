import type { TypedSocket, TypedServer } from '../index.js';
import { ImpostorGameController } from '../../game-engine/impostor-controller.js';
import { logger } from '../../utils/logger.js';

// Store active games by roomId
const activeGames = new Map<string, ImpostorGameController>();

// Store socket to player mapping
const socketToPlayer = new Map<string, { playerId: string; roomId: string }>();

export function handleImpostorV2Events(socket: TypedSocket, io: TypedServer) {

    /**
     * Start impostor game
     */
    socket.on('impostor:start-game', async (data) => {
        const { roomId } = data;

        try {
            logger.info(`Starting Impostor V2 game in room ${roomId}`);

            // Get room and players (this would need actual room service integration)
            // For now, we'll create a mock - you'll need to integrate with your actual room service
            const room = await getRoomData(roomId);

            if (!room) {
                socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
                return;
            }

            // Create game controller
            const gameController = new ImpostorGameController(roomId, room.players, io);
            activeGames.set(roomId, gameController);

            // Track socket to player mapping
            room.players.forEach((player: any) => {
                const playerSocket = getSocketForPlayer(player.id, io);
                if (playerSocket) {
                    socketToPlayer.set(playerSocket.id, { playerId: player.id, roomId });
                }
            });

            // Start the game
            await gameController.startGame();

        } catch (error) {
            logger.error('Error starting impostor game:', error);
            socket.emit('error', { code: 'GAME_START_ERROR', message: 'Failed to start game' });
        }
    });

    /**
     * Send clue (turn-based)
     */
    socket.on('impostor:send-clue', (data) => {
        const { roomId, clue } = data;
        const playerData = socketToPlayer.get(socket.id);

        if (!playerData || playerData.roomId !== roomId) {
            logger.warn('Invalid clue submission - player not in room');
            return;
        }

        const game = activeGames.get(roomId);
        if (!game) {
            logger.warn('Game not found for clue submission');
            return;
        }

        game.handleClueSubmission(playerData.playerId, clue);
    });

    /**
     * Send discussion message
     */
    socket.on('impostor:chat-message', (data) => {
        const { roomId, message } = data;
        const playerData = socketToPlayer.get(socket.id);

        if (!playerData || playerData.roomId !== roomId) {
            return;
        }

        // Broadcast message to room (chat controller will validate)
        io.to(roomId).emit('chat:new-message', {
            playerId: playerData.playerId,
            playerName: 'Player', // You'd get this from room data
            message,
            timestamp: Date.now(),
            type: 'discussion'
        });
    });

    /**
     * Vote for player
     */
    socket.on('impostor:vote', (data) => {
        const { roomId, targetPlayerId } = data;
        const playerData = socketToPlayer.get(socket.id);

        if (!playerData || playerData.roomId !== roomId) {
            logger.warn('Invalid vote - player not in room');
            return;
        }

        const game = activeGames.get(roomId);
        if (!game) {
            logger.warn('Game not found for vote');
            return;
        }

        game.handleVote(playerData.playerId, targetPlayerId);
    });

    /**
     * Cleanup on disconnect
     */
    socket.on('disconnect', () => {
        const playerData = socketToPlayer.get(socket.id);
        if (playerData) {
            socketToPlayer.delete(socket.id);
            // TODO: Handle player disconnect in game
        }
    });
}

/**
 * Helper to get room data
 * TODO: Integrate with actual room service
 */
async function getRoomData(roomId: string): Promise<any> {
    // This is a placeholder - integrate with your actual room service
    // For now returning mock data
    return {
        id: roomId,
        players: [] // Would come from actual room service
    };
}

/**
 * Helper to get socket for player ID
 */
function getSocketForPlayer(playerId: string, io: TypedServer): TypedSocket | null {
    // This would need proper implementation with your socket tracking
    // For now returning null - needs integration
    return null;
}
