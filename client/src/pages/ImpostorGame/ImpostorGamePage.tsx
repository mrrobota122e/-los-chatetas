import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../hooks/useSocket';
import styles from './ImpostorGamePage.module.css';

// Types
interface Player {
    id: string;
    socketId: string;
    name: string;
    avatarColor: string;
    isAlive: boolean;
    hasVoted?: boolean;
}

interface GameState {
    gameId: string;
    phase: 'WAITING' | 'ROLE_REVEAL' | 'CLUES' | 'DISCUSSION' | 'VOTING' | 'RESULTS' | 'GAME_OVER';
    round: number;
    word: string | null;
    isImpostor: boolean;
    players: Player[];
    currentTurnId: string | null;
    timeRemaining: number;
    votes: Record<string, string[]>;
    clues: { playerId: string; playerName: string; clue: string }[];
    eliminatedPlayer: Player | null;
    winner: 'IMPOSTOR' | 'CREW' | null;
}

const COLORS = ['#c51111', '#132ed2', '#11802d', '#ee54bb', '#f5f557', '#3f474e', '#d6e0f0', '#6b2fbc', '#71491e', '#38ffdd', '#50f039', '#ed54ba'];

export default function ImpostorGamePage() {
    const { roomCode } = useParams<{ roomCode: string }>();
    const navigate = useNavigate();
    const { socket } = useSocket();

    const [gameState, setGameState] = useState<GameState>({
        gameId: '',
        phase: 'WAITING',
        round: 1,
        word: null,
        isImpostor: false,
        players: [],
        currentTurnId: null,
        timeRemaining: 30,
        votes: {},
        clues: [],
        eliminatedPlayer: null,
        winner: null,
    });

    const [myVote, setMyVote] = useState<string | null>(null);
    const [clueInput, setClueInput] = useState('');
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState<{ sender: string; text: string }[]>([]);
    const [showRoleReveal, setShowRoleReveal] = useState(false);
    const [showEliminationReveal, setShowEliminationReveal] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const myPlayer = gameState.players.find(p => socket && p.socketId === socket.id);
    const isMyTurn = gameState.currentTurnId === socket?.id;
    const amAlive = myPlayer?.isAlive !== false;

    // Load initial state from localStorage
    useEffect(() => {
        const savedGame = localStorage.getItem('currentGame');
        if (savedGame) {
            try {
                const data = JSON.parse(savedGame);
                console.log('📂 Loaded from localStorage:', data);
                setGameState(prev => ({
                    ...prev,
                    gameId: data.gameId || '',
                    word: data.word || null,
                    isImpostor: data.isImpostor || data.role === 'IMPOSTOR',
                    players: (data.players || []).map((p: any) => ({
                        id: p.id,
                        socketId: p.socketId,
                        name: p.name,
                        avatarColor: p.avatarColor || '#c51111',
                        isAlive: true,
                    })),
                    phase: 'CLUES',
                }));
                setShowRoleReveal(true);
                setTimeout(() => setShowRoleReveal(false), 5000);
            } catch (e) {
                console.error('Parse error:', e);
            }
        }
    }, []);

    // Socket listeners
    useEffect(() => {
        if (!socket) return;

        console.log('🔌 Socket ready:', socket.id);

        // OLD game events (fallback)
        socket.on('game:your-role' as any, (data: any) => {
            console.log('🎭 game:your-role:', data);
            setGameState(prev => ({
                ...prev,
                isImpostor: data.isImpostor || data.role === 'IMPOSTOR',
                word: data.word,
                gameId: data.gameId,
                players: (data.players || []).map((p: any) => ({
                    id: p.id, socketId: p.socketId, name: p.name,
                    avatarColor: p.avatarColor || '#c51111', isAlive: true,
                })),
            }));
            setShowRoleReveal(true);
            setTimeout(() => { setShowRoleReveal(false); setGameState(p => ({ ...p, phase: 'CLUES' })); }, 5000);
        });

        socket.on('game:clue-received' as any, (data: any) => {
            setGameState(prev => ({ ...prev, clues: [...prev.clues, { playerId: data.playerId, playerName: data.playerName, clue: data.clue }] }));
        });

        socket.on('game:phase-changed' as any, (data: any) => {
            setGameState(prev => ({ ...prev, phase: data.phase, timeRemaining: data.duration || 30 }));
        });

        // NEW impostor events
        socket.on('impostor:state' as any, (state: Partial<GameState>) => {
            console.log('📥 impostor:state:', state);
            setGameState(prev => ({ ...prev, ...state }));
        });

        // Role reveal
        socket.on('impostor:role', (data: { isImpostor: boolean; word: string | null; gameId: string }) => {
            console.log('🎭 Role received:', data);
            setGameState(prev => ({
                ...prev,
                isImpostor: data.isImpostor,
                word: data.word,
                gameId: data.gameId,
            }));
            setShowRoleReveal(true);
            setTimeout(() => {
                setShowRoleReveal(false);
                setGameState(prev => ({ ...prev, phase: 'CLUES' }));
            }, 5000);
        });

        // Clue received
        socket.on('impostor:clue', (data: { playerId: string; playerName: string; clue: string }) => {
            setGameState(prev => ({
                ...prev,
                clues: [...prev.clues, data],
            }));
        });

        // Turn changed
        socket.on('impostor:turn', (data: { currentTurnId: string; timeRemaining: number }) => {
            setGameState(prev => ({
                ...prev,
                currentTurnId: data.currentTurnId,
                timeRemaining: data.timeRemaining,
            }));
        });

        // Phase changed
        socket.on('impostor:phase', (data: { phase: string; timeRemaining: number; round?: number }) => {
            setGameState(prev => ({
                ...prev,
                phase: data.phase as GameState['phase'],
                timeRemaining: data.timeRemaining,
                round: data.round ?? prev.round,
            }));
            if (data.phase === 'VOTING') {
                setMyVote(null);
            }
        });

        // Vote received
        socket.on('impostor:vote', (data: { votes: Record<string, string[]> }) => {
            setGameState(prev => ({ ...prev, votes: data.votes }));
        });

        // Chat message
        socket.on('impostor:chat', (data: { sender: string; text: string }) => {
            setChatMessages(prev => [...prev, data]);
        });

        // Elimination result
        socket.on('impostor:elimination', (data: { player: Player; wasImpostor: boolean; gameOver: boolean; winner?: string }) => {
            setGameState(prev => ({
                ...prev,
                eliminatedPlayer: { ...data.player, isImpostor: data.wasImpostor } as any,
                phase: 'RESULTS',
            }));
            setShowEliminationReveal(true);

            setTimeout(() => {
                setShowEliminationReveal(false);
                if (data.gameOver) {
                    setGameState(prev => ({
                        ...prev,
                        phase: 'GAME_OVER',
                        winner: data.winner as 'IMPOSTOR' | 'CREW',
                    }));
                } else {
                    // Continue to next round
                    setGameState(prev => ({
                        ...prev,
                        phase: 'CLUES',
                        round: prev.round + 1,
                        clues: [],
                        votes: {},
                        eliminatedPlayer: null,
                        players: prev.players.map(p =>
                            p.id === data.player.id ? { ...p, isAlive: false } : p
                        ),
                    }));
                }
            }, 6000);
        });

        // No elimination
        socket.on('impostor:no-elimination', (data: { reason: string }) => {
            setGameState(prev => ({
                ...prev,
                phase: 'RESULTS',
                eliminatedPlayer: null,
            }));
            setTimeout(() => {
                setGameState(prev => ({
                    ...prev,
                    phase: 'CLUES',
                    round: prev.round + 1,
                    clues: [],
                    votes: {},
                }));
            }, 4000);
        });

        return () => {
            socket.off('game:your-role');
            socket.off('game:clue-received');
            socket.off('game:phase-changed');
            socket.off('impostor:state');
            socket.off('impostor:role');
            socket.off('impostor:clue');
            socket.off('impostor:turn');
            socket.off('impostor:phase');
            socket.off('impostor:vote');
            socket.off('impostor:chat');
            socket.off('impostor:elimination');
            socket.off('impostor:no-elimination');
        };
    }, [socket]);

    // Timer countdown
    useEffect(() => {
        if (gameState.phase === 'WAITING' || gameState.phase === 'RESULTS' || gameState.phase === 'GAME_OVER') return;

        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
            setGameState(prev => {
                if (prev.timeRemaining <= 1) {
                    return prev;
                }
                return { ...prev, timeRemaining: prev.timeRemaining - 1 };
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [gameState.phase]);

    // Send clue
    const handleSendClue = () => {
        if (!clueInput.trim() || !isMyTurn || !socket) return;

        socket.emit('impostor:send-clue', {
            roomCode,
            clue: clueInput,
        });

        setClueInput('');
    };

    // Send chat
    const handleSendChat = () => {
        if (!chatInput.trim() || !socket) return;

        socket.emit('impostor:send-chat', {
            roomCode,
            text: chatInput,
        });

        setChatMessages(prev => [...prev, { sender: myPlayer?.name || 'Tú', text: chatInput }]);
        setChatInput('');
    };

    // Vote
    const handleVote = (playerId: string) => {
        if (myVote || !socket || !amAlive) return;

        socket.emit('impostor:vote', {
            roomCode,
            targetId: playerId,
        });

        setMyVote(playerId);
    };

    // Get alive players
    const alivePlayers = gameState.players.filter(p => p.isAlive !== false);
    const currentTurnPlayer = gameState.players.find(p => p.socketId === gameState.currentTurnId);

    // Render Role Reveal
    if (showRoleReveal) {
        return (
            <div className={`${styles.overlay} ${gameState.isImpostor ? styles.impostorBg : styles.crewBg}`}>
                <div className={styles.roleReveal}>
                    <div className={styles.roleIcon}>
                        {gameState.isImpostor ? '👹' : '🛡️'}
                    </div>
                    <h1 className={styles.roleTitle}>
                        {gameState.isImpostor ? 'ERES EL IMPOSTOR' : 'ERES TRIPULANTE'}
                    </h1>
                    {!gameState.isImpostor && gameState.word && (
                        <div className={styles.wordReveal}>
                            <span>La palabra es:</span>
                            <strong>{gameState.word}</strong>
                        </div>
                    )}
                    {gameState.isImpostor && (
                        <p className={styles.roleHint}>No conoces la palabra. ¡Finge!</p>
                    )}
                </div>
            </div>
        );
    }

    // Render Elimination Reveal
    if (showEliminationReveal && gameState.eliminatedPlayer) {
        const eliminated = gameState.eliminatedPlayer;
        const wasImpostor = (eliminated as any).isImpostor;

        return (
            <div className={styles.overlay}>
                <div className={`${styles.eliminationReveal} ${wasImpostor ? styles.wasImpostor : styles.wasInnocent}`}>
                    <div className={styles.eliminatedAvatar} style={{ backgroundColor: eliminated.avatarColor }}>
                        {eliminated.name.charAt(0).toUpperCase()}
                    </div>
                    <h2>{eliminated.name}</h2>
                    <p className={styles.ejectedText}>fue expulsado</p>
                    <div className={styles.revealResult}>
                        {wasImpostor ? (
                            <>
                                <span className={styles.impostorTag}>IMPOSTOR</span>
                                <p>¡Era el impostor!</p>
                            </>
                        ) : (
                            <>
                                <span className={styles.crewTag}>INOCENTE</span>
                                <p>No era el impostor...</p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Render Game Over
    if (gameState.phase === 'GAME_OVER') {
        return (
            <div className={`${styles.overlay} ${gameState.winner === 'IMPOSTOR' ? styles.impostorBg : styles.crewBg}`}>
                <div className={styles.gameOver}>
                    <h1>{gameState.winner === 'IMPOSTOR' ? '👹 IMPOSTOR GANA' : '🛡️ TRIPULACIÓN GANA'}</h1>
                    <p>{gameState.winner === 'IMPOSTOR' ? 'El impostor engañó a todos' : 'Atraparon al impostor'}</p>
                    <button onClick={() => navigate('/menu')} className={styles.menuBtn}>
                        Volver al Menú
                    </button>
                </div>
            </div>
        );
    }

    // Main Game UI
    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.phases}>
                    <span className={gameState.phase === 'CLUES' ? styles.activePhase : ''}>Pistas</span>
                    <span className={gameState.phase === 'DISCUSSION' ? styles.activePhase : ''}>Debate</span>
                    <span className={gameState.phase === 'VOTING' ? styles.activePhase : ''}>Votar</span>
                </div>

                <div className={styles.wordBadge}>
                    {gameState.isImpostor ? (
                        <span className={styles.impostorBadge}>❓ IMPOSTOR</span>
                    ) : (
                        <span className={styles.wordText}>🔒 {gameState.word}</span>
                    )}
                </div>

                <div className={`${styles.timer} ${gameState.timeRemaining <= 10 ? styles.critical : ''}`}>
                    {Math.floor(gameState.timeRemaining / 60)}:{(gameState.timeRemaining % 60).toString().padStart(2, '0')}
                </div>
            </header>

            {/* Turn indicator */}
            {gameState.phase === 'CLUES' && (
                <div className={styles.turnIndicator}>
                    {isMyTurn ? (
                        <span className={styles.yourTurn}>🎤 ES TU TURNO - Da una pista</span>
                    ) : (
                        <span>Esperando a {currentTurnPlayer?.name}...</span>
                    )}
                </div>
            )}

            {/* Main content */}
            <main className={styles.main}>
                {/* Players panel */}
                <aside className={styles.playersPanel}>
                    <h3>JUGADORES <span>R{gameState.round}/5</span></h3>
                    <div className={styles.playersList}>
                        {gameState.players.map(player => (
                            <div
                                key={player.id}
                                className={`${styles.playerCard} ${!player.isAlive ? styles.dead : ''} ${player.socketId === gameState.currentTurnId ? styles.speaking : ''} ${player.socketId === socket?.id ? styles.me : ''}`}
                            >
                                <div className={styles.playerAvatar} style={{ backgroundColor: player.avatarColor }}>
                                    {player.name.charAt(0).toUpperCase()}
                                    {!player.isAlive && <span className={styles.deadIcon}>💀</span>}
                                </div>
                                <span className={styles.playerName}>
                                    {player.name}
                                    {player.socketId === socket?.id && ' (TÚ)'}
                                </span>
                                {player.socketId === gameState.currentTurnId && gameState.phase === 'CLUES' && (
                                    <span className={styles.speakingIcon}>🎤</span>
                                )}
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Center content */}
                <section className={styles.centerPanel}>
                    {/* Clues section */}
                    {(gameState.phase === 'CLUES' || gameState.phase === 'DISCUSSION') && (
                        <div className={styles.cluesSection}>
                            <h3>📝 PISTAS ({gameState.clues.length})</h3>
                            <div className={styles.cluesList}>
                                {gameState.clues.map((clue, i) => (
                                    <div key={i} className={styles.clueItem}>
                                        <strong>{clue.playerName}:</strong> "{clue.clue}"
                                    </div>
                                ))}
                            </div>

                            {gameState.phase === 'CLUES' && isMyTurn && amAlive && (
                                <div className={styles.clueInput}>
                                    <input
                                        type="text"
                                        placeholder="Escribe tu pista..."
                                        value={clueInput}
                                        onChange={(e) => setClueInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendClue()}
                                        maxLength={50}
                                    />
                                    <button onClick={handleSendClue}>Enviar</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Voting section */}
                    {gameState.phase === 'VOTING' && (
                        <div className={styles.votingSection}>
                            <h3>🗳️ VOTACIÓN</h3>
                            <p>Elige a quién expulsar</p>
                            <div className={styles.voteGrid}>
                                {alivePlayers.filter(p => p.socketId !== socket?.id).map(player => (
                                    <button
                                        key={player.id}
                                        className={`${styles.voteCard} ${myVote === player.id ? styles.voted : ''}`}
                                        onClick={() => handleVote(player.id)}
                                        disabled={!!myVote}
                                    >
                                        <div className={styles.voteAvatar} style={{ backgroundColor: player.avatarColor }}>
                                            {player.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span>{player.name}</span>
                                        {gameState.votes[player.id] && (
                                            <span className={styles.voteCount}>{gameState.votes[player.id].length}</span>
                                        )}
                                    </button>
                                ))}
                                <button
                                    className={`${styles.voteCard} ${styles.skipVote} ${myVote === 'skip' ? styles.voted : ''}`}
                                    onClick={() => handleVote('skip')}
                                    disabled={!!myVote}
                                >
                                    <span>⏭️</span>
                                    <span>Saltar</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Results waiting */}
                    {gameState.phase === 'RESULTS' && !showEliminationReveal && (
                        <div className={styles.resultsWaiting}>
                            <div className={styles.spinner}></div>
                            <p>Procesando votos...</p>
                        </div>
                    )}
                </section>

                {/* Chat panel */}
                <aside className={styles.chatPanel}>
                    <h3>💬 DISCUSIÓN</h3>
                    <div className={styles.chatMessages}>
                        {chatMessages.length === 0 ? (
                            <p className={styles.noMessages}>El chat aparecerá aquí</p>
                        ) : (
                            chatMessages.map((msg, i) => (
                                <div key={i} className={styles.chatMessage}>
                                    <strong>{msg.sender}:</strong> {msg.text}
                                </div>
                            ))
                        )}
                    </div>
                    {gameState.phase === 'DISCUSSION' && amAlive && (
                        <div className={styles.chatInput}>
                            <input
                                type="text"
                                placeholder="Escribe para debatir..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                            />
                            <button onClick={handleSendChat}>→</button>
                        </div>
                    )}
                </aside>
            </main>
        </div>
    );
}
