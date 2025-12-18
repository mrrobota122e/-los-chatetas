import { TypedSocket, TypedServer } from '../index.js';
import { GameService } from '../../services/game.service.js';
import { logger } from '../../utils/logger.js';
import prisma from '../../database/prisma.js';

const gameService = new GameService();

// Store timeouts to cancel them if voting finishes early
const votingTimeouts = new Map<string, NodeJS.Timeout>();

export function handleGameEvents(socket: TypedSocket, io: TypedServer) {
    // Helper to process votes
    const processVotes = async (roomId: string, gameId: string, round: number, players: any[], game: any) => {
        logger.info(`🗳️ Processing votes for room ${roomId}, round ${round}`);

        // Clear any pending timeout
        if (votingTimeouts.has(roomId)) {
            clearTimeout(votingTimeouts.get(roomId)!);
            votingTimeouts.delete(roomId);
        }

        try {
            const votes = await gameService.getVotes(gameId, round);
            logger.info(`📊 Found ${votes.length} votes in database for game ${gameId}`);

            // Check if there are NO votes at all
            if (votes.length === 0) {
                logger.info(`❌ No votes found in database, emitting game:no-elimination`);
                io.to(roomId).emit('game:no-elimination', {
                    reason: 'NO_VOTES',
                    message: 'Nadie fue eliminado - no hubo votos',
                });
                // Continue to next round anyway
                setTimeout(() => {
                    io.to(roomId).emit('game:next-round', {
                        round: round + 1,
                        eliminatedPlayerId: null,
                        eliminatedPlayerName: null,
                    });
                }, 3000);
                return;
            }

            const voteResults = gameService.calculateVoteResults(votes);
            logger.info(`🗳️ Vote results: ${JSON.stringify(voteResults)}`);

            const voteKeys = Object.keys(voteResults);
            const maxVotes = Math.max(...Object.values(voteResults));

            // Find player with most votes
            const mostVoted = voteKeys.reduce((a, b) =>
                voteResults[a] > voteResults[b] ? a : b
            );

            // Check for tie
            const playersWithMaxVotes = voteKeys.filter(k => voteResults[k] === maxVotes);
            if (playersWithMaxVotes.length > 1) {
                logger.info(`🤝 TIE detected: ${playersWithMaxVotes.length} players with ${maxVotes} votes`);
                io.to(roomId).emit('game:no-elimination', {
                    reason: 'TIE',
                    message: 'Nadie fue eliminado - empate en votación',
                });
                return;
            }

            const eliminatedPlayer = players.find(p => p.id === mostVoted);

            if (eliminatedPlayer) {
                const wasImpostor = eliminatedPlayer.id === game.impostorId;
                logger.info(`🎯 Eliminating ${eliminatedPlayer.name}, wasImpostor: ${wasImpostor}`);

                io.to(roomId).emit('game:player-eliminated', {
                    playerId: eliminatedPlayer.id,
                    playerName: eliminatedPlayer.name,
                    wasImpostor,
                    gameEnded: wasImpostor,
                    winner: wasImpostor ? 'INNOCENTS' : undefined,
                });

                if (wasImpostor) {
                    // Los inocentes ganaron
                    setTimeout(() => {
                        io.to(roomId).emit('game:ended', {
                            winner: 'INNOCENTS',
                            impostorId: game.impostorId,
                            impostorName: eliminatedPlayer.name,
                            word: game.word,
                            statistics: {
                                totalRounds: round,
                                totalVotes: votes.length,
                                duration: 180,
                                mvp: {
                                    playerId: eliminatedPlayer.id,
                                    playerName: eliminatedPlayer.name,
                                    reason: 'Mejor detective',
                                },
                            },
                        });
                    }, 3000);
                } else {
                    // El impostor sigue vivo - continuar con siguiente ronda
                    logger.info(`🔄 Player eliminated was innocent, starting next round...`);
                    setTimeout(() => {
                        io.to(roomId).emit('game:next-round', {
                            round: round + 1,
                            eliminatedPlayerId: eliminatedPlayer.id,
                            eliminatedPlayerName: eliminatedPlayer.name,
                        });
                    }, 4000);
                }
            } else {
                logger.warn(`⚠️ Could not find player ${mostVoted} in room players`);
                io.to(roomId).emit('game:no-elimination', {
                    reason: 'PLAYER_NOT_FOUND',
                    message: 'Error al procesar votación',
                });
            }
        } catch (error) {
            logger.error(`❌ Error processing votes:`, error);
            io.to(roomId).emit('game:no-elimination', {
                reason: 'ERROR',
                message: 'Error al procesar votación',
            });
        }
    };

    // Start game (solo el host puede iniciar)
    socket.on('game:start', async ({ roomId }) => {
        try {
            const game = await gameService.startGame(roomId, socket.id);

            // Obtener los jugadores actualizados de la sala
            const room = await prisma.room.findUnique({
                where: { id: roomId },
                include: { players: true },
            });

            if (!room) {
                throw new Error('Room not found');
            }

            // Parse settings
            let settings = {
                turnDuration: 30,
                discussionDuration: 60,
                votingDuration: 30,
                impostorCount: 1
            };

            try {
                if (room.settings) {
                    const parsed = JSON.parse(room.settings);
                    settings = { ...settings, ...parsed };
                }
            } catch (e) {
                logger.error('Error parsing room settings:', e);
            }

            // Calculate clues duration based on player count
            const cluesDuration = room.players.length * settings.turnDuration;

            // Notificar a todos que el juego comenzó - incluir jugadores
            io.to(roomId).emit('game:started', {
                gameId: game.id,
                totalRounds: game.maxRounds,
                roundDuration: cluesDuration,
                mode: game.mode,
                settings: settings, // Send settings to clients
                players: room.players.map(p => ({
                    id: p.id,
                    socketId: p.socketId,
                    name: p.name,
                    avatarColor: p.avatarColor,
                })),
            });

            // Asignar palabras a cada jugador real (no bots) - enviar evento personalizado
            for (const player of room.players) {
                // Los bots no tienen socket real
                if (player.socketId.startsWith('bot_')) {
                    continue; // Skip bots
                }

                const socketToSend = io.sockets.sockets.get(player.socketId);
                if (socketToSend) {
                    const isImpostor = player.id === game.impostorId;

                    // Enviar datos del juego con la palabra incluida
                    socketToSend.emit('game:your-role', {
                        gameId: game.id,
                        roomId: roomId,
                        word: isImpostor ? null : game.word,
                        isImpostor,
                        role: isImpostor ? 'IMPOSTOR' : 'INNOCENT',
                        players: room.players.map(p => ({
                            id: p.id,
                            socketId: p.socketId,
                            name: p.name,
                            avatarColor: p.avatarColor,
                        })),
                        totalRounds: game.maxRounds,
                    });
                }
            }

            // Iniciar primera fase después de 5 segundos
            setTimeout(() => {
                io.to(roomId).emit('game:phase-changed', {
                    phase: 'CLUES',
                    duration: cluesDuration,
                    round: 1,
                    totalRounds: game.maxRounds,
                });

                // Iniciar primer turno
                if (room.players.length > 0) {
                    const firstPlayer = room.players[0];
                    io.to(roomId).emit('game:turn-changed', {
                        currentPlayerId: firstPlayer.socketId,
                        currentPlayerName: firstPlayer.name,
                        turnDuration: settings.turnDuration,
                        turnNumber: 1,
                        totalPlayers: room.players.length,
                    });
                }

                // Auto-avanzar a discusión después de cluesDuration
                setTimeout(() => {
                    io.to(roomId).emit('game:phase-changed', {
                        phase: 'DISCUSSION',
                        duration: settings.discussionDuration,
                        round: 1,
                        totalRounds: game.maxRounds,
                    });

                    // Auto-avanzar a votación después de discussionDuration
                    setTimeout(() => {
                        io.to(roomId).emit('game:phase-changed', {
                            phase: 'VOTING',
                            duration: settings.votingDuration,
                            round: 1,
                            totalRounds: game.maxRounds,
                        });

                        // Set timeout for voting end
                        const timeout = setTimeout(() => {
                            logger.info(`⏰ Voting timeout reached for room ${roomId}`);
                            processVotes(roomId, game.id, 1, room.players, game);
                        }, settings.votingDuration * 1000);

                        votingTimeouts.set(roomId, timeout);

                    }, settings.discussionDuration * 1000);
                }, cluesDuration * 1000);
            }, 5000);

            logger.info(`Game started in room ${roomId}`);
        } catch (error: any) {
            logger.error('Error starting game:', error);
            socket.emit('room:error', {
                code: 'START_FAILED',
                message: error.message,
            });
        }
    });

    // Send clue - track turns
    const clueTracking = new Map<string, { currentTurn: number, playersSpoken: Set<string> }>();

    socket.on('game:clue', async ({ roomId, gameId, clue, round }) => {
        try {
            await gameService.registerClue(gameId, socket.id, clue, round);

            // Get room data
            const room = await prisma.room.findUnique({
                where: { id: roomId },
                include: { players: true },
            });

            if (!room) return;

            // Initialize tracking for this room if needed
            if (!clueTracking.has(roomId)) {
                clueTracking.set(roomId, { currentTurn: 0, playersSpoken: new Set() });
            }

            const tracking = clueTracking.get(roomId)!;
            tracking.playersSpoken.add(socket.id);

            // Broadcast the clue to everyone
            io.to(roomId).emit('game:clue-received', {
                playerId: socket.id,
                playerName: socket.data.playerName || 'Unknown',
                clue,
                timestamp: Date.now(),
            });

            // Calculate next turn
            const activePlayers = room.players.filter(p => !p.socketId.startsWith('bot_eliminated'));
            tracking.currentTurn++;

            // Check if all players have spoken
            if (tracking.playersSpoken.size >= activePlayers.length) {
                // All players done - emit phase change to discussion
                logger.info(`All players have given clues in room ${roomId}, advancing to discussion`);

                const settings = room.settings ? JSON.parse(room.settings) : { discussionDuration: 45 };

                io.to(roomId).emit('game:phase-changed', {
                    phase: 'DISCUSSION',
                    duration: settings.discussionDuration || 45,
                    round: round,
                });

                // Reset tracking for next round
                tracking.playersSpoken.clear();
                tracking.currentTurn = 0;
            } else {
                // Advance to next player
                const nextPlayer = activePlayers[tracking.currentTurn % activePlayers.length];
                if (nextPlayer) {
                    io.to(roomId).emit('game:turn-changed', {
                        currentPlayerId: nextPlayer.socketId,
                        currentPlayerName: nextPlayer.name,
                        turnNumber: tracking.currentTurn + 1,
                        totalPlayers: activePlayers.length,
                    });
                }
            }

            logger.debug(`Clue from ${socket.data.playerName}: ${clue}`);
        } catch (error: any) {
            logger.error('Error sending clue:', error);
        }
    });

    // Send chat message
    socket.on('game:chat', async ({ roomId, message }) => {
        try {
            // Broadcast the chat to everyone in room
            io.to(roomId).emit('game:chat-message', {
                playerId: socket.id,
                playerName: socket.data.playerName || 'Unknown',
                message,
                timestamp: Date.now(),
            });

            logger.debug(`Chat from ${socket.data.playerName}: ${message}`);
        } catch (error: any) {
            logger.error('Error sending chat:', error);
        }
    });

    // Vote
    socket.on('game:vote', async ({ roomId, gameId, targetPlayerId, round, voterId }) => {
        try {
            let actualVoterId = socket.id;

            // If voterId is provided, verify permissions
            if (voterId) {
                // Check if socket is host
                const room = await prisma.room.findUnique({
                    where: { id: roomId },
                    select: { hostId: true }
                });

                if (room && room.hostId === socket.id) {
                    // Check if target voter is a bot (starts with bot_)
                    // We need to find the player to get their ID, but here we assume voterId IS the player ID
                    // Let's verify the player exists and is a bot
                    const botPlayer = await prisma.player.findUnique({
                        where: { id: voterId }
                    });

                    if (botPlayer && botPlayer.socketId.startsWith('bot_')) {
                        actualVoterId = botPlayer.socketId; // Use bot's socketId (which is fake but unique)
                        logger.info(`🤖 Host ${socket.id} voting on behalf of bot ${botPlayer.name} (${voterId})`);
                    } else {
                        logger.warn(`⚠️ Host tried to vote for non-bot player ${voterId}`);
                        return; // Ignore invalid vote attempt
                    }
                } else {
                    logger.warn(`⚠️ Non-host ${socket.id} tried to vote on behalf of ${voterId}`);
                    return; // Ignore unauthorized vote attempt
                }
            }

            await gameService.registerVote(gameId, actualVoterId, targetPlayerId, round);

            // Confirm vote to voter (only if real player)
            if (!voterId) {
                socket.emit('game:vote-confirmed');
            }

            // Get current vote count
            const voteCount = await gameService.getVoteCount(gameId, round);
            const requiredVotes = await gameService.getRequiredVoteCount(gameId);

            io.to(roomId).emit('game:vote-count-updated', {
                totalVotes: voteCount,
                required: requiredVotes,
            });

            logger.debug(`Vote registered in game ${gameId} (${voteCount}/${requiredVotes})`);

            // Check if everyone has voted
            if (voteCount >= requiredVotes) {
                logger.info(`⚡ All players voted in room ${roomId}, processing immediately...`);

                // Need to fetch game and players to process
                const game = await prisma.game.findUnique({ where: { id: gameId } });
                const room = await prisma.room.findUnique({
                    where: { id: roomId },
                    include: { players: true }
                });

                if (game && room) {
                    // Process immediately!
                    processVotes(roomId, gameId, round, room.players, game);
                }
            }

        } catch (error: any) {
            logger.error('Error voting:', error);
        }
    });
}
