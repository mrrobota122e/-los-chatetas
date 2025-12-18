import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../hooks/useSocket';
import styles from './ImpostorGamePage.amongus.module.css';

interface Player {
    id: string;
    socketId: string;
    name: string;
    avatarColor: string;
    isAlive: boolean;
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
    clues: { playerId: string; playerName: string; clue: string }[];
    winner: 'IMPOSTOR' | 'CREW' | null;
}

const PLAYER_COLORS = [
    '#c51111', // Red
    '#132ed1', // Blue  
    '#117f2d', // Green
    '#ed54ba', // Pink
    '#ef7d0d', // Orange
    '#f5f557', // Yellow
    '#3f474e', // Black
    '#d6e0f0', // White
];

export default function ImpostorGamePage() {
    const { roomCode } = useParams();
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
        clues: [],
        winner: null,
    });

    const [myVote, setMyVote] = useState<string | null>(null);
    const [clueInput, setClueInput] = useState('');
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState<{ sender: string; text: string }[]>([]);
    const [showRoleReveal, setShowRoleReveal] = useState(false);

    const myPlayer = gameState.players.find(p => socket && p.socketId === socket.id);
    const isMyTurn = gameState.currentTurnId === socket?.id;
    const amAlive = myPlayer?.isAlive !== false;

    // Load initial state
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
                    players: (data.players || []).map((p: any, idx: number) => ({
                        id: p.id,
                        socketId: p.socketId,
                        name: p.name,
                        avatarColor: PLAYER_COLORS[idx % PLAYER_COLORS.length],
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

        socket.emit('impostor:sync', { roomCode });

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
            if (data.phase === 'VOTING') setMyVote(null);
        });

        socket.on('impostor:chat' as any, (data: { sender: string; text: string }) => {
            setChatMessages(prev => [...prev, data]);
        });

        return () => {
            socket.off('impostor:state');
            socket.off('impostor:role');
            socket.off('impostor:clue');
            socket.off('impostor:turn');
            socket.off('impostor:phase');
            socket.off('impostor:chat');
        };
    }, [socket, roomCode]);

    // Timer
    useEffect(() => {
        if (gameState.phase === 'WAITING' || gameState.phase === 'RESULTS') return;
        const timer = setInterval(() => {
            setGameState(prev => {
                if (prev.timeRemaining <= 1) return prev;
                return { ...prev, timeRemaining: prev.timeRemaining - 1 };
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState.phase]);

    // Actions
    const handleSendClue = () => {
        if (!clueInput.trim() || !isMyTurn || !socket) return;
        socket.emit('impostor:send-clue', { roomCode, clue: clueInput });
        setClueInput('');
    };

    const handleSendChat = () => {
        if (!chatInput.trim() || !socket) return;
        socket.emit('impostor:send-chat', { roomCode, text: chatInput });
        setChatMessages(prev => [...prev, { sender: myPlayer?.name || 'Tú', text: chatInput }]);
        setChatInput('');
    };

    const handleVote = (playerId: string) => {
        if (myVote || !socket || !amAlive) return;
        socket.emit('impostor:vote', { roomCode, targetId: playerId });
        setMyVote(playerId);
    };

    // Role Reveal
    if (showRoleReveal) {
        return (
            <div className={styles.overlay}>
                <div className={styles.roleCard}>
                    <div className={styles.roleIcon}>{gameState.isImpostor ? '👹' : '🛡️'}</div>
                    <h1 className={`${styles.roleTitle} ${gameState.isImpostor ? styles.impostor : styles.crew}`}>
                        {gameState.isImpostor ? 'IMPOSTOR' : 'TRIPULANTE'}
                    </h1>
                    {!gameState.isImpostor && gameState.word && (
                        <div style={{ fontSize: '1.5rem', marginTop: '20px', color: '#c9d1d9' }}>
                            Palabra: <strong style={{ color: '#58a6ff' }}>{gameState.word}</strong>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.background} />

            {/* Header */}
            <div className={styles.header}>
                <div className={styles.phases}>
                    <div className={`${styles.phase} ${gameState.phase === 'CLUES' ? styles.phaseActive : ''}`}>PISTAS</div>
                    <div className={`${styles.phase} ${gameState.phase === 'DISCUSSION' ? styles.phaseActive : ''}`}>DEBATE</div>
                    <div className={`${styles.phase} ${gameState.phase === 'VOTING' ? styles.phaseActive : ''}`}>VOTAR</div>
                </div>
                <div className={`${styles.timer} ${gameState.timeRemaining <= 10 ? styles.warning : ''}`}>
                    {Math.floor(gameState.timeRemaining / 60)}:{(gameState.timeRemaining % 60).toString().padStart(2, '0')}
                </div>
            </div>

            {/* Left Panel: Clues */}
            <div className={styles.panel}>
                <div className={styles.panelHeader}>
                    📝 PISTAS ({gameState.clues.length})
                </div>
                <div className={styles.panelContent}>
                    {gameState.clues.map((clue, i) => (
                        <div key={i} className={styles.message}>
                            <strong>{clue.playerName}</strong>
                            {clue.clue}
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

            {/* Meeting Room */}
            <div className={styles.main}>
                <div className={styles.meetingRoom}>
                    <div className={styles.table}>
                        <button className={styles.emergencyBtn}>
                            <span>🚨</span>
                            EMERGENCY
                        </button>
                    </div>

                    {/* Players as Among Us beans */}
                    {gameState.players.map((player, i) => (
                        <div
                            key={player.id}
                            className={`${styles.character} ${styles[`char${i}`]} ${player.socketId === gameState.currentTurnId ? styles.speaking : ''
                                } ${!player.isAlive ? styles.dead : ''}`}
                        >
                            <div className={styles.bean}>
                                <div className={styles.beanBody} style={{ '--player-color': player.avatarColor } as any}>
                                    <div className={styles.beanVisor} />
                                    <div className={styles.beanPack} />
                                </div>
                            </div>
                            <div className={styles.characterName}>
                                {player.name} {player.socketId === socket?.id && '(TÚ)'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel: Chat/Voting */}
            <div className={styles.panel}>
                {gameState.phase === 'VOTING' ? (
                    <>
                        <div className={styles.panelHeader}>🗳️ VOTACIÓN</div>
                        <div className={styles.panelContent}>
                            {gameState.players.filter(p => p.isAlive && p.socketId !== socket?.id).map(player => (
                                <button
                                    key={player.id}
                                    onClick={() => handleVote(player.id)}
                                    disabled={!!myVote}
                                    style={{
                                        padding: '0.75rem',
                                        background: myVote === player.id ? '#238636' : 'rgba(255,255,255,0.05)',
                                        border: `1px solid ${myVote === player.id ? '#238636' : 'rgba(255,255,255,0.1)'}`,
                                        borderRadius: '4px',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: player.avatarColor }} />
                                    {player.name}
                                </button>
                            ))}
                            <button
                                onClick={() => handleVote('skip')}
                                disabled={!!myVote}
                                style={{
                                    padding: '0.75rem',
                                    background: myVote === 'skip' ? '#6e7681' : 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '4px',
                                    color: '#c9d1d9',
                                    cursor: 'pointer'
                                }}
                            >
                                ⏭️ Saltar Voto
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className={styles.panelHeader}>💬 CHAT</div>
                        <div className={styles.panelContent}>
                            {chatMessages.map((msg, i) => (
                                <div key={i} className={styles.message}>
                                    <strong>{msg.sender}</strong>
                                    {msg.text}
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
