import { TypedSocket, TypedServer } from '../index.js';
import { logger } from '../../utils/logger.js';
import prisma from '../../database/prisma.js';

// In-memory game state for simplicity (could be moved to DB/Redis)
interface GuessWhoGameState {
    roomId: string;
    players: {
        [socketId: string]: {
            id: string;
            name: string;
            selectedPlayerId?: string;
            eliminated: string[];
        }
    };
    currentTurn?: string; // socketId
    status: 'SELECTION' | 'PLAYING' | 'FINISHED';
    winner?: string;
}

const games = new Map<string, GuessWhoGameState>();

export function handleGuessWhoEvents(socket: TypedSocket, io: TypedServer) {

    // Initialize game (Host starts)
    socket.on('guesswho:init', async ({ roomId }) => {
        try {
            // Verify host
            const room = await prisma.room.findUnique({
                where: { id: roomId },
                include: { players: true }
            });

            if (!room || room.hostId !== socket.id) return;
            if (room.players.length < 2) return; // Need 2 players

            // Initialize game state
            const game: GuessWhoGameState = {
                roomId,
                players: {},
                status: 'SELECTION'
            };

            room.players.forEach(p => {
                game.players[p.socketId] = {
                    id: p.id,
                    name: p.name,
                    eliminated: []
                };
            });

            games.set(roomId, game);

            // Notify all players to start selection
            io.to(roomId).emit('guesswho:start-selection');
            logger.info(`Guess Who game initialized in room ${roomId}`);

        } catch (error) {
            logger.error('Error in guesswho:init:', error);
        }
    });

    // Player selects their secret character
    socket.on('guesswho:select-player', async ({ roomId, playerId }) => {
        try {
            const game = games.get(roomId);

            // Game must be initialized first
            if (!game || game.status !== 'SELECTION') return;

            // Record selection
            if (game.players[socket.id]) {
                game.players[socket.id].selectedPlayerId = playerId;
                logger.info(`Player ${socket.id} selected character ${playerId} in room ${roomId}`);
            }

            // Check if both players have selected
            const playerIds = Object.keys(game.players);
            const allSelected = playerIds.length === 2 && playerIds.every(pid => game!.players[pid].selectedPlayerId);

            if (allSelected) {
                game.status = 'PLAYING';
                // Randomly pick first turn
                game.currentTurn = playerIds[Math.floor(Math.random() * playerIds.length)];

                // Notify players
                const player1 = game.players[playerIds[0]];
                const player2 = game.players[playerIds[1]];

                // Send start event to each player with opponent's name (but NOT secret player)
                io.to(playerIds[0]).emit('guesswho:game-started', {
                    roomId,
                    opponentName: player2.name,
                    firstTurn: game.currentTurn
                });

                io.to(playerIds[1]).emit('guesswho:game-started', {
                    roomId,
                    opponentName: player1.name,
                    firstTurn: game.currentTurn
                });

                logger.info(`Guess Who game started in room ${roomId}`);
            }

        } catch (error) {
            logger.error('Error in guesswho:select-player:', error);
        }
    });

    // Player asks a question
    socket.on('guesswho:ask-question', ({ roomId, question, questionId }) => {
        const game = games.get(roomId);
        if (!game || game.status !== 'PLAYING' || game.currentTurn !== socket.id) return;

        // Broadcast to opponent
        socket.to(roomId).emit('guesswho:question-received', {
            question,
            questionId
        });

        logger.debug(`Question in room ${roomId}: ${question}`);
    });

    // Simple chat message (for simplified game)
    socket.on('guesswho:send-message', ({ roomId, text }) => {
        const game = games.get(roomId);
        if (!game || game.status !== 'PLAYING') return;

        // Get player name
        const playerName = game.players[socket.id]?.name || 'Jugador';

        // Broadcast to opponent
        socket.to(roomId).emit('guesswho:message-received', {
            sender: playerName,
            text
        });

        logger.debug(`Chat message in room ${roomId}: ${text}`);
    });

    // Chat handler for multiplayer free chat
    socket.on('guesswho:send-chat', async ({ roomId, message }) => {
        try {
            const game = games.get(roomId);
            if (!game) return;

            const player = game.players[socket.id];
            if (!player) return;

            // Broadcast to entire room
            io.to(roomId).emit('guesswho:chat', {
                sender: player.name,
                message
            });

            logger.debug(`Chat from ${player.name}: ${message}`);
        } catch (error) {
            logger.error('Error in guesswho:send-chat:', error);
        }
    });

    // Opponent answers
    socket.on('guesswho:answer', ({ roomId, answer }) => {
        const game = games.get(roomId);
        if (!game || game.status !== 'PLAYING') return;

        // Broadcast answer back to asker
        socket.to(roomId).emit('guesswho:answer-received', {
            answer,
            question: '' // Client should know context, or we could track it
        });

        // Switch turn
        const playerIds = Object.keys(game.players);
        const nextTurn = playerIds.find(id => id !== game.currentTurn);
        if (nextTurn) {
            game.currentTurn = nextTurn;
            io.to(roomId).emit('guesswho:turn-change', { currentTurn: nextTurn });
        }
    });

    // Player makes a final guess
    socket.on('guesswho:guess', ({ roomId, targetPlayerId }) => {
        const game = games.get(roomId);
        if (!game || game.status !== 'PLAYING' || game.currentTurn !== socket.id) return;

        // Check against opponent's secret player
        const playerIds = Object.keys(game.players);
        const opponentId = playerIds.find(id => id !== socket.id);

        if (!opponentId) return;

        const opponent = game.players[opponentId];
        const isCorrect = opponent.selectedPlayerId === targetPlayerId;

        if (isCorrect) {
            // Win!
            game.status = 'FINISHED';
            game.winner = socket.id;

            io.to(roomId).emit('guesswho:game-ended', {
                winner: socket.id,
                reason: 'CORRECT_GUESS',
                opponentSecretPlayer: opponent.selectedPlayerId // Reveal
            });
        } else {
            // Wrong guess - lose turn or lose game? 
            // Standard rules: usually lose game or just turn. Let's say lose turn for now, or maybe just notify.
            // For high stakes, maybe lose game? Let's implement "Lose Turn" + notification

            socket.emit('guesswho:opponent-guessed', {
                correct: false,
                targetPlayerId
            });

            // Switch turn
            game.currentTurn = opponentId;
            io.to(roomId).emit('guesswho:turn-change', { currentTurn: opponentId });
        }
    });

    // Restart game
    socket.on('guesswho:restart', ({ roomId }) => {
        const game = games.get(roomId);
        if (game) {
            game.status = 'SELECTION';
            Object.values(game.players).forEach(p => {
                p.selectedPlayerId = undefined;
                p.eliminated = [];
            });
            // Notify to reset UI
            // We can just re-use room:state or custom event. 
            // For now, clients can just navigate back or reset state.
        }
    });
}
