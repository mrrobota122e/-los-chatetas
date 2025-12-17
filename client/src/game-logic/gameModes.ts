// Game modes configuration for Los Chatetas

export type GameMode = 'normal' | 'rapid' | 'chaos';

export interface GameModeConfig {
    id: GameMode;
    name: string;
    description: string;
    icon: string;
    settings: {
        clueTime: number;
        discussionTime: number;
        votingTime: number;
        minPlayers: number;
        maxPlayers: number;
        impostorCount: number | 'auto'; // 'auto' = based on player count
        roundsToWin: number;
    };
    features: string[];
}

export const GAME_MODES: Record<GameMode, GameModeConfig> = {
    normal: {
        id: 'normal',
        name: 'Normal',
        description: 'Modo clásico con timers estándar',
        icon: '🎮',
        settings: {
            clueTime: 60,
            discussionTime: 90,
            votingTime: 30,
            minPlayers: 3,
            maxPlayers: 12,
            impostorCount: 1,
            roundsToWin: 5
        },
        features: ['1 impostor', '5 rondas', 'Timers normales']
    },
    rapid: {
        id: 'rapid',
        name: 'Rápido',
        description: 'Partidas veloces con timers reducidos 50%',
        icon: '⚡',
        settings: {
            clueTime: 30,
            discussionTime: 45,
            votingTime: 15,
            minPlayers: 3,
            maxPlayers: 8,
            impostorCount: 1,
            roundsToWin: 3
        },
        features: ['Timers 50% reducidos', '3 rondas', 'Acción rápida']
    },
    chaos: {
        id: 'chaos',
        name: 'Caos',
        description: 'Múltiples impostores, máximo desorden',
        icon: '🔥',
        settings: {
            clueTime: 45,
            discussionTime: 60,
            votingTime: 25,
            minPlayers: 5,
            maxPlayers: 12,
            impostorCount: 'auto', // 2-3 based on player count
            roundsToWin: 5
        },
        features: ['2-3 impostores', 'Power-ups habilitados', 'Modo hardcore']
    }
};

export function getImpostorCount(mode: GameMode, playerCount: number): number {
    const config = GAME_MODES[mode];

    if (config.settings.impostorCount === 'auto') {
        // Chaos mode: scale impostors with players
        if (playerCount >= 10) return 3;
        if (playerCount >= 7) return 2;
        return 1;
    }

    return config.settings.impostorCount as number;
}

export function validateGameMode(mode: GameMode, playerCount: number): {
    valid: boolean;
    error?: string;
} {
    const config = GAME_MODES[mode];

    if (playerCount < config.settings.minPlayers) {
        return {
            valid: false,
            error: `Mínimo ${config.settings.minPlayers} jugadores para ${config.name}`
        };
    }

    if (playerCount > config.settings.maxPlayers) {
        return {
            valid: false,
            error: `Máximo ${config.settings.maxPlayers} jugadores para ${config.name}`
        };
    }

    return { valid: true };
}
