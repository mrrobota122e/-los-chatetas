import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { setupSocketHandlers } from './sockets/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for SPA
}));
app.use(cors({
    origin: '*', // Allow all for testing
    credentials: false,
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// Serve static files in production
if (config.nodeEnv === 'production') {
    const clientDist = path.join(__dirname, '../../client/dist');
    app.use(express.static(clientDist));

    // Handle SPA routing - serve index.html for all non-API routes
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/socket.io') || req.path === '/health') {
            return next();
        }
        res.sendFile(path.join(clientDist, 'index.html'));
    });
}

// Socket.io setup
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: '*', // Allow all for testing
        credentials: false,
    },
    pingTimeout: config.socket.pingTimeout,
    pingInterval: config.socket.pingInterval,
});

// Setup socket handlers
setupSocketHandlers(io);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Express error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server - hardcode port 3001
const PORT = 3001;
httpServer.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📝 Environment: ${config.nodeEnv}`);
    logger.info(`🌐 Allowed origins: *`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    httpServer.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});
