import prisma from '../database/prisma.js';
import { logger } from '../utils/logger.js';

interface Room {
    id: string;
    code: string;
    hostId: string;
    maxPlayers: number;
    minPlayers: number;
    mode: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    players: any[];
}

export class RoomService {
    generateRoomCode(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    async createRoom(socketId: string, hostName: string, maxPlayers: number, mode: 'NORMAL' | 'ADVANCED' | 'GUESS_WHO', settings?: any) {
        const code = this.generateRoomCode();

        const room = await prisma.room.create({
            data: {
                code,
                hostId: socketId,
                maxPlayers,
                mode,
                settings: settings ? JSON.stringify(settings) : '{}',
                players: {
                    create: {
                        socketId,
                        name: hostName,
                        isHost: true,
                        isReady: false,
                        avatarColor: this.getRandomColor(),
                    },
                },
            },
            include: {
                players: true,
            },
        });

        return this.formatRoom(room);
    }

    async joinRoom(roomCode: string, socketId: string, playerName: string) {
        const room = await prisma.room.findUnique({
            where: { code: roomCode.toUpperCase() },
            include: { players: true },
        });

        if (!room) {
            throw { code: 'ROOM_NOT_FOUND', message: 'Room not found' };
        }

        if (room.status !== 'WAITING') {
            throw { code: 'ROOM_IN_GAME', message: 'Room is already in game' };
        }

        if (room.players.length >= room.maxPlayers) {
            throw { code: 'ROOM_FULL', message: 'Room is full' };
        }

        // Check if player already in room
        const existingPlayer = room.players.find(p => p.socketId === socketId);
        if (existingPlayer) {
            return this.formatRoom(room);
        }

        // Add player
        await prisma.player.create({
            data: {
                socketId,
                name: playerName,
                roomId: room.id,
                isHost: false,
                isReady: false,
                avatarColor: this.getRandomColor(),
            },
        });

        const updatedRoom = await prisma.room.findUnique({
            where: { id: room.id },
            include: { players: true },
        });

        return this.formatRoom(updatedRoom!);
    }

    async getRoomById(roomId: string) {
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: { players: true },
        });

        return room ? this.formatRoom(room) : null;
    }

    async getRoomByCode(roomCode: string) {
        const room = await prisma.room.findUnique({
            where: { code: roomCode.toUpperCase() },
            include: { players: true },
        });

        return room ? this.formatRoom(room) : null;
    }

    async setPlayerReady(roomId: string, socketId: string, isReady: boolean) {
        await prisma.player.updateMany({
            where: {
                roomId,
                socketId,
            },
            data: {
                isReady,
            },
        });

        const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: { players: true },
        });

        return this.formatRoom(room!);
    }

    async leaveRoom(roomId: string, socketId: string) {
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: { players: true },
        });

        if (!room) {
            return { room: null, shouldDeleteRoom: false };
        }

        const player = room.players.find(p => p.socketId === socketId);
        if (!player) {
            return { room: null, shouldDeleteRoom: false };
        }

        // Delete player
        await prisma.player.delete({
            where: { id: player.id },
        });

        // If host left or room is empty, delete room
        const isHost = player.isHost;
        const remainingPlayers = room.players.length - 1;

        if (isHost || remainingPlayers === 0) {
            // Delete all related data first to avoid foreign key constraints
            try {
                // Delete game actions for any games in this room
                await prisma.gameAction.deleteMany({
                    where: {
                        game: {
                            roomId: roomId,
                        },
                    },
                });

                // Delete any games in this room
                await prisma.game.deleteMany({
                    where: { roomId: roomId },
                });

                // Delete remaining players
                await prisma.player.deleteMany({
                    where: { roomId: roomId },
                });

                // Now safe to delete room
                await prisma.room.delete({
                    where: { id: roomId },
                });
            } catch (deleteError) {
                logger.error('Error cleaning up room:', deleteError);
            }
            return { room: null, shouldDeleteRoom: true };
        }

        // Get updated room
        const updatedRoom = await prisma.room.findUnique({
            where: { id: roomId },
            include: { players: true },
        });

        return { room: updatedRoom ? this.formatRoom(updatedRoom) : null, shouldDeleteRoom: false };
    }

    async updateSettings(roomId: string, settings: any) {
        await prisma.room.update({
            where: { id: roomId },
            data: { settings: JSON.stringify(settings) },
        });
    }

    private formatRoom(room: any): Room {
        let parsedSettings = {};
        try {
            parsedSettings = room.settings ? JSON.parse(room.settings) : {};
        } catch (e) {
            parsedSettings = {};
        }

        return {
            id: room.id,
            code: room.code,
            hostId: room.hostId,
            maxPlayers: room.maxPlayers,
            minPlayers: room.minPlayers,
            mode: room.mode,
            status: room.status,
            createdAt: room.createdAt,
            updatedAt: room.updatedAt,
            players: room.players,
            // @ts-ignore - Adding settings dynamically
            settings: parsedSettings,
        };
    }

    private getRandomColor(): string {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
            '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
}
