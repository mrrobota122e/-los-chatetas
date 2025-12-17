import { TypedSocket, TypedServer } from '../index.js';
import { logger } from '../../utils/logger.js';

export function handleChatEvents(socket: TypedSocket, io: TypedServer) {
    socket.on('chat:message', ({ roomId, message }) => {
        if (!message || message.trim().length === 0) {
            return;
        }

        // Broadcast message to everyone in the room
        io.to(roomId).emit('chat:new-message', {
            playerId: socket.id,
            playerName: socket.data.playerName || 'Unknown',
            message: message.trim(),
            timestamp: Date.now(),
            type: 'normal',
        });

        logger.debug(`Chat message in ${roomId} from ${socket.data.playerName}: ${message}`);
    });

    socket.on('player:action', ({ roomId, action }) => {
        // Broadcast player action to others
        socket.to(roomId).emit('player:updated', {
            playerId: socket.id,
            action,
            timestamp: Date.now(),
        });
    });
}
