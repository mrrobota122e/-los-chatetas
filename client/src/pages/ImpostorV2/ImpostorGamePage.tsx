import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import styles from './ImpostorGamePage.module.css';

// Football players for the word
const FOOTBALLERS = [
    'Messi', 'Cristiano Ronaldo', 'Neymar', 'Mbappé', 'Haaland',
    'Vinicius Jr', 'Bellingham', 'Salah', 'De Bruyne', 'Modric',
    'Benzema', 'Lewandowski', 'Kane', 'Son', 'Pedri'
];

// Bot names
const BOT_NAMES = ['MbappéBot', 'MessiBot', 'HaalandBot', 'ViniBot', 'BellinghamBot'];

// Generate random clue for bots
const BOT_CLUES = [
    'Juega en Europa', 'Es muy rápido', 'Gana muchos trofeos',
    'Es delantero', 'Viste de blanco', 'Es sudamericano',
    'Mete muchos goles', 'Es muy técnico', 'Tiene tatuajes',
    'Es joven', 'Juega en LaLiga', 'Es famoso'
];

type Phase = 'ROLE_REVEAL' | 'CLUES' | 'DISCUSSION' | 'VOTING' | 'ELIMINATION' | 'GAME_END';

interface Player {
    id: string;
    name: string;
    isBot: boolean;
    isImpostor: boolean;
    isAlive: boolean;
    hasVoted?: boolean;
    votesAgainst: number;
}

interface ChatMessage {
    sender: string;
    text: string;
    isSystem?: boolean;
}

export default function ImpostorGamePage() {
    const { roomCode } = useParams<{ roomCode: string }>();
    const navigate = useNavigate();
    const { socket } = useSocket();

    // Game state
    const [phase, setPhase] = useState<Phase>('ROLE_REVEAL');
    const [players, setPlayers] = useState<Player[]>([]);
    const [secretWord, setSecretWord] = useState<string>('');
    const [isImpostor, setIsImpostor] = useState(false);
    const [timer, setTimer] = useState(30);
    const [currentTurn, setCurrentTurn] = useState(0);
    const [clues, setClues] = useState<{ player: string; clue: string }[]>([]);
    const [myClue, setMyClue] = useState('');
    const [chat, setChat] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [selectedVote, setSelectedVote] = useState<string | null>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [eliminatedPlayer, setEliminatedPlayer] = useState<Player | null>(null);
    const [winner, setWinner] = useState<'CREW' | 'IMPOSTOR' | null>(null);
    const [round, setRound] = useState(1);

    const myId = useRef(socket?.id || `player-${Date.now()}`);
    const chatRef = useRef<HTMLDivElement>(null);

    // Initialize game
    useEffect(() => {
        initializeGame();
    }, []);

    // Timer effect
    useEffect(() => {
        if (timer <= 0) {
            handleTimerEnd();
            return;
        }

        const interval = setInterval(() => {
            setTimer(prev => prev - 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [timer, phase]);

    // Auto scroll chat
    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [chat]);

    const initializeGame = () => {
        const playerName = localStorage.getItem('globalPlayerName') || 'Jugador';

        // Create players (1 real + bots)
        const gamePlayers: Player[] = [
            { id: myId.current, name: playerName, isBot: false, isImpostor: false, isAlive: true, votesAgainst: 0 }
        ];

        // Add 4 bots
        BOT_NAMES.slice(0, 4).forEach((name, i) => {
            gamePlayers.push({
                id: `bot-${i}`,
                name,
                isBot: true,
                isImpostor: false,
                isAlive: true,
                votesAgainst: 0
            });
        });

        // Pick random impostor (30% chance for real player, 70% for bot)
        const impostorIndex = Math.random() < 0.3 ? 0 : Math.floor(Math.random() * 4) + 1;
        gamePlayers[impostorIndex].isImpostor = true;

        // Pick secret word
        const word = FOOTBALLERS[Math.floor(Math.random() * FOOTBALLERS.length)];

        setPlayers(gamePlayers);
        setSecretWord(word);
        setIsImpostor(gamePlayers[0].isImpostor);
        setPhase('ROLE_REVEAL');
        setTimer(8);
    };

    const handleTimerEnd = () => {
        switch (phase) {
            case 'ROLE_REVEAL':
                setPhase('CLUES');
                setTimer(20);
                setCurrentTurn(0);
                break;
            case 'CLUES':
                // Bot gives clue
                if (players[currentTurn]?.isBot) {
                    const randomClue = BOT_CLUES[Math.floor(Math.random() * BOT_CLUES.length)];
                    setClues(prev => [...prev, { player: players[currentTurn].name, clue: randomClue }]);
                }

                if (currentTurn < players.filter(p => p.isAlive).length - 1) {
                    setCurrentTurn(prev => prev + 1);
                    setTimer(20);
                } else {
                    setPhase('DISCUSSION');
                    setTimer(60);
                    setChat([{ sender: 'Sistema', text: '💬 ¡Discusión abierta! Descubre al impostor.', isSystem: true }]);
                }
                break;
            case 'DISCUSSION':
                setPhase('VOTING');
                setTimer(30);
                break;
            case 'VOTING':
                processVotes();
                break;
            case 'ELIMINATION':
                checkWinCondition();
                break;
        }
    };

    const handleSubmitClue = () => {
        if (!myClue.trim() || currentTurn !== 0) return;

        setClues(prev => [...prev, { player: players[0].name, clue: myClue.trim() }]);
        setMyClue('');

        // Move to next turn
        if (currentTurn < players.filter(p => p.isAlive).length - 1) {
            setCurrentTurn(prev => prev + 1);
            setTimer(20);

            // Bots give clues automatically
            setTimeout(() => simulateBotClue(), 2000);
        } else {
            setPhase('DISCUSSION');
            setTimer(60);
        }
    };

    const simulateBotClue = () => {
        const alivePlayers = players.filter(p => p.isAlive);
        if (currentTurn >= alivePlayers.length) return;

        const bot = alivePlayers[currentTurn];
        if (bot?.isBot) {
            const randomClue = BOT_CLUES[Math.floor(Math.random() * BOT_CLUES.length)];
            setClues(prev => [...prev, { player: bot.name, clue: randomClue }]);

            if (currentTurn < alivePlayers.length - 1) {
                setCurrentTurn(prev => prev + 1);
                setTimer(20);
                setTimeout(() => simulateBotClue(), 2000);
            } else {
                setPhase('DISCUSSION');
                setTimer(60);
                setChat([{ sender: 'Sistema', text: '💬 ¡Discusión abierta!', isSystem: true }]);
            }
        }
    };

    const handleSendChat = () => {
        if (!chatInput.trim()) return;

        setChat(prev => [...prev, { sender: players[0].name, text: chatInput.trim() }]);
        setChatInput('');

        // Bots respond randomly
        if (Math.random() > 0.5) {
            setTimeout(() => {
                const randomBot = players.filter(p => p.isBot && p.isAlive)[Math.floor(Math.random() * 4)];
                if (randomBot) {
                    const responses = [
                        'Hmm... sospechoso 🤔',
                        'No sé, tú pareces el impostor',
                        'Yo di una buena pista',
                        'Votemos por el que dio mala pista'
                    ];
                    setChat(prev => [...prev, { sender: randomBot.name, text: responses[Math.floor(Math.random() * responses.length)] }]);
                }
            }, 1500);
        }
    };

    const handleVote = (playerId: string) => {
        if (hasVoted) return;
        setSelectedVote(playerId);
        setHasVoted(true);

        // Update votes
        setPlayers(prev => prev.map(p =>
            p.id === playerId ? { ...p, votesAgainst: p.votesAgainst + 1 } : p
        ));

        // Bots vote
        setTimeout(() => {
            setPlayers(prev => {
                const updated = [...prev];
                const alivePlayers = updated.filter(p => p.isAlive);

                // Each bot votes randomly
                updated.filter(p => p.isBot && p.isAlive).forEach(() => {
                    const targetIndex = Math.floor(Math.random() * alivePlayers.length);
                    alivePlayers[targetIndex].votesAgainst++;
                });

                return updated;
            });

            // Process after short delay
            setTimeout(processVotes, 2000);
        }, 1500);
    };

    const processVotes = () => {
        const alivePlayers = players.filter(p => p.isAlive);
        let maxVotes = 0;
        let eliminated: Player | null = null;
        let tie = false;

        alivePlayers.forEach(p => {
            if (p.votesAgainst > maxVotes) {
                maxVotes = p.votesAgainst;
                eliminated = p;
                tie = false;
            } else if (p.votesAgainst === maxVotes && maxVotes > 0) {
                tie = true;
            }
        });

        if (tie || !eliminated) {
            setChat(prev => [...prev, { sender: 'Sistema', text: '⚖️ ¡Empate! Nadie fue eliminado.', isSystem: true }]);
            setTimeout(checkWinCondition, 3000);
        } else {
            setEliminatedPlayer(eliminated);
            setPlayers(prev => prev.map(p =>
                p.id === eliminated!.id ? { ...p, isAlive: false } : p
            ));
            setPhase('ELIMINATION');
            setTimer(5);
        }
    };

    const checkWinCondition = () => {
        const alivePlayers = players.filter(p => p.isAlive);
        const aliveImpostor = alivePlayers.find(p => p.isImpostor);
        const aliveCrew = alivePlayers.filter(p => !p.isImpostor);

        if (!aliveImpostor) {
            // Crew wins
            setWinner('CREW');
            setPhase('GAME_END');
        } else if (aliveCrew.length <= 1) {
            // Impostor wins
            setWinner('IMPOSTOR');
            setPhase('GAME_END');
        } else {
            // Next round
            setRound(prev => prev + 1);
            setPlayers(prev => prev.map(p => ({ ...p, votesAgainst: 0, hasVoted: false })));
            setClues([]);
            setHasVoted(false);
            setSelectedVote(null);
            setEliminatedPlayer(null);
            setPhase('CLUES');
            setCurrentTurn(0);
            setTimer(20);
        }
    };

    const getPhaseTitle = () => {
        switch (phase) {
            case 'ROLE_REVEAL': return '🎭 Tu Rol';
            case 'CLUES': return '📝 Fase de Pistas';
            case 'DISCUSSION': return '💬 Discusión';
            case 'VOTING': return '🗳️ Votación';
            case 'ELIMINATION': return eliminatedPlayer?.isImpostor ? '🎉 ¡ERA EL IMPOSTOR!' : '❌ No era el impostor...';
            case 'GAME_END': return winner === 'CREW' ? '🏆 ¡TRIPULACIÓN GANA!' : '💀 EL IMPOSTOR GANA';
            default: return '';
        }
    };

    const renderPhase = () => {
        switch (phase) {
            case 'ROLE_REVEAL':
                return (
                    <div className={styles.roleReveal}>
                        <div className={`${styles.roleCard} ${isImpostor ? styles.impostor : styles.crew}`}>
                            {isImpostor ? (
                                <>
                                    <div className={styles.roleIcon}>🔪</div>
                                    <h2>ERES EL IMPOSTOR</h2>
                                    <p>No sabes quién es el futbolista secreto.<br />¡Finge que lo sabes!</p>
                                </>
                            ) : (
                                <>
                                    <div className={styles.roleIcon}>⚽</div>
                                    <h2>Tu Futbolista Secreto:</h2>
                                    <div className={styles.secretWord}>{secretWord}</div>
                                    <p>Da pistas sin decir el nombre.<br />¡Descubre al impostor!</p>
                                </>
                            )}
                        </div>
                    </div>
                );

            case 'CLUES':
                const alivePlayers = players.filter(p => p.isAlive);
                const currentPlayer = alivePlayers[currentTurn];
                const isMyTurn = currentPlayer?.id === myId.current;

                return (
                    <div className={styles.cluesPhase}>
                        <div className={styles.turnIndicator}>
                            <span>Turno de: </span>
                            <strong className={isMyTurn ? styles.myTurn : ''}>{currentPlayer?.name || '...'}</strong>
                        </div>

                        <div className={styles.cluesList}>
                            {clues.map((clue, i) => (
                                <div key={i} className={styles.clueItem}>
                                    <span className={styles.clueName}>{clue.player}:</span>
                                    <span className={styles.clueText}>"{clue.clue}"</span>
                                </div>
                            ))}
                        </div>

                        {isMyTurn && (
                            <div className={styles.clueInput}>
                                <input
                                    type="text"
                                    placeholder="Escribe tu pista aquí..."
                                    value={myClue}
                                    onChange={e => setMyClue(e.target.value)}
                                    onKeyPress={e => e.key === 'Enter' && handleSubmitClue()}
                                    maxLength={100}
                                    autoFocus
                                />
                                <button onClick={handleSubmitClue}>Enviar →</button>
                            </div>
                        )}
                    </div>
                );

            case 'DISCUSSION':
                return (
                    <div className={styles.discussionPhase}>
                        <div className={styles.chatArea} ref={chatRef}>
                            {chat.map((msg, i) => (
                                <div key={i} className={`${styles.chatMessage} ${msg.isSystem ? styles.systemMessage : ''}`}>
                                    <strong>{msg.sender}:</strong> {msg.text}
                                </div>
                            ))}
                        </div>
                        <div className={styles.chatInput}>
                            <input
                                type="text"
                                placeholder="Escribe tu mensaje..."
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && handleSendChat()}
                            />
                            <button onClick={handleSendChat}>Enviar</button>
                        </div>
                    </div>
                );

            case 'VOTING':
                return (
                    <div className={styles.votingPhase}>
                        <p>¿Quién crees que es el impostor?</p>
                        <div className={styles.voteGrid}>
                            {players.filter(p => p.isAlive).map(player => (
                                <button
                                    key={player.id}
                                    className={`${styles.voteCard} ${selectedVote === player.id ? styles.selected : ''}`}
                                    onClick={() => handleVote(player.id)}
                                    disabled={hasVoted}
                                >
                                    <div className={styles.voteBean} />
                                    <span>{player.name}</span>
                                    {player.votesAgainst > 0 && (
                                        <div className={styles.voteCount}>{player.votesAgainst}</div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                );

            case 'ELIMINATION':
                return (
                    <div className={styles.eliminationPhase}>
                        <div className={`${styles.eliminationCard} ${eliminatedPlayer?.isImpostor ? styles.wasImpostor : styles.wasNotImpostor}`}>
                            <div className={styles.eliminatedBean} />
                            <h2>{eliminatedPlayer?.name}</h2>
                            <h3>{eliminatedPlayer?.isImpostor ? '¡ERA EL IMPOSTOR!' : 'No era el impostor...'}</h3>
                        </div>
                    </div>
                );

            case 'GAME_END':
                return (
                    <div className={styles.gameEnd}>
                        <div className={`${styles.winnerCard} ${winner === 'CREW' ? styles.crewWins : styles.impostorWins}`}>
                            <h1>{winner === 'CREW' ? '🏆 ¡TRIPULACIÓN GANA!' : '💀 IMPOSTOR GANA'}</h1>
                            <p>El futbolista era: <strong>{secretWord}</strong></p>
                            <p>El impostor era: <strong>{players.find(p => p.isImpostor)?.name}</strong></p>
                            <button onClick={() => navigate('/impostor-v2/menu')}>Volver al Menú</button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.background} />

            <div className={styles.header}>
                <div className={styles.phaseTitle}>{getPhaseTitle()}</div>
                <div className={styles.timer}>{timer}s</div>
                <div className={styles.roundBadge}>Ronda {round}</div>
            </div>

            {/* Players bar */}
            <div className={styles.playersBar}>
                {players.map(player => (
                    <div
                        key={player.id}
                        className={`${styles.playerIcon} ${!player.isAlive ? styles.dead : ''} ${player.id === myId.current ? styles.me : ''}`}
                        title={player.name}
                    >
                        <div className={styles.miniBean} />
                        <span>{player.name.slice(0, 8)}</span>
                    </div>
                ))}
            </div>

            <div className={styles.gameArea}>
                {renderPhase()}
            </div>
        </div>
    );
}
