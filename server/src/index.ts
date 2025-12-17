import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
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
    contentSecurityPolicy: false,
}));
app.use(cors({
    origin: '*',
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

// Serve static files in production (if they exist)
if (config.nodeEnv === 'production') {
    const clientDist = path.join(__dirname, '../../client/dist');

    if (fs.existsSync(clientDist)) {
        app.use(express.static(clientDist));
        app.get('*', (req, res, next) => {
            if (req.path.startsWith('/socket.io') || req.path === '/health') {
                return next();
            }
            res.sendFile(path.join(clientDist, 'index.html'));
        });
    } else {
        // No client files - serve simple status page
        app.get('/', (req, res) => {
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Los Chatetas - Server Online</title>
                    <style>
                        body { font-family: Arial; background: #1a1a2e; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                        .container { text-align: center; }
                        h1 { color: #4ade80; }
                        p { color: #888; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>🚀 Servidor Online</h1>
                        <p>Los Chatetas - API y Socket.io funcionando</p>
                        <p>El cliente web se desplegará pronto...</p>
                    </div>
                </body>
                </html>
            `);
        });
    }
}

// Socket.io setup
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: '*',
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

// Start server
const PORT = process.env.PORT || 3001;
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
