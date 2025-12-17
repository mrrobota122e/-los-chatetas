import { TypedSocket, TypedServer } from '../index.js';
import { RoomService } from '../../services/room.service.js';
import { BotService } from '../../services/bot.service.js';
import { logger } from '../../utils/logger.js';

const roomService = new RoomService();
const botService = new BotService();

export function handleRoomEvents(socket: TypedSocket, io: TypedServer) {
    // Create room
    socket.on('room:create', async ({ hostName, maxPlayers, mode, botMode, settings }) => {
        try {
            const room = await roomService.createRoom(socket.id, hostName, maxPlayers, mode, settings);

            // Join the socket room
            socket.join(room.id);
            socket.data.roomId = room.id;
            socket.data.playerName = hostName;

            // Create bots if botMode is enabled
            if (botMode && maxPlayers > 1) {
                const botCount = maxPlayers - 1; // Fill all slots except host
                await botService.createBotsForRoom(room.id, botCount);
                logger.info(`Created ${botCount} bots for room ${room.code}`);

                // Get updated room with bots
                const updatedRoom = await roomService.getRoomById(room.id);
                if (updatedRoom) {
                    // Emit updated player list
                    io.to(room.id).emit('room:updated', {
                        players: updatedRoom.players,
                    });
                }
            }

            socket.emit('room:created', {
                roomId: room.id,
                roomCode: room.code,
                hostId: room.hostId,
                maxPlayers: room.maxPlayers,
                mode: room.mode,
                settings: settings || {},
            });

            logger.info(`Room created: ${room.code} by ${hostName}`);
        } catch (error: any) {
            logger.error('Error creating room:', error);
            socket.emit('room:error', {
                code: 'CREATE_FAILED',
                message: error.message || 'Failed to create room',
            });
        }
    });

    // Join room
    socket.on('room:join', async ({ roomCode, playerName }) => {
        try {
            const room = await roomService.joinRoom(roomCode, socket.id, playerName);

            // Join the socket room
            socket.join(room.id);
            socket.data.roomId = room.id;
            socket.data.playerName = playerName;

            // Send room data to the joining player
            socket.emit('room:joined', {
                roomId: room.id,
                players: room.players,
                hostId: room.hostId,
                maxPlayers: room.maxPlayers,
                mode: room.mode,
            });

            // Notify others in the room
            socket.to(room.id).emit('room:player-joined', {
                player: room.players.find(p => p.socketId === socket.id)!,
                totalPlayers: room.players.length,
            });

            // Send updated player list to everyone
            io.to(room.id).emit('room:updated', {
                players: room.players,
            });

            logger.info(`Player ${playerName} joined room ${roomCode}`);
        } catch (error: any) {
            logger.error('Error joining room:', error);
            socket.emit('room:error', {
                code: error.code || 'JOIN_FAILED',
                message: error.message || 'Failed to join room',
            });
        }
    });

    // Get room state (for host who is already in the room)
    socket.on('room:get-state', async ({ roomCode }) => {
        try {
            const room = await roomService.getRoomByCode(roomCode);
            if (!room) {
                socket.emit('room:error', {
                    code: 'ROOM_NOT_FOUND',
                    message: 'Room not found',
                });
                return;
            }

            socket.emit('room:state', {
                roomId: room.id,
                players: room.players,
                hostId: room.hostId,
                maxPlayers: room.maxPlayers,
                mode: room.mode,
            });
        } catch (error: any) {
            logger.error('Error getting room state:', error);
            socket.emit('room:error', {
                code: 'GET_STATE_FAILED',
                message: error.message || 'Failed to get room state',
            });
        }
    });

    // Player ready
    socket.on('player:ready', async ({ roomId, isReady }) => {
        try {
            const room = await roomService.setPlayerReady(roomId, socket.id, isReady);

            // Broadcast updated player list
            io.to(roomId).emit('room:updated', {
                players: room.players,
            });

            logger.debug(`Player ${socket.id} ready status: ${isReady}`);
        } catch (error: any) {
            logger.error('Error setting player ready:', error);
            socket.emit('room:error', {
                code: 'READY_FAILED',
                message: error.message,
            });
        }
    });

    // Update room settings
    socket.on('room:update-settings', async ({ roomId, settings }) => {
        try {
            // Verify host
            const room = await roomService.getRoomById(roomId);
            if (!room || room.hostId !== socket.id) {
                return;
            }

            // Update settings in room service (need to implement updateSettings in RoomService)
            await roomService.updateSettings(roomId, settings);

            // Broadcast new settings
            io.to(roomId).emit('room:settings-updated', settings);

            logger.info(`Room ${room.code} settings updated by host`);
        } catch (error: any) {
            logger.error('Error updating settings:', error);
        }
    });

    // Leave room
    socket.on('room:leave', async ({ roomId }) => {
        try {
            const { room, shouldDeleteRoom } = await roomService.leaveRoom(roomId, socket.id);

            socket.leave(roomId);
            socket.data.roomId = undefined;

            if (shouldDeleteRoom) {
                // Room was deleted (host left or empty)
                io.to(roomId).emit('room:error', {
                    code: 'ROOM_CLOSED',
                    message: 'The room has been closed',
                });
            } else if (room) {
                // Notify others
                io.to(roomId).emit('room:player-left', {
                    playerId: socket.id,
                    playerName: socket.data.playerName || 'Unknown',
                    totalPlayers: room.players.length,
                });

                io.to(roomId).emit('room:updated', {
                    players: room.players,
                });
            }

            socket.emit('room:left');
            logger.info(`Player ${socket.id} left room ${roomId}`);
        } catch (error: any) {
            logger.error('Error leaving room:', error);
        }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
        const roomId = socket.data.roomId;
        if (roomId) {
            try {
                const { room, shouldDeleteRoom } = await roomService.leaveRoom(roomId, socket.id);

                if (shouldDeleteRoom) {
                    io.to(roomId).emit('room:error', {
                        code: 'ROOM_CLOSED',
                        message: 'The room has been closed',
                    });
                } else if (room) {
                    io.to(roomId).emit('room:player-left', {
                        playerId: socket.id,
                        playerName: socket.data.playerName || 'Unknown',
                        totalPlayers: room.players.length,
                    });

                    io.to(roomId).emit('room:updated', {
                        players: room.players,
                    });
                }
            } catch (error) {
                logger.error('Error handling disconnect:', error);
            }
        }
    });
}
