import { TypedSocket, TypedServer } from '../index.js';
import { logger } from '../../utils/logger.js';
import prisma from '../../database/prisma.js';

// Game state stored in memory for fast access
interface ImpostorGame {
    roomId: string;
    gameId: string;
    phase: 'WAITING' | 'ROLE_REVEAL' | 'CLUES' | 'DISCUSSION' | 'VOTING' | 'RESULTS' | 'GAME_OVER';
    round: number;
    word: string;
    impostorId: string;
    players: {
        id: string;
        socketId: string;
        name: string;
        avatarColor: string;
        isAlive: boolean;
        hasClued: boolean;
        hasVoted: boolean;
    }[];
    currentTurnIndex: number;
    clues: { playerId: string; playerName: string; clue: string }[];
    votes: Record<string, string>; // voterId -> targetId
    settings: {
        turnDuration: number;
        discussionDuration: number;
        votingDuration: number;
    };
}

const games = new Map<string, ImpostorGame>();
const timers = new Map<string, NodeJS.Timeout>();

const FOOTBALL_WORDS = [
    'Messi', 'Cristiano Ronaldo', 'Neymar', 'Mbappé', 'Haaland', 'Benzema',
    'Real Madrid', 'Barcelona', 'Manchester United', 'Liverpool', 'PSG',
    'Champions League', 'Balón de Oro', 'Gol', 'Penalti', 'Tarjeta Roja'
];

export function handleImpostorEvents(socket: TypedSocket, io: TypedServer) {

    logger.info(`🎮 Impostor handlers ready for socket ${socket.id}`);

    // Start game - use 'as any' because event type is not defined
    socket.on('impostor:start' as any, async (data: { roomCode: string }) => {
        const { roomCode } = data || {};
        logger.info(`🚀 impostor:start from ${socket.id}, roomCode: ${roomCode}`);
        try {
            const room = await prisma.room.findFirst({
                where: { roomCode },
                include: { players: true }
            });

            if (!room) {
                socket.emit('room:error', { code: 'NOT_FOUND', message: 'Sala no encontrada' });
                return;
            }

            if (room.hostId !== socket.id) {
                socket.emit('room:error', { code: 'NOT_HOST', message: 'Solo el host puede iniciar' });
                return;
            }

            // Create game in DB
            const word = FOOTBALL_WORDS[Math.floor(Math.random() * FOOTBALL_WORDS.length)];
            const impostorIndex = Math.floor(Math.random() * room.players.length);
            const impostor = room.players[impostorIndex];

            const game = await prisma.game.create({
                data: {
                    roomId: room.id,
                    word,
                    impostorId: impostor.id,
                    mode: 'NORMAL',
                    maxRounds: 5,
                    status: 'IN_PROGRESS',
                }
            });

            // Store game state in memory
            const gameState: ImpostorGame = {
                roomId: room.id,
                gameId: game.id,
                phase: 'ROLE_REVEAL',
                round: 1,
                word,
                impostorId: impostor.id,
                players: room.players.map(p => ({
                    id: p.id,
                    socketId: p.socketId,
                    name: p.name,
                    avatarColor: p.avatarColor || '#c51111',
                    isAlive: true,
                    hasClued: false,
                    hasVoted: false,
                })),
                currentTurnIndex: 0,
                clues: [],
                votes: {},
                settings: {
                    turnDuration: 30,
                    discussionDuration: 45,
                    votingDuration: 30,
                },
            };

            games.set(room.id, gameState);

            // Send role to each player
            for (const player of room.players) {
                const playerSocket = io.sockets.sockets.get(player.socketId);
                if (playerSocket) {
                    const isImpostor = player.id === impostor.id;
                    playerSocket.emit('impostor:role', {
                        isImpostor,
                        word: isImpostor ? null : word,
                        gameId: game.id,
                    });
                }
            }

            // Broadcast initial state
            io.to(room.id).emit('impostor:state', {
                gameId: game.id,
                phase: 'ROLE_REVEAL',
                round: 1,
                players: gameState.players,
            });

            // After 5 seconds, start clue phase
            setTimeout(() => {
                startCluePhase(room.id, io);
            }, 5000);

            logger.info(`Impostor game started in room ${roomCode}`);

        } catch (error: any) {
            logger.error('Error starting impostor game:', error);
            socket.emit('room:error', { code: 'START_FAILED', message: error.message });
        }
    });

    // Sync state for late joiners
    socket.on('impostor:sync' as any, async ({ roomCode }) => {
        try {
            const room = await prisma.room.findFirst({ where: { roomCode } });
            if (!room) return;

            const game = games.get(room.id);
            if (!game) return;

            // Send current state to the requesting socket
            socket.emit('impostor:state', {
                gameId: game.gameId,
                phase: game.phase,
                round: game.round,
                players: game.players,
                currentTurnId: game.players.find(p => p.isAlive && game.players.indexOf(p) === game.currentTurnIndex)?.socketId,
                timeRemaining: 30, // Approximate or track real time
                clues: game.clues,
                votes: game.votes,
                word: game.impostorId === socket.id ? null : game.word, // Only show word if crew
                isImpostor: game.impostorId === socket.id
            });

            logger.info(`Synced state for ${socket.id} in room ${roomCode}`);
        } catch (error) {
            logger.error('Error syncing state:', error);
        }
    });

    // Send clue
    socket.on('impostor:send-clue', async ({ roomCode, clue }) => {
        try {
            const room = await prisma.room.findFirst({ where: { roomCode } });
            if (!room) return;

            const game = games.get(room.id);
            if (!game || game.phase !== 'CLUES') return;

            const playerIndex = game.players.findIndex(p => p.socketId === socket.id);
            if (playerIndex === -1) return;

            const player = game.players[playerIndex];
            if (player.hasClued || !player.isAlive) return;

            // Check if it's their turn
            const alivePlayers = game.players.filter(p => p.isAlive);
            const currentPlayer = alivePlayers[game.currentTurnIndex % alivePlayers.length];
            if (currentPlayer.socketId !== socket.id) return;

            // Register clue
            player.hasClued = true;
            game.clues.push({
                playerId: player.id,
                playerName: player.name,
                clue,
            });

            // Broadcast clue
            io.to(room.id).emit('impostor:clue', {
                playerId: player.id,
                playerName: player.name,
                clue,
            });

            // Move to next turn
            game.currentTurnIndex++;

            // Check if all players have given clues
            const allClued = alivePlayers.every(p => p.hasClued);
            if (allClued) {
                startDiscussionPhase(room.id, io);
            } else {
                // Next turn
                const nextPlayer = alivePlayers[game.currentTurnIndex % alivePlayers.length];
                io.to(room.id).emit('impostor:turn', {
                    currentTurnId: nextPlayer.socketId,
                    timeRemaining: game.settings.turnDuration,
                });

                // Auto-advance timer
                clearTimer(room.id);
                setTimer(room.id, () => {
                    // Skip player's turn
                    game.currentTurnIndex++;
                    const alive = game.players.filter(p => p.isAlive);
                    if (game.currentTurnIndex >= alive.length) {
                        startDiscussionPhase(room.id, io);
                    } else {
                        const next = alive[game.currentTurnIndex % alive.length];
                        io.to(room.id).emit('impostor:turn', {
                            currentTurnId: next.socketId,
                            timeRemaining: game.settings.turnDuration,
                        });
                    }
                }, game.settings.turnDuration * 1000);
            }

            logger.debug(`Clue from ${player.name}: ${clue}`);

        } catch (error: any) {
            logger.error('Error sending clue:', error);
        }
    });

    // Send chat
    socket.on('impostor:send-chat', async ({ roomCode, text }) => {
        try {
            const room = await prisma.room.findFirst({ where: { roomCode } });
            if (!room) return;

            const game = games.get(room.id);
            if (!game) return;

            const player = game.players.find(p => p.socketId === socket.id);
            if (!player) return;

            // Broadcast chat
            io.to(room.id).emit('impostor:chat', {
                sender: player.name,
                text,
            });

        } catch (error: any) {
            logger.error('Error sending chat:', error);
        }
    });

    // Vote
    socket.on('impostor:vote', async ({ roomCode, targetId }) => {
        try {
            const room = await prisma.room.findFirst({ where: { roomCode } });
            if (!room) return;

            const game = games.get(room.id);
            if (!game || game.phase !== 'VOTING') return;

            const voter = game.players.find(p => p.socketId === socket.id);
            if (!voter || voter.hasVoted || !voter.isAlive) return;

            // Register vote
            voter.hasVoted = true;
            game.votes[voter.id] = targetId;

            // Calculate vote counts
            const voteCounts: Record<string, string[]> = {};
            for (const [voterId, tId] of Object.entries(game.votes)) {
                if (!voteCounts[tId]) voteCounts[tId] = [];
                const voterPlayer = game.players.find(p => p.id === voterId);
                if (voterPlayer) voteCounts[tId].push(voterPlayer.name);
            }

            io.to(room.id).emit('impostor:vote', { votes: voteCounts });

            // Check if all voted
            const alivePlayers = game.players.filter(p => p.isAlive);
            const allVoted = alivePlayers.every(p => p.hasVoted);

            if (allVoted) {
                processVotes(room.id, io);
            }

            logger.debug(`Vote from ${voter.name} for ${targetId}`);

        } catch (error: any) {
            logger.error('Error voting:', error);
        }
    });

    // Helper functions
    function startCluePhase(roomId: string, io: TypedServer) {
        const game = games.get(roomId);
        if (!game) return;

        game.phase = 'CLUES';
        game.currentTurnIndex = 0;
        game.clues = [];
        game.players.forEach(p => p.hasClued = false);

        const alivePlayers = game.players.filter(p => p.isAlive);
        const firstPlayer = alivePlayers[0];

        io.to(roomId).emit('impostor:phase', {
            phase: 'CLUES',
            timeRemaining: game.settings.turnDuration,
            round: game.round,
        });

        io.to(roomId).emit('impostor:turn', {
            currentTurnId: firstPlayer.socketId,
            timeRemaining: game.settings.turnDuration,
        });

        // Set timer for first turn
        setTimer(roomId, () => {
            game.currentTurnIndex++;
            if (game.currentTurnIndex >= alivePlayers.length) {
                startDiscussionPhase(roomId, io);
            }
        }, game.settings.turnDuration * 1000);
    }

    function startDiscussionPhase(roomId: string, io: TypedServer) {
        const game = games.get(roomId);
        if (!game) return;

        clearTimer(roomId);
        game.phase = 'DISCUSSION';

        io.to(roomId).emit('impostor:phase', {
            phase: 'DISCUSSION',
            timeRemaining: game.settings.discussionDuration,
        });

        setTimer(roomId, () => {
            startVotingPhase(roomId, io);
        }, game.settings.discussionDuration * 1000);
    }

    function startVotingPhase(roomId: string, io: TypedServer) {
        const game = games.get(roomId);
        if (!game) return;

        clearTimer(roomId);
        game.phase = 'VOTING';
        game.votes = {};
        game.players.forEach(p => p.hasVoted = false);

        io.to(roomId).emit('impostor:phase', {
            phase: 'VOTING',
            timeRemaining: game.settings.votingDuration,
        });

        setTimer(roomId, () => {
            processVotes(roomId, io);
        }, game.settings.votingDuration * 1000);
    }

    function processVotes(roomId: string, io: TypedServer) {
        const game = games.get(roomId);
        if (!game) return;

        clearTimer(roomId);

        // Count votes
        const voteCount: Record<string, number> = {};
        for (const targetId of Object.values(game.votes)) {
            voteCount[targetId] = (voteCount[targetId] || 0) + 1;
        }

        // Find max votes
        let maxVotes = 0;
        let eliminated: string | null = null;
        let tie = false;

        for (const [playerId, count] of Object.entries(voteCount)) {
            if (playerId === 'skip') continue;
            if (count > maxVotes) {
                maxVotes = count;
                eliminated = playerId;
                tie = false;
            } else if (count === maxVotes) {
                tie = true;
            }
        }

        if (tie || maxVotes === 0 || !eliminated) {
            io.to(roomId).emit('impostor:no-elimination', { wasTie: tie || false });

            // Check if impostor wins by rounds
            if (game.round >= 5) {
                game.phase = 'GAME_OVER';
                io.to(roomId).emit('impostor:state', { phase: 'GAME_OVER', winner: 'IMPOSTOR' });
            } else {
                // Next round
                setTimeout(() => {
                    game.round++;
                    startCluePhase(roomId, io);
                }, 4000);
            }
            return;
        }

        // Eliminate player
        const eliminatedPlayer = game.players.find(p => p.id === eliminated);
        if (!eliminatedPlayer) return;

        eliminatedPlayer.isAlive = false;
        const wasImpostor = eliminatedPlayer.id === game.impostorId;

        io.to(roomId).emit('impostor:elimination', {
            player: eliminatedPlayer,
            wasImpostor,
            gameOver: wasImpostor,
            winner: wasImpostor ? 'CREW' : undefined,
        });

        if (wasImpostor) {
            game.phase = 'GAME_OVER';
        } else {
            // Check if impostor wins (equal or more impostors than crew)
            const alivePlayers = game.players.filter(p => p.isAlive);
            const aliveImpostors = alivePlayers.filter(p => p.id === game.impostorId);
            const aliveCrew = alivePlayers.filter(p => p.id !== game.impostorId);

            if (aliveImpostors.length >= aliveCrew.length) {
                setTimeout(() => {
                    game.phase = 'GAME_OVER';
                    io.to(roomId).emit('impostor:state', { phase: 'GAME_OVER', winner: 'IMPOSTOR' });
                }, 6000);
            }
        }

        logger.info(`${eliminatedPlayer.name} eliminated, wasImpostor: ${wasImpostor}`);
    }

    function setTimer(roomId: string, callback: () => void, ms: number) {
        clearTimer(roomId);
        timers.set(roomId, setTimeout(callback, ms));
    }

    function clearTimer(roomId: string) {
        const timer = timers.get(roomId);
        if (timer) {
            clearTimeout(timer);
            timers.delete(roomId);
        }
    }
}
