import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../hooks/useSocket';
import styles from './ImpostorGamePage.v3.module.css';

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

        // Sync state on join (for late joiners)
        socket.emit('impostor:sync', { roomCode });

        // --- OLD GAME EVENTS (FALLBACK) ---
        socket.on('game:your-role' as any, (data: any) => {
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

        socket.on('game:turn-changed' as any, (data: any) => {
            setGameState(prev => ({
                ...prev,
                currentTurnId: data.currentPlayerId,
            }));
        });

        // --- NEW IMPOSTOR EVENTS ---
        socket.on('impostor:state' as any, (state: Partial<GameState>) => {
            setGameState(prev => ({ ...prev, ...state }));
        });

        socket.on('impostor:role' as any, (data: { isImpostor: boolean; word: string | null; gameId: string }) => {
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

        socket.on('impostor:clue' as any, (data: { playerId: string; playerName: string; clue: string }) => {
            setGameState(prev => ({
                ...prev,
                clues: [...prev.clues, data],
            }));
        });

        socket.on('impostor:turn' as any, (data: { currentTurnId: string; timeRemaining: number }) => {
            setGameState(prev => ({
                ...prev,
                currentTurnId: data.currentTurnId,
                timeRemaining: data.timeRemaining,
            }));
        });

        socket.on('impostor:phase' as any, (data: { phase: string; timeRemaining: number; round?: number }) => {
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

        socket.on('impostor:vote' as any, (data: { votes: Record<string, string[]> }) => {
            setGameState(prev => ({ ...prev, votes: data.votes }));
        });

        socket.on('impostor:chat' as any, (data: { sender: string; text: string }) => {
            setChatMessages(prev => [...prev, data]);
        });

        socket.on('impostor:elimination' as any, (data: { player: Player; wasImpostor: boolean; gameOver: boolean; winner?: string }) => {
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

        socket.on('impostor:no-elimination' as any, (data: { reason: string }) => {
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
            socket.off('game:turn-changed');
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
                if (prev.timeRemaining <= 1) return prev;
                return { ...prev, timeRemaining: prev.timeRemaining - 1 };
            });
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [gameState.phase]);

    // Actions
    const handleSendClue = () => {
        if (!clueInput.trim() || !isMyTurn || !socket) return;
        socket.emit('impostor:send-clue', { roomCode, clue: clueInput });
        socket.emit('game:send-clue', { clue: clueInput });
        setClueInput('');
    };

    const handleSendChat = () => {
        if (!chatInput.trim() || !socket) return;
        socket.emit('impostor:send-chat', { roomCode, text: chatInput });
        socket.emit('game:send-chat', { message: chatInput });
        setChatMessages(prev => [...prev, { sender: myPlayer?.name || 'Tú', text: chatInput }]);
        setChatInput('');
    };

    const handleVote = (playerId: string) => {
        if (myVote || !socket || !amAlive) return;
        socket.emit('impostor:vote', { roomCode, targetId: playerId });
        socket.emit('game:vote', { votedPlayerId: playerId });
        setMyVote(playerId);
    };

    // Helper for circular positioning
    const getPlayerPosition = (index: number, total: number) => {
        const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
        const radius = 220;
        return {
            left: `calc(50% + ${Math.cos(angle) * radius}px - 50px)`,
            top: `calc(50% + ${Math.sin(angle) * radius}px - 50px)`,
        };
    };

    // Render Role Reveal
    if (showRoleReveal) {
        return (
            <div className={styles.overlay}>
                <div className={styles.roleCard}>
                    <div className={styles.roleIcon}>{gameState.isImpostor ? '👹' : '🛡️'}</div>
                    <h1 className={`${styles.roleTitle} ${gameState.isImpostor ? styles.impostorText : styles.crewText}`}>
                        {gameState.isImpostor ? 'IMPOSTOR' : 'TRIPULANTE'}
                    </h1>
                    {!gameState.isImpostor && gameState.word && (
                        <div style={{ fontSize: '2rem', marginTop: '20px', color: '#fff' }}>
                            Palabra: <strong style={{ color: '#4facfe' }}>{gameState.word}</strong>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Main Game UI
    return (
        <div className={styles.container}>
            <div className={styles.bgOverlay} />

            {/* Header */}
            <header className={styles.header}>
                <div className={styles.phases}>
                    <div className={`${styles.phase} ${gameState.phase === 'CLUES' ? styles.activePhase : ''}`}>PISTAS</div>
                    <div className={`${styles.phase} ${gameState.phase === 'DISCUSSION' ? styles.activePhase : ''}`}>DEBATE</div>
                    <div className={`${styles.phase} ${gameState.phase === 'VOTING' ? styles.activePhase : ''}`}>VOTAR</div>
                </div>
                <div className={`${styles.timer} ${gameState.timeRemaining <= 10 ? styles.critical : ''}`}>
                    {Math.floor(gameState.timeRemaining / 60)}:{(gameState.timeRemaining % 60).toString().padStart(2, '0')}
                </div>
            </header>

            {/* Left Panel: Clues */}
            <div className={`${styles.sidePanel} ${styles.leftPanel}`}>
                <div className={styles.panelHeader}>📝 PISTAS ({gameState.clues.length})</div>
                <div className={styles.panelContent}>
                    {gameState.clues.map((clue, i) => (
                        <div key={i} className={styles.message}>
                            <strong>{clue.playerName}</strong> {clue.clue}
                        </div>
                    ))}
                </div>
                {gameState.phase === 'CLUES' && isMyTurn && amAlive && (
                    <div className={styles.inputArea}>
                        <input
                            className={styles.input}
                            value={clueInput}
                            onChange={e => setClueInput(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleSendClue()}
                            placeholder="Escribe tu pista..."
                            autoFocus
                        />
                        <button className={styles.sendBtn} onClick={handleSendClue}>➤</button>
                    </div>
                )}
            </div>

            {/* Center: Meeting Table */}
            <main className={styles.main}>
                <div className={styles.tableContainer}>
                    <div className={styles.table}>
                        <button className={styles.emergencyBtn}>
                            <span>🚨</span>
                            <p>EMERGENCY</p>
                        </button>
                    </div>

                    {/* Players */}
                    {gameState.players.map((player, i) => (
                        <div
                            key={player.id}
                            className={`${styles.playerSlot} ${player.socketId === gameState.currentTurnId ? styles.speaking : ''} ${!player.isAlive ? styles.dead : ''}`}
                            style={getPlayerPosition(i, gameState.players.length)}
                        >
                            <div className={styles.avatar3D} style={{ backgroundColor: player.avatarColor }}>
                                {player.name.charAt(0).toUpperCase()}
                                {!player.isAlive && <span className={styles.deadIcon}>💀</span>}
                            </div>
                            <div className={styles.playerName}>
                                {player.name} {player.socketId === socket?.id && '(TÚ)'}
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Right Panel: Chat/Voting */}
            <div className={`${styles.sidePanel} ${styles.rightPanel}`}>
                {gameState.phase === 'VOTING' ? (
                    <>
                        <div className={styles.panelHeader}>🗳️ VOTACIÓN</div>
                        <div className={styles.panelContent}>
                            <div className={styles.votingGrid}>
                                {gameState.players.filter(p => p.isAlive && p.socketId !== socket?.id).map(player => (
                                    <button
                                        key={player.id}
                                        className={`${styles.voteBtn} ${myVote === player.id ? styles.selected : ''}`}
                                        onClick={() => handleVote(player.id)}
                                        disabled={!!myVote}
                                        style={{
                                            padding: '1rem',
                                            background: 'rgba(255,255,255,0.1)',
                                            border: myVote === player.id ? '2px solid #00d9ff' : '1px solid rgba(255,255,255,0.2)',
                                            borderRadius: '8px',
                                            color: '#fff',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: player.avatarColor }}></div>
                                        {player.name}
                                    </button>
                                ))}
                                <button
                                    onClick={() => handleVote('skip')}
                                    disabled={!!myVote}
                                    style={{
                                        padding: '1rem',
                                        background: 'rgba(255,255,255,0.1)',
                                        border: myVote === 'skip' ? '2px solid #888' : '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '8px',
                                        color: '#aaa',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ⏭️ Saltar Voto
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className={styles.panelHeader}>💬 CHAT</div>
                        <div className={styles.panelContent}>
                            {chatMessages.map((msg, i) => (
                                <div key={i} className={styles.message}>
                                    <strong>{msg.sender}</strong> {msg.text}
                                </div>
                            ))}
                        </div>
                        {gameState.phase === 'DISCUSSION' && amAlive && (
                            <div className={styles.inputArea}>
                                <input
                                    className={styles.input}
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    onKeyPress={e => e.key === 'Enter' && handleSendChat()}
                                    placeholder="Debatir..."
                                />
                                <button className={styles.sendBtn} onClick={handleSendChat}>➤</button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
