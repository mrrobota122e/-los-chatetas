import footballersData from '../data/footballers.json' assert { type: 'json' };
import type { Footballer } from './types.js';

/**
 * Get a random footballer for the impostor game
 */
export function getRandomFootballer(): Footballer {
    const randomIndex = Math.floor(Math.random() * footballersData.length);
    return footballersData[randomIndex] as Footballer;
}

/**
 * Get footballer by name (useful for testing)
 */
export function getFootballerByName(name: string): Footballer | null {
    const found = footballersData.find(f => f.name.toLowerCase() === name.toLowerCase());
    return found ? (found as Footballer) : null;
}

/**
 * Check if a footballer exists
 */
export function isValidFootballer(name: string): boolean {
    return footballersData.some(f => f.name.toLowerCase() === name.toLowerCase());
}
