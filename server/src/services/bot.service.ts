import prisma from '../database/prisma.js';

const BOT_NAMES = [
    'Messi Bot', 'Ronaldo Bot', 'Neymar Bot', 'Mbappé Bot',
    'Haaland Bot', 'De Bruyne Bot', 'Benzema Bot', 'Lewandowski Bot',
    'Modric Bot', 'Salah Bot', 'Kane Bot', 'Son Bot'
];

const BOT_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    '#F8B88B', '#FAD390', '#F3A683', '#A29BFE'
];

export class BotService {
    private usedBotNames: Set<string> = new Set();

    getRandomBotName(): string {
        const availableNames = BOT_NAMES.filter(name => !this.usedBotNames.has(name));
        if (availableNames.length === 0) {
            // Reset if all names used
            this.usedBotNames.clear();
            return BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
        }
        const name = availableNames[Math.floor(Math.random() * availableNames.length)];
        this.usedBotNames.add(name);
        return name;
    }

    getRandomColor(): string {
        return BOT_COLORS[Math.floor(Math.random() * BOT_COLORS.length)];
    }

    generateBotSocketId(): string {
        return `bot_${Math.random().toString(36).substring(2, 15)}`;
    }

    async createBotsForRoom(roomId: string, count: number) {
        const bots = [];

        for (let i = 0; i < count; i++) {
            const botName = this.getRandomBotName();
            const socketId = this.generateBotSocketId();
            const avatarColor = this.getRandomColor();

            const bot = await prisma.player.create({
                data: {
                    socketId,
                    name: botName,
                    roomId,
                    isReady: true, // Bots are always ready
                    isHost: false,
                    avatarColor,
                },
            });

            bots.push(bot);
        }

        return bots;
    }

    async removeBotsFromRoom(roomId: string) {
        // Remove all players with socketId starting with 'bot_'
        await prisma.player.deleteMany({
            where: {
                roomId,
                socketId: {
                    startsWith: 'bot_',
                },
            },
        });
    }

    isBotSocketId(socketId: string): boolean {
        return socketId.startsWith('bot_');
    }
}
