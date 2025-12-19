import { Server as SocketIOServer, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '@shared/types/events.js';
import { logger } from '../utils/logger.js';
import { handleRoomEvents } from './handlers/room.handler.js';
import { handleGameEvents } from './handlers/game.handler.js';
import { handleChatEvents } from './handlers/chat.handler.js';
import { handleGuessWhoEvents } from './handlers/guessWho.handler.js';
import { handleImpostorV2Events } from './handlers/impostor-v2.handler.js';
import { handleConnection } from './handlers/connection.handler.js';

export type TypedServer = SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function setupSocketHandlers(io: TypedServer) {
    io.on('connection', (socket: TypedSocket) => {
        logger.info(`Client connected: ${socket.id}`);

        // Handle connection lifecycle
        handleConnection(socket, io);

        // Handle room events
        handleRoomEvents(socket, io);

        // Handle game events
        handleGameEvents(socket, io);

        // Handle chat events
        handleChatEvents(socket, io);

        // Handle Guess Who events
        handleGuessWhoEvents(socket, io);

        // Handle Impostor V2 events
        handleImpostorV2Events(socket, io);

        socket.on('disconnect', (reason) => {
            logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
        });
    });

    logger.info('✅ Socket.io handlers initialized');
}
