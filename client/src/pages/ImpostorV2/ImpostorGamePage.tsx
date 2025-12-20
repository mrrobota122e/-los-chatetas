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
    'Juega en Europa', 'Es delantero', 'Ganó premios', 'Es muy rápido',
    'Viste de blanco', 'Ha jugado en España', 'Es sudamericano',
    'Tiene muchos goles', 'Es joven', 'Es famoso mundial'
];

// Sound URLs (free sounds)
const SOUNDS = {
    meeting: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkJqLdGBmbH6KkI2CdG5xf4mNjoV6c3J+iI2Ni4F5dn+Gi4yLiIN9foSIi4qJhYKAhIeJiomHhYOEhoiJiIeGhYWGh4iIh4eGhoaHh4eHh4eHh4eHh4eHh4eHh4eHhw==',
    vote: 'data:audio/wav;base64,UklGRl4FAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoFAAB+gH1+gIKBgH9+gIGCgYB/f4CBgYGAgH+AgYGBgIB/gIGBgYCAgICBgYGAgICAgoGBgICAgIGBgYCAgICBgYGBgICAgQ==',
    eject: 'data:audio/wav;base64,UklGRpYHAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YfIGAACAf4CBgIGCg4OEhYWGh4eIiImJiouLjIyNjo6PkJCRkpKTlJSVlpaXmJiZmpqbnJydnZ6en6ChoKKio6Oko6Win52bmZeVko+MiYaCfnp2cm5raGRgXVlVUU1JRUFAPDs4NTIvLCsoJSIgHRsYFhQSEA4MCggGBAMBAAABAgQFBwkLDQ==',
    win: 'data:audio/wav;base64,UklGRn4FAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVoFAACAgICAgIKEhoiKjI6QkpSWmJqcnqCio6WnqKqsra+wsrO1tri5u7y+v8DCw8XGx8nKy8zOz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/w=='
};

type Phase = 'INTRO' | 'ROLE_REVEAL' | 'CLUES' | 'DISCUSSION' | 'VOTING' | 'VOTING_RESULT' | 'EXPULSION' | 'GAME_END';

interface Player {
    id: string;
    name: string;
    color: string;
    isBot: boolean;
    isImpostor: boolean;
    isAlive: boolean;
    clue?: string;
    votes: number;
    skipped?: boolean;
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
    const [particles, setParticles] = useState<{ x: number, y: number, id: number }[]>([]);

    const myId = useRef(`player-${Date.now()}`);
    const chatRef = useRef<HTMLDivElement>(null);
    const msgIdRef = useRef(0);

    // Sound player
    const playSound = (soundName: keyof typeof SOUNDS) => {
        try {
            const audio = new Audio(SOUNDS[soundName]);
            audio.volume = 0.3;
            audio.play().catch(() => { });
        } catch (e) { }
    };

    // Create particles
    useEffect(() => {
        const interval = setInterval(() => {
            setParticles(prev => [
                ...prev.slice(-20),
                { x: Math.random() * 100, y: Math.random() * 100, id: Date.now() }
            ]);
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // ============== INIT ==============
    useEffect(() => {
        initializeGame();
    }, []);

    const initializeGame = () => {
        const playerName = localStorage.getItem('globalPlayerName') || 'Tú';

        const gamePlayers: Player[] = [
            { id: myId.current, name: playerName, color: BEAN_COLORS[0], isBot: false, isImpostor: false, isAlive: true, votes: 0 }
        ];

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

        const impostorIndex = Math.random() < 0.3 ? 0 : Math.floor(Math.random() * 4) + 1;
        gamePlayers[impostorIndex].isImpostor = true;

        const word = FOOTBALLERS[Math.floor(Math.random() * FOOTBALLERS.length)];

        setPlayers(gamePlayers);
        setSecretWord(word);
        setIsImpostor(gamePlayers[0].isImpostor);
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

    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [chat]);

    // ============== PHASE TRANSITIONS ==============
    const handlePhaseEnd = useCallback(() => {
        switch (phase) {
            case 'INTRO':
                setPhase('ROLE_REVEAL');
                setTimer(5);
                setMaxTimer(5);
                break;

            case 'ROLE_REVEAL':
                playSound('meeting');
                setShowEmergency(true);
                setTimeout(() => {
                    setShowEmergency(false);
                    setPhase('CLUES');
                    setCurrentPlayerIndex(0);
                    setTimer(12);
                    setMaxTimer(12);
                    simulateBotClueIfNeeded(0);
                }, 2500);
                break;

            case 'CLUES':
                // AUTO-SKIP: If player didn't give clue, mark as skipped
                const alivePlayers = players.filter(p => p.isAlive);
                const current = alivePlayers[currentPlayerIndex];

                if (current && !current.clue && !current.isBot) {
                    setPlayers(prev => prev.map(p =>
                        p.id === current.id ? { ...p, clue: '(No dio pista)', skipped: true } : p
                    ));
                    addSystemMessage(`⏰ ${current.name} no dio pista a tiempo!`);
                }

                if (currentPlayerIndex < alivePlayers.length - 1) {
                    const nextIdx = currentPlayerIndex + 1;
                    setCurrentPlayerIndex(nextIdx);
                    setTimer(12);
                    simulateBotClueIfNeeded(nextIdx);
                } else {
                    playSound('meeting');
                    setShowEmergency(true);
                    setTimeout(() => {
                        setShowEmergency(false);
                        setPhase('DISCUSSION');
                        setTimer(40);
                        setMaxTimer(40);
                        addSystemMessage('💬 ¡DISCUSIÓN ABIERTA!');
                    }, 2000);
                }
                break;

            case 'DISCUSSION':
                playSound('vote');
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
                    playSound('eject');
                    setPhase('EXPULSION');
                    setTimer(6);
                    setMaxTimer(6);
                } else {
                    checkWinOrNextRound();
                }
                break;

            case 'EXPULSION':
                checkWinOrNextRound();
                break;
        }
    }, [phase, currentPlayerIndex, players, eliminatedPlayer]);

    const simulateBotClueIfNeeded = (idx: number) => {
        const alivePlayers = players.filter(p => p.isAlive);
        const player = alivePlayers[idx];
        if (player?.isBot) {
            setTimeout(() => {
                const clue = BOT_CLUES[Math.floor(Math.random() * BOT_CLUES.length)];
                setPlayers(prev => prev.map(p =>
                    p.id === player.id ? { ...p, clue } : p
                ));
            }, 2000 + Math.random() * 3000);
        }
    };

    // ============== HELPERS ==============
    const addSystemMessage = (text: string) => {
        setChat(prev => [...prev, { id: ++msgIdRef.current, sender: '', senderColor: '', text, isSystem: true }]);
    };

    const handleSubmitClue = () => {
        if (!myClue.trim()) return;

        const alivePlayers = players.filter(p => p.isAlive);
        if (alivePlayers[currentPlayerIndex]?.id !== myId.current) return;

        setPlayers(prev => prev.map(p =>
            p.id === myId.current ? { ...p, clue: myClue.trim() } : p
        ));
        setMyClue('');

        // Move to next immediately
        if (currentPlayerIndex < alivePlayers.length - 1) {
            const nextIdx = currentPlayerIndex + 1;
            setCurrentPlayerIndex(nextIdx);
            setTimer(12);
            simulateBotClueIfNeeded(nextIdx);
        } else {
            playSound('meeting');
            setShowEmergency(true);
            setTimeout(() => {
                setShowEmergency(false);
                setPhase('DISCUSSION');
                setTimer(40);
                setMaxTimer(40);
            }, 2000);
        }
    };

    const handleSendChat = () => {
        if (!chatInput.trim() || phase !== 'DISCUSSION') return;

        setChat(prev => [...prev, { id: ++msgIdRef.current, sender: players[0].name, senderColor: players[0].color, text: chatInput.trim() }]);
        setChatInput('');

        if (Math.random() > 0.4) {
            setTimeout(() => {
                const bot = players.filter(p => p.isBot && p.isAlive)[Math.floor(Math.random() * 4)];
                if (bot) {
                    const responses = ['🤔 Sospechoso...', 'Yo no fui', '¿Votamos?', 'Dudo de ti', 'Skip vote mejor'];
                    setChat(prev => [...prev, { id: ++msgIdRef.current, sender: bot.name, senderColor: bot.color, text: responses[Math.floor(Math.random() * responses.length)] }]);
                }
            }, 1000 + Math.random() * 2000);
        }
    };

    const handleVote = (targetId: string | null) => {
        if (hasVoted || phase !== 'VOTING') return;

        playSound('vote');
        setHasVoted(true);

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
                updated.filter(p => p.isBot && p.isAlive).forEach(() => {
                    if (Math.random() > 0.15) {
                        const targetIdx = Math.floor(Math.random() * alivePlayers.length);
                        const target = updated.find(p => p.id === alivePlayers[targetIdx].id);
                        if (target) target.votes++;
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
            addSystemMessage('⚖️ EMPATE - Nadie expulsado');
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
            playSound('win');
            setWinner('CREW');
            setPhase('GAME_END');
        } else if (aliveCrew.length <= 1) {
            setWinner('IMPOSTOR');
            setPhase('GAME_END');
        } else {
            setRound(prev => prev + 1);
            setPlayers(prev => prev.map(p => ({ ...p, votes: 0, clue: undefined, skipped: false })));
            setHasVoted(false);
            setEliminatedPlayer(null);
            setCurrentPlayerIndex(0);
            setPhase('CLUES');
            setTimer(12);
            setMaxTimer(12);
            simulateBotClueIfNeeded(0);
        }
    };

    // ============== RENDER ==============
    const alivePlayers = players.filter(p => p.isAlive);
    const currentPlayer = alivePlayers[currentPlayerIndex];
    const isMyTurn = currentPlayer?.id === myId.current;
    const timerPercent = maxTimer > 0 ? (timer / maxTimer) * 100 : 0;

    return (
        <div className={styles.container}>
            {/* Particles */}
            <div className={styles.particlesContainer}>
                {particles.map(p => (
                    <div key={p.id} className={styles.particle} style={{ left: `${p.x}%`, top: `${p.y}%` }} />
                ))}
            </div>

            {/* Background */}
            <div className={styles.spaceBackground}>
                <div className={styles.nebula} />
                <div className={styles.stars} />
                <div className={styles.shootingStar} />
            </div>

            {/* Emergency */}
            {showEmergency && (
                <div className={styles.emergencyOverlay}>
                    <div className={styles.emergencyContent}>
                        <div className={styles.emergencyIcon}>🚨</div>
                        <h1>REUNIÓN DE EMERGENCIA</h1>
                        <div className={styles.emergencyPulse} />
                    </div>
                </div>
            )}

            {/* Header */}
            <header className={styles.header}>
                <div className={styles.roundBadge}>
                    <span className={styles.roundIcon}>🔄</span>
                    RONDA {round}
                </div>
                <div className={styles.phaseTitle}>
                    <span className={styles.phaseGlow}>{getPhaseTitle()}</span>
                </div>
                <div className={styles.timerContainer}>
                    <svg className={styles.timerSvg} viewBox="0 0 100 100">
                        <circle className={styles.timerBg} cx="50" cy="50" r="45" />
                        <circle
                            className={styles.timerFill}
                            cx="50" cy="50" r="45"
                            strokeDasharray={`${timerPercent * 2.83} 283`}
                        />
                    </svg>
                    <span className={styles.timerText}>{timer}</span>
                </div>
            </header>

            {/* Main */}
            <main className={styles.gameArea}>
                {phase === 'INTRO' && (
                    <div className={styles.introScreen}>
                        <div className={styles.introBean} />
                        <h1 className={styles.introTitle}>IMPOSTOR</h1>
                        <h2 className={styles.introSubtitle}>⚽ FÚTBOL EDITION</h2>
                        <div className={styles.loadingBar}>
                            <div className={styles.loadingFill} />
                        </div>
                    </div>
                )}

                {phase === 'ROLE_REVEAL' && (
                    <div className={styles.roleReveal}>
                        <div className={`${styles.roleCard} ${isImpostor ? styles.impostorCard : styles.crewCard}`}>
                            <div className={styles.roleBean} style={{ '--bean-color': players[0]?.color } as any}>
                                <div className={styles.beanVisor} />
                                <div className={styles.beanBackpack} />
                            </div>
                            {isImpostor ? (
                                <>
                                    <h1 className={styles.impostorTitle}>🔪 IMPOSTOR</h1>
                                    <p className={styles.impostorHint}>No sabes la palabra secreta.<br />¡Finge que sí!</p>
                                </>
                            ) : (
                                <>
                                    <h2>Tu futbolista secreto es:</h2>
                                    <div className={styles.secretWord}>{secretWord}</div>
                                    <p>Da pistas sin revelar el nombre</p>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {(phase === 'CLUES' || phase === 'DISCUSSION' || phase === 'VOTING') && (
                    <div className={styles.meetingRoom}>
                        <div className={styles.tableArea}>
                            <div className={styles.table3D}>
                                <div className={styles.tableTop}>
                                    <span>REUNIÓN</span>
                                </div>
                                <div className={styles.tableReflection} />
                            </div>
                            <div className={styles.playersCircle}>
                                {alivePlayers.map((player, idx) => (
                                    <div
                                        key={player.id}
                                        className={`${styles.playerSeat} ${currentPlayer?.id === player.id && phase === 'CLUES' ? styles.activeSeat : ''}`}
                                        style={{ '--seat-angle': `${(idx / alivePlayers.length) * 360}deg` } as any}
                                    >
                                        <div className={styles.playerGlow} />
                                        <div className={styles.playerBean} style={{ '--bean-color': player.color } as any}>
                                            <div className={styles.beanVisor} />
                                            <div className={styles.beanBackpack} />
                                            {phase === 'CLUES' && currentPlayer?.id === player.id && (
                                                <div className={styles.typing}>
                                                    <span></span><span></span><span></span>
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.playerLabel}>{player.name}</div>
                                        {player.clue && (
                                            <div className={`${styles.clueBubble} ${player.skipped ? styles.skippedClue : ''}`}>
                                                {player.clue}
                                                <div className={styles.bubbleTail} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={styles.bottomPanel}>
                            {phase === 'CLUES' && (
                                <div className={styles.cluesPanel}>
                                    <div className={styles.turnInfo}>
                                        <span className={styles.turnIcon}>🎤</span>
                                        <span>Turno de </span>
                                        <strong style={{ color: currentPlayer?.color }}>{currentPlayer?.name}</strong>
                                    </div>
                                    {isMyTurn && (
                                        <div className={styles.inputGroup}>
                                            <input
                                                type="text"
                                                placeholder="Escribe tu pista..."
                                                value={myClue}
                                                onChange={e => setMyClue(e.target.value)}
                                                onKeyPress={e => e.key === 'Enter' && handleSubmitClue()}
                                                maxLength={40}
                                                autoFocus
                                            />
                                            <button onClick={handleSubmitClue} className={styles.sendBtn}>
                                                <span>ENVIAR</span>
                                                <span className={styles.btnGlow} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {phase === 'DISCUSSION' && (
                                <div className={styles.chatPanel}>
                                    <div className={styles.chatHeader}>
                                        <span>💬 CHAT</span>
                                    </div>
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
                                    <div className={styles.inputGroup}>
                                        <input
                                            type="text"
                                            placeholder="Escribe..."
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            onKeyPress={e => e.key === 'Enter' && handleSendChat()}
                                        />
                                        <button onClick={handleSendChat} className={styles.sendBtn}>→</button>
                                    </div>
                                </div>
                            )}

                            {phase === 'VOTING' && (
                                <div className={styles.votingPanel}>
                                    <div className={styles.votingTitle}>
                                        <span>🗳️</span>
                                        <h3>¿QUIÉN ES EL IMPOSTOR?</h3>
                                    </div>
                                    <div className={styles.voteGrid}>
                                        {alivePlayers.map(player => (
                                            <button
                                                key={player.id}
                                                className={`${styles.voteCard} ${hasVoted ? styles.voted : ''}`}
                                                onClick={() => handleVote(player.id)}
                                                disabled={hasVoted}
                                            >
                                                <div className={styles.voteBeanWrap}>
                                                    <div className={styles.voteBean} style={{ '--bean-color': player.color } as any}>
                                                        <div className={styles.beanVisor} />
                                                    </div>
                                                </div>
                                                <span className={styles.voteName}>{player.name}</span>
                                                {player.votes > 0 && (
                                                    <div className={styles.voteCount}>{player.votes}</div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        className={styles.skipButton}
                                        onClick={() => handleVote(null)}
                                        disabled={hasVoted}
                                    >
                                        SKIP VOTE
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {phase === 'VOTING_RESULT' && (
                    <div className={styles.resultScreen}>
                        {eliminatedPlayer ? (
                            <>
                                <div className={styles.resultBean} style={{ '--bean-color': eliminatedPlayer.color } as any}>
                                    <div className={styles.beanVisor} />
                                </div>
                                <h2>{eliminatedPlayer.name}</h2>
                                <h3>será expulsado...</h3>
                            </>
                        ) : (
                            <>
                                <div className={styles.noEjectIcon}>⚖️</div>
                                <h2>EMPATE</h2>
                                <h3>Nadie será expulsado</h3>
                            </>
                        )}
                    </div>
                )}

                {phase === 'EXPULSION' && eliminatedPlayer && (
                    <div className={styles.expulsionScreen}>
                        <div className={`${styles.ejectBean} ${eliminatedPlayer.isImpostor ? styles.wasImpostor : ''}`}
                            style={{ '--bean-color': eliminatedPlayer.color } as any}>
                            <div className={styles.beanVisor} />
                        </div>
                        <div className={styles.ejectText}>
                            <h1>{eliminatedPlayer.name}</h1>
                            <h2 className={eliminatedPlayer.isImpostor ? styles.greenText : styles.grayText}>
                                {eliminatedPlayer.isImpostor ? '¡ERA EL IMPOSTOR!' : 'no era el impostor...'}
                            </h2>
                            <p>{alivePlayers.length - 1} jugadores restantes</p>
                        </div>
                    </div>
                )}

                {phase === 'GAME_END' && (
                    <div className={`${styles.gameEndScreen} ${winner === 'CREW' ? styles.crewWins : styles.impostorWins}`}>
                        <div className={styles.endContent}>
                            <div className={styles.endIcon}>{winner === 'CREW' ? '🏆' : '💀'}</div>
                            <h1>{winner === 'CREW' ? '¡VICTORIA!' : 'DERROTA'}</h1>
                            <h2>{winner === 'CREW' ? '¡Descubrieron al impostor!' : 'El impostor ganó'}</h2>
                            <div className={styles.endDetails}>
                                <p>Palabra secreta: <strong>{secretWord}</strong></p>
                                <p>Impostor: <strong>{players.find(p => p.isImpostor)?.name}</strong></p>
                            </div>
                            <button onClick={() => navigate('/impostor-v2/menu')} className={styles.endButton}>
                                VOLVER AL MENÚ
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );

    function getPhaseTitle() {
        switch (phase) {
            case 'INTRO': return 'CARGANDO...';
            case 'ROLE_REVEAL': return 'TU ROL';
            case 'CLUES': return `PISTAS`;
            case 'DISCUSSION': return 'DISCUSIÓN';
            case 'VOTING': return 'VOTACIÓN';
            case 'VOTING_RESULT': return 'RESULTADO';
            case 'EXPULSION': return 'EXPULSIÓN';
            case 'GAME_END': return winner === 'CREW' ? 'VICTORIA' : 'DERROTA';
        }
    }
}
