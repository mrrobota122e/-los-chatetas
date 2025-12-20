import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './ImpostorGamePage.module.css';

// ============== CONSTANTES ==============
const FOOTBALLERS = [
    'Messi', 'Cristiano Ronaldo', 'Neymar', 'Mbappé', 'Haaland',
    'Vinicius Jr', 'Bellingham', 'Salah', 'De Bruyne', 'Modric'
];

const BOT_NAMES = ['Pepito', 'Juan', 'Carlos', 'María', 'Pedro'];
const BEAN_COLORS = ['#c51111', '#132ed1', '#117f2d', '#ed54ba', '#ef7d0d', '#f5f557', '#3f474e', '#d6e0f0'];

const BOT_CLUES = [
    'Juega en Europa', 'Es delantero', 'Ganó el Balón de Oro', 'Es muy rápido',
    'Viste de blanco a veces', 'Ha jugado en España', 'Es sudamericano',
    'Tiene muchos goles', 'Es joven todavía', 'Es famoso mundialmente'
];

type Phase = 'INTRO' | 'ROLE_REVEAL' | 'CLUES' | 'DISCUSSION' | 'VOTING' | 'VOTING_RESULT' | 'EXPULSION' | 'GAME_END';

interface Player {
    id: string;
    name: string;
    color: string;
    isBot: boolean;
    isImpostor: boolean;
    isAlive: boolean;
    clue?: string;
    votedFor?: string | null;
    votes: number;
}

interface ChatMessage {
    id: number;
    sender: string;
    senderColor: string;
    text: string;
    isSystem?: boolean;
}

export default function ImpostorGamePage() {
    const { roomCode } = useParams<{ roomCode: string }>();
    const navigate = useNavigate();

    // Game State
    const [phase, setPhase] = useState<Phase>('INTRO');
    const [players, setPlayers] = useState<Player[]>([]);
    const [secretWord, setSecretWord] = useState('');
    const [isImpostor, setIsImpostor] = useState(false);
    const [timer, setTimer] = useState(0);
    const [maxTimer, setMaxTimer] = useState(0);
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
    const [chat, setChat] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [myClue, setMyClue] = useState('');
    const [hasVoted, setHasVoted] = useState(false);
    const [eliminatedPlayer, setEliminatedPlayer] = useState<Player | null>(null);
    const [winner, setWinner] = useState<'CREW' | 'IMPOSTOR' | null>(null);
    const [round, setRound] = useState(1);
    const [showEmergency, setShowEmergency] = useState(false);

    const myId = useRef(`player-${Date.now()}`);
    const chatRef = useRef<HTMLDivElement>(null);
    const msgIdRef = useRef(0);

    // ============== INICIALIZACIÓN ==============
    useEffect(() => {
        initializeGame();
    }, []);

    const initializeGame = () => {
        const playerName = localStorage.getItem('globalPlayerName') || 'Tú';

        // Create players with colors
        const gamePlayers: Player[] = [
            { id: myId.current, name: playerName, color: BEAN_COLORS[0], isBot: false, isImpostor: false, isAlive: true, votes: 0 }
        ];

        // Add 4 bots
        BOT_NAMES.slice(0, 4).forEach((name, i) => {
            gamePlayers.push({
                id: `bot-${i}`,
                name,
                color: BEAN_COLORS[i + 1],
                isBot: true,
                isImpostor: false,
                isAlive: true,
                votes: 0
            });
        });

        // Pick impostor (70% bot, 30% player)
        const impostorIndex = Math.random() < 0.3 ? 0 : Math.floor(Math.random() * 4) + 1;
        gamePlayers[impostorIndex].isImpostor = true;

        // Secret word
        const word = FOOTBALLERS[Math.floor(Math.random() * FOOTBALLERS.length)];

        setPlayers(gamePlayers);
        setSecretWord(word);
        setIsImpostor(gamePlayers[0].isImpostor);

        // Start intro
        setPhase('INTRO');
        setTimer(3);
        setMaxTimer(3);
    };

    // ============== TIMER ==============
    useEffect(() => {
        if (timer <= 0) {
            handlePhaseEnd();
            return;
        }

        const interval = setInterval(() => {
            setTimer(prev => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(interval);
    }, [timer, phase]);

    // Auto scroll chat
    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [chat]);

    // ============== TRANSICIONES ==============
    const handlePhaseEnd = useCallback(() => {
        switch (phase) {
            case 'INTRO':
                setPhase('ROLE_REVEAL');
                setTimer(6);
                setMaxTimer(6);
                break;

            case 'ROLE_REVEAL':
                setPhase('CLUES');
                setCurrentPlayerIndex(0);
                setTimer(15);
                setMaxTimer(15);
                break;

            case 'CLUES':
                const alivePlayers = players.filter(p => p.isAlive);
                const currentPlayer = alivePlayers[currentPlayerIndex];

                // Bot auto-clue
                if (currentPlayer?.isBot && !currentPlayer.clue) {
                    const clue = BOT_CLUES[Math.floor(Math.random() * BOT_CLUES.length)];
                    setPlayers(prev => prev.map(p =>
                        p.id === currentPlayer.id ? { ...p, clue } : p
                    ));
                }

                if (currentPlayerIndex < alivePlayers.length - 1) {
                    setCurrentPlayerIndex(prev => prev + 1);
                    setTimer(15);
                    setMaxTimer(15);
                } else {
                    // All clues done
                    setShowEmergency(true);
                    setTimeout(() => {
                        setShowEmergency(false);
                        setPhase('DISCUSSION');
                        setTimer(45);
                        setMaxTimer(45);
                        addSystemMessage('💬 ¡DISCUSIÓN ABIERTA!');
                    }, 2000);
                }
                break;

            case 'DISCUSSION':
                setPhase('VOTING');
                setTimer(20);
                setMaxTimer(20);
                addSystemMessage('🗳️ ¡HORA DE VOTAR!');
                break;

            case 'VOTING':
                processVotes();
                break;

            case 'VOTING_RESULT':
                if (eliminatedPlayer) {
                    setPhase('EXPULSION');
                    setTimer(5);
                    setMaxTimer(5);
                } else {
                    checkWinOrNextRound();
                }
                break;

            case 'EXPULSION':
                checkWinOrNextRound();
                break;
        }
    }, [phase, currentPlayerIndex, players, eliminatedPlayer]);

    // ============== HELPERS ==============
    const addSystemMessage = (text: string) => {
        setChat(prev => [...prev, {
            id: ++msgIdRef.current,
            sender: '',
            senderColor: '',
            text,
            isSystem: true
        }]);
    };

    const addChatMessage = (sender: string, color: string, text: string) => {
        setChat(prev => [...prev, {
            id: ++msgIdRef.current,
            sender,
            senderColor: color,
            text
        }]);
    };

    // ============== ACCIONES ==============
    const handleSubmitClue = () => {
        if (!myClue.trim()) return;

        const alivePlayers = players.filter(p => p.isAlive);
        if (alivePlayers[currentPlayerIndex]?.id !== myId.current) return;

        setPlayers(prev => prev.map(p =>
            p.id === myId.current ? { ...p, clue: myClue.trim() } : p
        ));
        setMyClue('');

        // Move to next
        if (currentPlayerIndex < alivePlayers.length - 1) {
            setCurrentPlayerIndex(prev => prev + 1);
            setTimer(15);

            // Bot auto-clue after delay
            setTimeout(() => {
                const nextPlayer = alivePlayers[currentPlayerIndex + 1];
                if (nextPlayer?.isBot) {
                    const clue = BOT_CLUES[Math.floor(Math.random() * BOT_CLUES.length)];
                    setPlayers(prev => prev.map(p =>
                        p.id === nextPlayer.id ? { ...p, clue } : p
                    ));
                }
            }, 2000);
        } else {
            setShowEmergency(true);
            setTimeout(() => {
                setShowEmergency(false);
                setPhase('DISCUSSION');
                setTimer(45);
                setMaxTimer(45);
            }, 2000);
        }
    };

    const handleSendChat = () => {
        if (!chatInput.trim() || phase !== 'DISCUSSION') return;

        addChatMessage(players[0].name, players[0].color, chatInput.trim());
        setChatInput('');

        // Bot response
        if (Math.random() > 0.5) {
            setTimeout(() => {
                const bot = players.filter(p => p.isBot && p.isAlive)[Math.floor(Math.random() * 4)];
                if (bot) {
                    const responses = ['Hmm sospechoso...', 'Yo no fui 😅', 'Votemos ya', '¿Quién fue?'];
                    addChatMessage(bot.name, bot.color, responses[Math.floor(Math.random() * responses.length)]);
                }
            }, 1500);
        }
    };

    const handleVote = (targetId: string | null) => {
        if (hasVoted || phase !== 'VOTING') return;

        setHasVoted(true);
        setPlayers(prev => prev.map(p =>
            p.id === myId.current ? { ...p, votedFor: targetId } : p
        ));

        if (targetId) {
            setPlayers(prev => prev.map(p =>
                p.id === targetId ? { ...p, votes: p.votes + 1 } : p
            ));
        }

        // Bots vote
        setTimeout(() => {
            const alivePlayers = players.filter(p => p.isAlive);
            setPlayers(prev => {
                const updated = [...prev];
                updated.filter(p => p.isBot && p.isAlive).forEach(bot => {
                    // Bots vote randomly
                    if (Math.random() > 0.2) {
                        const targetIdx = Math.floor(Math.random() * alivePlayers.length);
                        const target = alivePlayers[targetIdx];
                        const found = updated.find(p => p.id === target.id);
                        if (found) found.votes++;
                    }
                });
                return updated;
            });

            setTimeout(processVotes, 1500);
        }, 1000);
    };

    const processVotes = () => {
        const alivePlayers = players.filter(p => p.isAlive);
        let maxVotes = 0;
        let eliminated: Player | null = null;
        let tie = false;

        alivePlayers.forEach(p => {
            if (p.votes > maxVotes) {
                maxVotes = p.votes;
                eliminated = p;
                tie = false;
            } else if (p.votes === maxVotes && maxVotes > 0) {
                tie = true;
            }
        });

        if (tie || maxVotes === 0) {
            setEliminatedPlayer(null);
            addSystemMessage('⚖️ EMPATE - Nadie fue expulsado');
        } else if (eliminated) {
            setEliminatedPlayer(eliminated);
            setPlayers(prev => prev.map(p =>
                p.id === eliminated!.id ? { ...p, isAlive: false } : p
            ));
        }

        setPhase('VOTING_RESULT');
        setTimer(3);
        setMaxTimer(3);
    };

    const checkWinOrNextRound = () => {
        const alivePlayers = players.filter(p => p.isAlive);
        const aliveImpostor = alivePlayers.find(p => p.isImpostor);
        const aliveCrew = alivePlayers.filter(p => !p.isImpostor);

        if (!aliveImpostor) {
            setWinner('CREW');
            setPhase('GAME_END');
        } else if (aliveCrew.length <= 1) {
            setWinner('IMPOSTOR');
            setPhase('GAME_END');
        } else {
            // Next round
            setRound(prev => prev + 1);
            setPlayers(prev => prev.map(p => ({ ...p, votes: 0, votedFor: undefined, clue: undefined })));
            setHasVoted(false);
            setEliminatedPlayer(null);
            setCurrentPlayerIndex(0);
            setPhase('CLUES');
            setTimer(15);
            setMaxTimer(15);
        }
    };

    // ============== RENDER ==============
    const alivePlayers = players.filter(p => p.isAlive);
    const currentPlayer = alivePlayers[currentPlayerIndex];
    const isMyTurn = currentPlayer?.id === myId.current;
    const timerPercent = maxTimer > 0 ? (timer / maxTimer) * 100 : 0;

    return (
        <div className={styles.container}>
            {/* Background */}
            <div className={styles.spaceBackground}>
                <div className={styles.stars} />
            </div>

            {/* Emergency Meeting Overlay */}
            {showEmergency && (
                <div className={styles.emergencyOverlay}>
                    <div className={styles.emergencyText}>🚨 REUNIÓN DE EMERGENCIA 🚨</div>
                </div>
            )}

            {/* Header */}
            <header className={styles.header}>
                <div className={styles.roundBadge}>Ronda {round}</div>
                <div className={styles.phaseTitle}>{getPhaseTitle()}</div>
                <div className={styles.timerCircle}>
                    <svg viewBox="0 0 36 36">
                        <path className={styles.timerBg}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className={styles.timerFill}
                            strokeDasharray={`${timerPercent}, 100`}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <span>{timer}</span>
                </div>
            </header>

            {/* Main Game Area */}
            <main className={styles.gameArea}>
                {phase === 'INTRO' && (
                    <div className={styles.introScreen}>
                        <div className={styles.introLogo}>⚽</div>
                        <h1>IMPOSTOR FÚTBOL</h1>
                        <p>Preparando partida...</p>
                    </div>
                )}

                {phase === 'ROLE_REVEAL' && (
                    <div className={styles.roleReveal}>
                        <div className={`${styles.roleCard} ${isImpostor ? styles.impostorCard : styles.crewCard}`}>
                            <div className={styles.roleBeanLarge} style={{ '--bean-color': players[0]?.color } as any} />
                            {isImpostor ? (
                                <>
                                    <h1 className={styles.impostorTitle}>ERES EL IMPOSTOR</h1>
                                    <p>No sabes quién es el futbolista.<br />¡Finge que lo sabes!</p>
                                </>
                            ) : (
                                <>
                                    <h2>Tu futbolista es:</h2>
                                    <div className={styles.secretWord}>{secretWord}</div>
                                    <p>Da pistas sin decir el nombre</p>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {(phase === 'CLUES' || phase === 'DISCUSSION' || phase === 'VOTING') && (
                    <div className={styles.meetingRoom}>
                        {/* Table with players */}
                        <div className={styles.tableArea}>
                            <div className={styles.table}>
                                <span>REUNIÓN</span>
                            </div>
                            <div className={styles.playersCircle}>
                                {alivePlayers.map((player, idx) => (
                                    <div
                                        key={player.id}
                                        className={`${styles.playerSeat} ${phase === 'CLUES' && currentPlayer?.id === player.id ? styles.active : ''}`}
                                        style={{ '--seat-angle': `${(idx / alivePlayers.length) * 360}deg` } as any}
                                    >
                                        <div className={styles.playerBean} style={{ '--bean-color': player.color } as any}>
                                            {phase === 'CLUES' && currentPlayer?.id === player.id && (
                                                <div className={styles.speakingIndicator}>💬</div>
                                            )}
                                        </div>
                                        <span className={styles.playerName}>{player.name}</span>
                                        {player.clue && phase !== 'VOTING' && (
                                            <div className={styles.clueBubble}>"{player.clue}"</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Bottom Panel */}
                        <div className={styles.bottomPanel}>
                            {phase === 'CLUES' && isMyTurn && (
                                <div className={styles.clueInput}>
                                    <input
                                        type="text"
                                        placeholder="Escribe tu pista..."
                                        value={myClue}
                                        onChange={e => setMyClue(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && handleSubmitClue()}
                                        maxLength={50}
                                        autoFocus
                                    />
                                    <button onClick={handleSubmitClue}>ENVIAR</button>
                                </div>
                            )}

                            {phase === 'CLUES' && !isMyTurn && (
                                <div className={styles.waitingMessage}>
                                    Esperando pista de <strong>{currentPlayer?.name}</strong>...
                                </div>
                            )}

                            {phase === 'DISCUSSION' && (
                                <div className={styles.discussionPanel}>
                                    <div className={styles.chatMessages} ref={chatRef}>
                                        {chat.map(msg => (
                                            <div key={msg.id} className={`${styles.chatMsg} ${msg.isSystem ? styles.systemMsg : ''}`}>
                                                {!msg.isSystem && (
                                                    <span className={styles.chatSender} style={{ color: msg.senderColor }}>
                                                        {msg.sender}:
                                                    </span>
                                                )}
                                                <span>{msg.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className={styles.chatInputRow}>
                                        <input
                                            type="text"
                                            placeholder="Escribe..."
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            onKeyPress={e => e.key === 'Enter' && handleSendChat()}
                                        />
                                        <button onClick={handleSendChat}>→</button>
                                    </div>
                                </div>
                            )}

                            {phase === 'VOTING' && (
                                <div className={styles.votingPanel}>
                                    <h3>¿Quién es el impostor?</h3>
                                    <div className={styles.voteOptions}>
                                        {alivePlayers.map(player => (
                                            <button
                                                key={player.id}
                                                className={styles.voteButton}
                                                onClick={() => handleVote(player.id)}
                                                disabled={hasVoted}
                                            >
                                                <div className={styles.voteBeanMini} style={{ '--bean-color': player.color } as any} />
                                                <span>{player.name}</span>
                                                {player.votes > 0 && <span className={styles.voteCount}>{player.votes}</span>}
                                            </button>
                                        ))}
                                        <button
                                            className={`${styles.voteButton} ${styles.skipVote}`}
                                            onClick={() => handleVote(null)}
                                            disabled={hasVoted}
                                        >
                                            SKIP
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {phase === 'VOTING_RESULT' && (
                    <div className={styles.votingResult}>
                        {eliminatedPlayer ? (
                            <div className={styles.ejectedText}>
                                <div className={styles.ejectedBean} style={{ '--bean-color': eliminatedPlayer.color } as any} />
                                <h2>{eliminatedPlayer.name}</h2>
                                <h3>fue expulsado</h3>
                            </div>
                        ) : (
                            <div className={styles.noEject}>
                                <h2>EMPATE</h2>
                                <h3>Nadie fue expulsado</h3>
                            </div>
                        )}
                    </div>
                )}

                {phase === 'EXPULSION' && eliminatedPlayer && (
                    <div className={styles.expulsionScreen}>
                        <div className={`${styles.expulsionBean} ${eliminatedPlayer.isImpostor ? styles.wasImpostor : ''}`}
                            style={{ '--bean-color': eliminatedPlayer.color } as any} />
                        <div className={styles.expulsionText}>
                            <h1>{eliminatedPlayer.name}</h1>
                            <h2 className={eliminatedPlayer.isImpostor ? styles.textGreen : styles.textRed}>
                                {eliminatedPlayer.isImpostor ? 'ERA EL IMPOSTOR' : 'NO era el impostor'}
                            </h2>
                        </div>
                    </div>
                )}

                {phase === 'GAME_END' && (
                    <div className={`${styles.gameEndScreen} ${winner === 'CREW' ? styles.crewWins : styles.impostorWins}`}>
                        <h1>{winner === 'CREW' ? '🏆 VICTORIA' : '💀 DERROTA'}</h1>
                        <h2>{winner === 'CREW' ? '¡El impostor fue descubierto!' : 'El impostor ha ganado'}</h2>
                        <p>El futbolista era: <strong>{secretWord}</strong></p>
                        <p>El impostor era: <strong>{players.find(p => p.isImpostor)?.name}</strong></p>
                        <button onClick={() => navigate('/impostor-v2/menu')}>VOLVER AL MENÚ</button>
                    </div>
                )}
            </main>
        </div>
    );

    function getPhaseTitle() {
        switch (phase) {
            case 'INTRO': return 'PREPARANDO...';
            case 'ROLE_REVEAL': return 'TU ROL';
            case 'CLUES': return `PISTAS - Turno de ${currentPlayer?.name || '...'}`;
            case 'DISCUSSION': return 'DISCUSIÓN';
            case 'VOTING': return 'VOTACIÓN';
            case 'VOTING_RESULT': return 'RESULTADO';
            case 'EXPULSION': return 'EXPULSIÓN';
            case 'GAME_END': return winner === 'CREW' ? 'VICTORIA' : 'DERROTA';
        }
    }
}
