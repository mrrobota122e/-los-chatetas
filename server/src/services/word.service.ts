import footballWords from '../data/football-words.json' assert { type: 'json' };

export class WordService {
    private allWords: string[];

    constructor() {
        // Combinar todas las categorías en un solo array
        this.allWords = [
            ...footballWords.players,
            ...footballWords.teams,
            ...footballWords.competitions,
            ...footballWords.concepts,
            ...footballWords.stadiums,
        ];
    }

    getRandomWord(): string {
        const randomIndex = Math.floor(Math.random() * this.allWords.length);
        return this.allWords[randomIndex];
    }

    getSimilarWordPair(): { correct: string; impostor: string } {
        const randomIndex = Math.floor(Math.random() * footballWords.pairs.length);
        return footballWords.pairs[randomIndex];
    }
}
