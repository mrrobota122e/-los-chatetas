import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
});

// Get socket URL based on environment
function getSocketUrl(): string {
    // Use environment variable if set (for production)
    if (import.meta.env.VITE_SERVER_URL) {
        return import.meta.env.VITE_SERVER_URL;
    }
    // Development: use same hostname with port 3001
    return `http://${window.location.hostname}:3001`;
}

export function SocketProvider({ children }: { children: ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const socketUrl = getSocketUrl();
        console.log('🔌 Connecting to socket:', socketUrl);

        const newSocket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            withCredentials: false,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 10,
        });

        newSocket.on('connect', () => {
            console.log('✅ Socket connected:', newSocket.id);
            setIsConnected(true);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('❌ Socket disconnected:', reason);
            setIsConnected(false);
        });

        setSocket(newSocket);

        return () => {
            console.log('🔌 Closing socket connection');
            newSocket.close();
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocketContext() {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocketContext must be used within SocketProvider');
    }
    return context;
}

// Export alias for compatibility
export const useSocket = useSocketContext;
