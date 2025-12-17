import prisma from '../database/prisma.js';
import { WordService } from './word.service.js';
import type { Game } from '@shared/types/index.js';

const wordService = new WordService();

export class GameService {
    async startGame(roomId: string, hostSocketId: string) {
        // Verificar que quien inicia sea el host
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: { players: true },
        });

        if (!room) {
            throw new Error('Room not found');
        }

        if (room.hostId !== hostSocketId) {
            throw new Error('Only the host can start the game');
        }

        if (room.players.length < room.minPlayers) {
            throw new Error(`Need at least ${room.minPlayers} players to start`);
        }

        const allReady = room.players.every(p => p.isReady || p.isHost);
        if (!allReady) {
            throw new Error('All players must be ready');
        }

        // Seleccionar palabra aleatoria
        const word = wordService.getRandomWord();

        // Seleccionar impostor aleatorio
        const randomIndex = Math.floor(Math.random() * room.players.length);
        const impostorId = room.players[randomIndex].id;

        // Crear juego
        const game = await prisma.game.create({
            data: {
                roomId: room.id,
                word,
                impostorId,
                maxRounds: 5,
                currentRound: 1,
                phase: 'CLUES',
                status: 'IN_PROGRESS',
            },
        });

        // Actualizar estado de la sala
        await prisma.room.update({
            where: { id: roomId },
            data: { status: 'IN_GAME' },
        });

        return {
            id: game.id,
            roomId: game.roomId,
            word: game.word,
            impostorId: game.impostorId,
            currentRound: game.currentRound,
            maxRounds: game.maxRounds,
            phase: game.phase,
            status: game.status,
            mode: room.mode,
            players: room.players.map(p => ({
                id: p.id,
                socketId: p.socketId,
                name: p.name,
                roomId: p.roomId,
                isReady: p.isReady,
                isHost: p.isHost,
                avatarColor: p.avatarColor,
            })),
            startedAt: game.startedAt,
        };
    }

    async registerClue(gameId: string, socketId: string, clue: string, round: number) {
        // Encontrar el jugador por socketId
        const player = await prisma.player.findUnique({
            where: { socketId },
        });

        if (!player) {
            throw new Error('Player not found');
        }

        await prisma.gameAction.create({
            data: {
                gameId,
                playerId: player.id,
                actionType: 'CLUE',
                content: clue,
                round,
            },
        });
    }

    async registerVote(gameId: string, voterSocketId: string, targetId: string, round: number) {
        // Encontrar el jugador votante por socketId
        const voter = await prisma.player.findUnique({
            where: { socketId: voterSocketId },
        });

        if (!voter) {
            throw new Error('Voter not found');
        }

        // CRITICAL: Verify target player exists in database
        const targetPlayer = await prisma.player.findUnique({
            where: { id: targetId },
        });

        if (!targetPlayer) {
            console.warn(`⚠️ Target player ${targetId} not found in database - skipping vote registration`);
            return; // Skip saving this vote - player doesn't exist in DB
        }

        // Verificar que no haya votado ya
        const existingVote = await prisma.gameAction.findFirst({
            where: {
                gameId,
                playerId: voter.id,
                actionType: 'VOTE',
                round,
            },
        });

        if (existingVote) {
            // Actualizar voto
            await prisma.gameAction.update({
                where: { id: existingVote.id },
                data: { content: targetId },
            });
        } else {
            // Crear nuevo voto
            await prisma.gameAction.create({
                data: {
                    gameId,
                    playerId: voter.id,
                    actionType: 'VOTE',
                    content: targetId,
                    round,
                },
            });
        }
    }

    async getVoteCount(gameId: string, round: number) {
        const votes = await prisma.gameAction.count({
            where: {
                gameId,
                actionType: 'VOTE',
                round,
            },
        });

        return votes;
    }

    async getRequiredVoteCount(gameId: string) {
        const game = await prisma.game.findUnique({
            where: { id: gameId },
            include: {
                room: {
                    include: {
                        players: true,
                    },
                },
            },
        });

        return game?.room.players.length || 0;
    }

    async getVotes(gameId: string, round: number) {
        return await prisma.gameAction.findMany({
            where: {
                gameId,
                actionType: 'VOTE',
                round,
            },
        });
    }

    calculateVoteResults(votes: any[]): Record<string, number> {
        const results: Record<string, number> = {};

        votes.forEach(vote => {
            const targetId = vote.content;
            results[targetId] = (results[targetId] || 0) + 1;
        });

        return results;
    }
}
