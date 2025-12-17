import { TypedSocket, TypedServer } from '../index.js';
import { logger } from '../../utils/logger.js';

export function handleConnection(socket: TypedSocket, io: TypedServer) {
    // Player data initialization
    socket.data.playerId = socket.id;
    socket.data.playerName = 'Guest';

    logger.debug(`Player ${socket.id} initialized`);
}
