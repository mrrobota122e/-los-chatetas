import { FC, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, HelpCircle, Target, Trophy, Clock, Users, MessageSquare, Send, Zap, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import PlayerCard from '../../components/guessWho/PlayerCard';
import { Player, ALL_PLAYERS, SMART_QUESTIONS, suggestNextQuestion, evaluateQuestion } from '../../game-data/players/playerUtils';
import ConfettiCelebration from '../../components/ConfettiCelebration';
import { useSocket } from '../../hooks/useSocket';
import styles from './GuessWhoGamePage.module.css';

type GameMode = 'vsAI' | 'vsPlayer';

export default function GuessWhoGamePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { socket } = useSocket();
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Game Config
    const [gameMode, setGameMode] = useState<GameMode>('vsAI');
    const [roomId, setRoomId] = useState<string>('');
    const [opponentName, setOpponentName] = useState('IA');

    // Game state
    const [mySecretPlayer, setMySecretPlayer] = useState<Player | null>(null);
    const [opponentSecretPlayer, setOpponentSecretPlayer] = useState<Player | null>(null);
    const [myEliminated, setMyEliminated] = useState<string[]>([]);
    const [opponentEliminated, setOpponentEliminated] = useState<string[]>([]);
    const [isMyTurn, setIsMyTurn] = useState(true);
    const [gamePhase, setGamePhase] = useState<'selection' | 'waiting' | 'playing' | 'victory'>('selection');
    const [winner, setWinner] = useState<'me' | 'opponent' | null>(null);
    const [revealOpponent, setRevealOpponent] = useState<Player | null>(null);

    // UI state
    const [chatHistory, setChatHistory] = useState<{ sender: string, text: string }[]>([]);
    const [showConfetti, setShowConfetti] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);
    const [isGuessing, setIsGuessing] = useState(false);
    const [selectedGuess, setSelectedGuess] = useState<Player | null>(null);
    const [customQuestion, setCustomQuestion] = useState('');

    // Filter state
    const [filterEra, setFilterEra] = useState<'all' | 'actual' | 'leyenda'>('all');
    const [filterPosition, setFilterPosition] = useState<string>('all');
    const [filterLeague, setFilterLeague] = useState<string>('all');

    // Selection Timer
    const [selectionTimer, setSelectionTimer] = useState(30);

    // Filtered players for selection
    const filteredPlayers = ALL_PLAYERS.filter(p => {
        if (filterEra !== 'all' && (p as any).era !== filterEra) return false;
        if (filterPosition !== 'all' && p.position !== filterPosition) return false;
        if (filterLeague !== 'all' && p.league !== filterLeague) return false;
        return true;
    });

    // Get unique values for filters
    const positions = [...new Set(ALL_PLAYERS.map(p => p.position))];
    const leagues = [...new Set(ALL_PLAYERS.map(p => p.league))];

    // Sound effects using Web Audio API
    const audioContextRef = useRef<AudioContext | null>(null);

    const getAudioContext = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return audioContextRef.current;
    };

    const playFlipSound = () => {
        try {
            const ctx = getAudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
        } catch (e) { /* Audio not supported */ }
    };

    const playVictorySound = () => {
        try {
            const ctx = getAudioContext();
            [523, 659, 784, 1047].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
                gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
                gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.15 + 0.05);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.15 + 0.4);
                osc.start(ctx.currentTime + i * 0.15);
                osc.stop(ctx.currentTime + i * 0.15 + 0.4);
            });
        } catch (e) { }
    };

    const playDefeatSound = () => {
        try {
            const ctx = getAudioContext();
            [392, 370, 349, 330].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.3);
                gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.3);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.3 + 0.25);
                osc.start(ctx.currentTime + i * 0.3);
                osc.stop(ctx.currentTime + i * 0.3 + 0.3);
            });
        } catch (e) { }
    };

    // Init Game
    useEffect(() => {
        const state = location.state as any;
        if (state?.mode) {
            setGameMode(state.mode);
            setRoomId(state.roomId);
            if (state.mode === 'vsPlayer') {
                setOpponentName('Oponente');
                // Socket listeners for multiplayer
                if (socket) {
                    socket.on('guesswho:game-started', (data: { opponentName: string, firstTurn: string }) => {
                        setOpponentName(data.opponentName);
                        setIsMyTurn(data.firstTurn === socket.id);
                        setGamePhase('playing');
                    });

                    socket.on('guesswho:chat-message', (data: { sender: string, text: string }) => {
                        setChatHistory(prev => [...prev, data]);
                    });

                    socket.on('guesswho:turn-change', (data: { currentTurn: string }) => {
                        setIsMyTurn(data.currentTurn === socket.id);
                    });

                    socket.on('guesswho:game-over', (data: { winnerId: string, opponentSecret: Player }) => {
                        setRevealOpponent(data.opponentSecret);
                        endGame(data.winnerId === socket.id ? 'me' : 'opponent');
                    });
                }
            }
        }
    }, [location, socket]);

    // Scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    // Selection Timer
    useEffect(() => {
        if (gamePhase === 'selection') {
            const timer = setInterval(() => {
                setSelectionTimer(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        // Auto-select random if time runs out
                        if (!mySecretPlayer) {
                            const random = filteredPlayers[Math.floor(Math.random() * filteredPlayers.length)];
                            handleSelectMyPlayer(random);
                        }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [gamePhase, mySecretPlayer]);

    const handleSelectMyPlayer = (player: Player) => {
        setMySecretPlayer(player);
        if (gameMode === 'vsAI') {
            // AI selects random player
            const randomOpponent = ALL_PLAYERS[Math.floor(Math.random() * ALL_PLAYERS.length)];
            setOpponentSecretPlayer(randomOpponent);
            setGamePhase('playing');
        } else {
            // Notify server
            socket?.emit('guesswho:select-player', { roomId, playerId: player.id });
            setGamePhase('waiting');
        }
    };

    const handleAskQuestion = (questionText: string) => {
        if (!isMyTurn) return;

        // Add to chat
        setChatHistory(prev => [...prev, { sender: 'Tú', text: questionText }]);

        if (gameMode === 'vsAI') {
            // AI Logic for Quick Questions
            let answer = false;
            if (opponentSecretPlayer) {
                answer = evaluateQuestion({ text: questionText, id: 'custom', category: 'general' }, opponentSecretPlayer);
            }

            setTimeout(() => {
                setChatHistory(prev => [...prev, { sender: 'IA', text: answer ? 'SÍ' : 'NO' }]);
                setIsMyTurn(false);
                setTimeout(() => {
                    // AI Turn
                    const randomQ = SMART_QUESTIONS[Math.floor(Math.random() * SMART_QUESTIONS.length)];
                    setChatHistory(prev => [...prev, { sender: 'IA', text: randomQ.text }]);
                    setIsMyTurn(true);
                }, 2000);
            }, 1000);
        }
    };

    const handleSendCustomQuestion = () => {
        if (customQuestion.trim()) {
            const text = customQuestion;
            setCustomQuestion('');

            // Add to local chat immediately
            setChatHistory(prev => [...prev, { sender: 'Tú', text }]);

            if (gameMode === 'vsAI') {
                // AI Logic (Simplified for free chat)
                setTimeout(() => {
                    // AI just acknowledges for now since it's free chat
                    // In a real AI implementation, it would try to answer
                    // But user requested "Free Chat" style
                }, 1000);
            } else {
                socket?.emit('guesswho:send-chat', { roomId, text });
            }
        }
    };

    const handleConfirmGuess = () => {
        if (!selectedGuess) return;
        setIsGuessing(false);

        if (gameMode === 'vsAI') {
            if (selectedGuess.id === opponentSecretPlayer?.id) endGame('me');
            else {
                setNotification('¡Incorrecto! Sigue intentando.');
                setTimeout(() => setNotification(null), 2000);
            }
        } else {
            socket?.emit('guesswho:guess', { roomId, targetPlayerId: selectedGuess.id });
        }
        setSelectedGuess(null);
    };

    const toggleElimination = (playerId: string) => {
        if (gamePhase !== 'playing') return;
        if (playerId === mySecretPlayer?.id) {
            setNotification('¡No puedes eliminar a tu propio personaje!');
            setTimeout(() => setNotification(null), 2000);
            return;
        }
        if (myEliminated.includes(playerId)) return;

        playFlipSound();
        setMyEliminated(prev => [...prev, playerId]);
    };

    const endGame = (victor: 'me' | 'opponent') => {
        setWinner(victor);
        setGamePhase('victory');
        if (victor === 'me') {
            setShowConfetti(true);
            playVictorySound();
        } else {
            playDefeatSound();
        }
    };

    // Helper to chunk players into rows for 3D layout
    const chunkPlayers = (players: Player[], size: number) => {
        const chunks = [];
        for (let i = 0; i < players.length; i += size) {
            chunks.push(players.slice(i, i + size));
        }
        return chunks;
    };

    const playerRows = chunkPlayers(ALL_PLAYERS, 8); // 3 rows of 8 (24 players)

    // Render Selection Phase
    if (gamePhase === 'selection') {
        return (
            <div className={styles.container} style={{ overflow: 'auto', flexDirection: 'column' }}>
                <div className={styles.bgGradient} />
                <header className={styles.gameHeader} style={{ flexDirection: 'column', gap: '0.5rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button className={styles.backBtn} onClick={() => navigate('/guess-who/menu')}>
                            <ArrowLeft size={20} />
                        </button>
                        <h2 style={{ color: '#fff', margin: 0 }}>SELECCIONA TU PERSONAJE</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: selectionTimer <= 10 ? '#ff4444' : '#00d9ff' }}>
                            <Clock size={20} />
                            <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{selectionTimer}s</span>
                        </div>
                    </div>
                    {/* Timer Bar */}
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${(selectionTimer / 30) * 100}%`,
                            height: '100%',
                            background: selectionTimer <= 10 ? 'linear-gradient(90deg, #ff4444, #ff6666)' : 'linear-gradient(90deg, #00d9ff, #00ff88)',
                            transition: 'width 1s linear'
                        }} />
                    </div>
                    {/* Filters */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
                        <select
                            value={filterEra}
                            onChange={(e) => setFilterEra(e.target.value as any)}
                            style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', background: '#1a1a2e', color: '#fff', border: '1px solid #00d9ff' }}
                        >
                            <option value="all">Todos</option>
                            <option value="actual">Actuales</option>
                            <option value="leyenda">Leyendas</option>
                        </select>
                        <select
                            value={filterPosition}
                            onChange={(e) => setFilterPosition(e.target.value)}
                            style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', background: '#1a1a2e', color: '#fff', border: '1px solid #00d9ff' }}
                        >
                            <option value="all">Posición</option>
                            {positions.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                        </select>
                        <select
                            value={filterLeague}
                            onChange={(e) => setFilterLeague(e.target.value)}
                            style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', background: '#1a1a2e', color: '#fff', border: '1px solid #00d9ff' }}
                        >
                            <option value="all">Liga</option>
                            {leagues.map(lg => <option key={lg} value={lg}>{lg}</option>)}
                        </select>
                        <span style={{ color: '#888', fontSize: '0.8rem', alignSelf: 'center' }}>
                            {filteredPlayers.length} jugadores
                        </span>
                    </div>
                </header>
                <div style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
                    {filteredPlayers.map(player => (
                        <div key={player.id} style={{ width: '130px', height: '180px' }}>
                            <PlayerCard
                                player={player}
                                onClick={() => handleSelectMyPlayer(player)}
                                size="medium"
                            />
                        </div>
                    ))}
                    {filteredPlayers.length === 0 && (
                        <p style={{ color: '#888' }}>No hay jugadores con estos filtros</p>
                    )}
                </div>
            </div>
        );
    }

    if (gamePhase === 'waiting') {
        return (
            <div className={styles.container} style={{ flexDirection: 'column' }}>
                <div className={styles.bgGradient} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#fff' }}>
                    <Clock size={64} className={styles.spinIcon} />
                    <h2>Esperando oponente...</h2>
                    <p>Tu personaje: <strong>{mySecretPlayer?.name}</strong></p>
                </div>
            </div>
        );
    }

    if (gamePhase === 'victory') {
        return (
            <div className={styles.container} style={{ flexDirection: 'column' }}>
                <div className={styles.bgGradient} />
                <ConfettiCelebration trigger={showConfetti} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#fff', zIndex: 10 }}>
                    {winner === 'me' ? (
                        <>
                            <Trophy size={80} color="#ffd700" />
                            <h1 style={{ fontSize: '3rem', margin: '1rem 0' }}>¡VICTORIA!</h1>
                        </>
                    ) : (
                        <>
                            <Target size={80} color="#ff3d71" />
                            <h1 style={{ fontSize: '3rem', margin: '1rem 0' }}>DERROTA</h1>
                        </>
                    )}

                    {(opponentSecretPlayer || revealOpponent) && (
                        <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                            <p>El personaje secreto era:</p>
                            <PlayerCard player={opponentSecretPlayer || revealOpponent!} size="medium" />
                        </div>
                    )}

                    <button
                        onClick={() => navigate('/guess-who/menu')}
                        style={{ marginTop: '2rem', padding: '1rem 2rem', background: '#00d9ff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        Volver al Menú
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.bgGradient} />

            {/* LEFT: 3D GAME WORLD */}
            <div className={styles.gameWorld}>
                <header className={styles.gameHeader}>
                    <button className={styles.backBtn} onClick={() => navigate('/guess-who/menu')}>
                        <ArrowLeft size={20} />
                    </button>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        {mySecretPlayer && (
                            <div className={styles.secretPlayerBadge}>
                                <span>Tú eres:</span>
                                <strong>{mySecretPlayer.name}</strong>
                            </div>
                        )}
                    </div>
                    <div style={{ width: 40 }} /> {/* Spacer */}
                </header>

                {notification && (
                    <div style={{ position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', padding: '1rem 2rem', borderRadius: '20px', color: '#fff', zIndex: 200, border: '1px solid #00d9ff' }}>
                        {notification}
                    </div>
                )}

                <div className={styles.boardContainer}>
                    {/* Opponent Board (Top) */}
                    <div className={styles.opponentBoard}>
                        {ALL_PLAYERS.map(player => (
                            <div
                                key={player.id}
                                className={`${styles.opponentCard} ${opponentEliminated.includes(player.id) ? styles.eliminated : ''}`}
                                title={player.name}
                            />
                        ))}
                    </div>

                    {/* Player Board (Bottom) */}
                    <div className={styles.playerBoard}>
                        {playerRows.map((row, rowIndex) => (
                            <div key={rowIndex} className={styles.boardRow}>
                                {row.map(player => (
                                    <div
                                        key={player.id}
                                        className={`${styles.cardWrapper} ${myEliminated.includes(player.id) ? styles.eliminated : ''}`}
                                        onClick={() => toggleElimination(player.id)}
                                    >
                                        <PlayerCard
                                            player={player}
                                            size="small"
                                            isSelected={player.id === mySecretPlayer?.id}
                                        />
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT: SIDEBAR UI */}
            <div className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <h3><Zap size={18} /> Chat Libre</h3>
                </div>

                <div className={styles.sidebarContent}>
                    {/* Actions Section */}
                    <div className={styles.actionsSection}>
                        <button className={styles.actionBtn} onClick={() => setIsGuessing(true)}>
                            <Target size={18} /> ADIVINAR PERSONAJE
                        </button>

                        {/* Quick Questions ONLY for AI */}
                        {gameMode === 'vsAI' && isMyTurn && (
                            <div className={styles.quickQuestions}>
                                <p style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '0.5rem', marginTop: '1rem' }}>Preguntas Rápidas:</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {SMART_QUESTIONS.slice(0, 4).map(q => (
                                        <button
                                            key={q.id}
                                            className={styles.questionBtn}
                                            onClick={() => handleAskQuestion(q.text)}
                                            style={{
                                                padding: '0.5rem', background: 'rgba(255,255,255,0.1)',
                                                border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px',
                                                color: '#fff', fontSize: '0.8rem', cursor: 'pointer'
                                            }}
                                        >
                                            {q.text}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Chat Section */}
                    <div className={styles.chatSection}>
                        <div className={styles.chatMessages} ref={chatContainerRef}>
                            {chatHistory.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.3 }}>
                                    <MessageSquare size={32} style={{ marginBottom: '0.5rem' }} />
                                    <p>Habla con tu oponente...</p>
                                </div>
                            )}
                            {chatHistory.map((msg, i) => (
                                <div key={i} className={`${styles.chatMsg} ${msg.sender === 'Tú' ? styles.me : ''}`}>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.7, marginBottom: '2px' }}>{msg.sender}</div>
                                    {msg.text}
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                        {/* Custom Question Input */}
                        <div className={styles.chatInputContainer}>
                            <input
                                type="text"
                                className={styles.chatInput}
                                placeholder="Escribe aquí..."
                                value={customQuestion}
                                onChange={(e) => setCustomQuestion(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendCustomQuestion()}
                            />
                            <button
                                className={styles.sendBtn}
                                onClick={handleSendCustomQuestion}
                                disabled={!customQuestion.trim()}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Guessing Modal */}
            <AnimatePresence>
                {isGuessing && (
                    <motion.div
                        className={styles.modalOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className={styles.guessModal} style={{ maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <div className={styles.modalHeader}>
                                <h3>Adivinar Personaje</h3>
                                <button className={styles.closeBtn} onClick={() => setIsGuessing(false)}>✕</button>
                            </div>

                            {!selectedGuess ? (
                                <div className={styles.modalContent} style={{ overflowY: 'auto' }}>
                                    <div className={styles.modalGrid}>
                                        {ALL_PLAYERS.filter(p => !myEliminated.includes(p.id)).map(p => (
                                            <div key={p.id} className={styles.modalCardWrapper} onClick={() => setSelectedGuess(p)}>
                                                <PlayerCard player={p} size="small" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', color: '#fff' }}>
                                    {/* Player Card */}
                                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', padding: '1.5rem', background: 'linear-gradient(135deg, rgba(0, 100, 200, 0.2) 0%, rgba(0, 50, 100, 0.3) 100%)', border: '2px solid rgba(0, 217, 255, 0.3)', borderRadius: '16px', boxShadow: '0 0 30px rgba(0, 217, 255, 0.15)' }}>
                                        {/* Image */}
                                        <div style={{ width: '150px', height: '180px', borderRadius: '12px', overflow: 'hidden', background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)', border: '3px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 8px 25px rgba(0, 0, 0, 0.4)' }}>
                                            <img src={selectedGuess.imageUrl} alt={selectedGuess.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        </div>
                                        {/* Info */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
                                            <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#fff', textShadow: '0 0 20px rgba(0, 217, 255, 0.5)' }}>{selectedGuess.name}</h2>
                                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                <span style={{ padding: '0.3rem 0.8rem', background: 'rgba(255, 255, 255, 0.15)', borderRadius: '20px', fontSize: '0.85rem', color: '#ddd' }}>{selectedGuess.team}</span>
                                                <span style={{ padding: '0.3rem 0.8rem', background: 'rgba(0, 217, 255, 0.2)', border: '1px solid rgba(0, 217, 255, 0.3)', borderRadius: '20px', fontSize: '0.85rem', color: '#00d9ff' }}>{selectedGuess.position}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', color: '#888', fontSize: '0.85rem' }}>
                                                <span>{selectedGuess.nationality}</span>
                                                <span>•</span>
                                                <span>{selectedGuess.league}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Warning Question */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.5rem', background: 'rgba(255, 200, 0, 0.1)', border: '1px solid rgba(255, 200, 0, 0.3)', borderRadius: '12px' }}>
                                        <AlertTriangle size={24} color="#ffd700" />
                                        <p style={{ margin: 0, fontSize: '1.1rem' }}>¿Estás seguro que es <strong style={{ color: '#ffd700' }}>{selectedGuess.name}</strong>?</p>
                                    </div>
                                    {/* Buttons */}
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                        <button onClick={() => setSelectedGuess(null)} style={{ padding: '0.8rem 2rem', background: 'transparent', border: '2px solid #666', borderRadius: '10px', color: '#fff', fontSize: '1rem', cursor: 'pointer' }}>
                                            Cancelar
                                        </button>
                                        <button onClick={handleConfirmGuess} style={{ padding: '0.8rem 2rem', background: 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(255, 0, 0, 0.3)' }}>
                                            ¡ADIVINAR!
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
