import { useCallback } from 'react';
import { useSocketContext } from '../contexts/SocketContext';

export function useSocket() {
    const { socket, isConnected } = useSocketContext();

    const createRoom = useCallback(
        (hostName: string, maxPlayers: number, mode: 'NORMAL' | 'ADVANCED', botMode?: boolean, settings?: any) => {
            return new Promise<{ roomCode: string; roomId: string; hostId: string; maxPlayers: number }>((resolve, reject) => {
                if (!socket) {
                    reject(new Error('Socket not connected'));
                    return;
                }

                socket.emit('room:create', { hostName, maxPlayers, mode, botMode, settings });

                socket.once('room:created', (data) => {
                    resolve(data);
                });

                socket.once('room:error', (error) => {
                    reject(error);
                });

                // Timeout después de 30 segundos
                setTimeout(() => {
                    reject(new Error('Timeout: El servidor no responde. ¿Está corriendo el backend?'));
                }, 30000);
            });
        },
        [socket]
    );

    const joinRoom = useCallback(
        (roomCode: string, playerName: string) => {
            return new Promise<void>((resolve, reject) => {
                if (!socket) {
                    reject(new Error('Socket not connected'));
                    return;
                }

                socket.emit('room:join', { roomCode, playerName });

                socket.once('room:joined', () => {
                    resolve();
                });

                socket.once('room:error', (error) => {
                    reject(error);
                });

                setTimeout(() => {
                    reject(new Error('Timeout: El servidor no responde. ¿Está corriendo el backend?'));
                }, 30000);
            });
        },
        [socket]
    );

    const leaveRoom = useCallback(
        (roomId: string) => {
            if (socket) {
                socket.emit('room:leave', { roomId });
            }
        },
        [socket]
    );

    return {
        socket,
        isConnected,
        createRoom,
        joinRoom,
        leaveRoom,
    };
}
