// Power-ups types and logic for Los Chatetas

export type PowerUpType = 'doubleclue' | 'reveal' | 'shield' | 'spy' | 'swap';

export interface PowerUp {
    id: PowerUpType;
    name: string;
    description: string;
    icon: string;
    cost: number; // Points needed
    cooldown: number; // Rounds
    effect: string;
}

export const POWER_UPS: Record<PowerUpType, PowerUp> = {
    doubleclue: {
        id: 'doubleclue',
        name: 'Pista Doble',
        description: 'Da dos pistas en tu turno en lugar de una',
        icon: '💬',
        cost: 50,
        cooldown: 2,
        effect: 'Puedes dar 2 pistas consecutivas'
    },
    reveal: {
        id: 'reveal',
        name: 'Revelar',
        description: 'Revela si un jugador específico es el impostor o no',
        icon: '👁️',
        cost: 100,
        cooldown: 3,
        effect: 'Descubre el rol de 1 jugador'
    },
    shield: {
        id: 'shield',
        name: 'Escudo',
        description: 'Protégete de 1 eliminación en votación',
        icon: '🛡️',
        cost: 75,
        cooldown: 2,
        effect: 'Inmune a la próxima eliminación'
    },
    spy: {
        id: 'spy',
        name: 'Espía',
        description: 'Ve las pistas que dio otro jugador en rondas anteriores',
        icon: '🔍',
        cost: 60,
        cooldown: 1,
        effect: 'Revisa historial de pistas de 1 jugador'
    },
    swap: {
        id: 'swap',
        name: 'Intercambio',
        description: 'Intercambia tu rol con otro jugador (solo impostor)',
        icon: '🔄',
        cost: 150,
        cooldown: 5,
        effect: 'Becomes innocent, target becomes impostor'
    }
};

export interface PlayerPowerUps {
    playerId: string;
    points: number;
    activePowerUps: PowerUpType[];
    usedPowerUps: { type: PowerUpType; round: number }[];
    shieldActive: boolean;
}

export function canUsePowerUp(
    playerPowerUps: PlayerPowerUps,
    powerUpType: PowerUpType,
    currentRound: number
): boolean {
    const powerUp = POWER_UPS[powerUpType];

    // Check points
    if (playerPowerUps.points < powerUp.cost) {
        return false;
    }

    // Check cooldown
    const lastUsed = playerPowerUps.usedPowerUps
        .filter(used => used.type === powerUpType)
        .sort((a, b) => b.round - a.round)[0];

    if (lastUsed && currentRound - lastUsed.round < powerUp.cooldown) {
        return false;
    }

    return true;
}

export function usePowerUp(
    playerPowerUps: PlayerPowerUps,
    powerUpType: PowerUpType,
    currentRound: number
): PlayerPowerUps {
    const powerUp = POWER_UPS[powerUpType];

    return {
        ...playerPowerUps,
        points: playerPowerUps.points - powerUp.cost,
        activePowerUps: [...playerPowerUps.activePowerUps, powerUpType],
        usedPowerUps: [
            ...playerPowerUps.usedPowerUps,
            { type: powerUpType, round: currentRound }
        ],
        shieldActive: powerUpType === 'shield' ? true : playerPowerUps.shieldActive
    };
}

export function awardPoints(action: 'clue' | 'vote' | 'survival' | 'correct_vote'): number {
    const pointsMap = {
        clue: 10,
        vote: 5,
        survival: 20,
        correct_vote: 30
    };

    return pointsMap[action] || 0;
}
