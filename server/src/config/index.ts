import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    // Allow localhost and local network IPs for testing with phone
    allowedOrigins: [
        'http://localhost:5173',
        'http://localhost:3001',
        'http://192.168.1.66:5173',
        'http://192.168.56.1:5173',
    ],
    sessionSecret: process.env.SESSION_SECRET || 'change-this-secret',
    socket: {
        pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT || '60000'),
        pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL || '25000'),
    },
    database: {
        url: process.env.DATABASE_URL || 'file:./dev.db',
    },
};
