import playersData from './players.json';

export interface Player {
    id: string;
    name: string;
    team: string;
    nationality: string;
    position: string;
    league: string;
    age: number;
    foot: string;
    hasBeard: boolean;
    hairColor: string;
    height: string;
    skinTone: string;
    achievements: string[];
    imageUrl: string;
}

export interface Question {
    id: string;
    text: string;
    evaluator: (player: Player) => boolean;
}

// All available players
export const ALL_PLAYERS: Player[] = playersData.players;

// Smart questions that divide players roughly in half
export const SMART_QUESTIONS: Question[] = [
    {
        id: 'q1',
        text: '¿Juega en Europa?',
        evaluator: (p) => ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1'].includes(p.league)
    },
    {
        id: 'q2',
        text: '¿Es delantero?',
        evaluator: (p) => p.position === 'Delantero'
    },
    {
        id: 'q3',
        text: '¿Tiene más de 30 años?',
        evaluator: (p) => p.age > 30
    },
    {
        id: 'q4',
        text: '¿Juega con el pie derecho principalmente?',
        evaluator: (p) => p.foot === 'Derecha'
    },
    {
        id: 'q5',
        text: '¿Tiene barba?',
        evaluator: (p) => p.hasBeard
    },
    {
        id: 'q6',
        text: '¿Tiene cabello rubio?',
        evaluator: (p) => p.hairColor === 'Rubio'
    },
    {
        id: 'q7',
        text: '¿Mide más de 1.80m?',
        evaluator: (p) => p.height === 'Alto'
    },
    {
        id: 'q8',
        text: '¿Ha ganado un Balón de Oro?',
        evaluator: (p) => p.achievements.some(a => a.includes('Balón de Oro') || a.includes('Balones de Oro'))
    },
    {
        id: 'q9',
        text: '¿Ha ganado la Champions League?',
        evaluator: (p) => p.achievements.some(a => a.includes('Champions'))
    },
    {
        id: 'q10',
        text: '¿Es sudamericano?',
        evaluator: (p) => ['Argentina', 'Brasil', 'Uruguay', 'Chile', 'Colombia'].includes(p.nationality)
    },
    {
        id: 'q11',
        text: '¿Juega en la Premier League?',
        evaluator: (p) => p.league === 'Premier League'
    },
    {
        id: 'q12',
        text: '¿Ha ganado una Copa del Mundo?',
        evaluator: (p) => p.achievements.some(a => a.includes('Copa del Mundo'))
    }
];

// Get suggested question based on remaining players
export function suggestNextQuestion(remainingPlayers: Player[]): Question | null {
    if (remainingPlayers.length <= 1) return null;

    // Find question that divides remaining players closest to 50/50
    let bestQuestion: Question | null = null;
    let bestSplit = Infinity;

    for (const question of SMART_QUESTIONS) {
        const yesCount = remainingPlayers.filter(question.evaluator).length;
        const noCount = remainingPlayers.length - yesCount;
        const split = Math.abs(yesCount - noCount);

        if (split < bestSplit) {
            bestSplit = split;
            bestQuestion = question;
        }
    }

    return bestQuestion;
}

// Check if a question applies to a player
export function evaluateQuestion(question: Question, player: Player): boolean {
    return question.evaluator(player);
}

// Get random player
export function getRandomPlayer(): Player {
    return ALL_PLAYERS[Math.floor(Math.random() * ALL_PLAYERS.length)];
}
