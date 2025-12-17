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
    const [chatHistory, setChatHistory] = useState<{ sender: string, text: string, answer?: 'yes' | 'no' }[]>([]);
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
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.4);
                osc.start(ctx.currentTime + i * 0.15);
                osc.stop(ctx.currentTime + i * 0.15 + 0.4);
            });
        } catch (e) { /* Audio not supported */ }
    };

    const playDefeatSound = () => {
        try {
            const ctx = getAudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
        } catch (e) { /* Audio not supported */ }
    };

    const playClickSound = () => {
        try {
            const ctx = getAudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.setValueAtTime(800, ctx.currentTime + 0.05);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.08);
        } catch (e) { /* Audio not supported */ }
    };

    // Scroll to bottom of chat
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory]);

    // Initialize game
    useEffect(() => {
        if (location.state) {
            if (location.state.mode) setGameMode(location.state.mode);
            if (location.state.roomId) setRoomId(location.state.roomId);
        }
    }, [location]);

    // Initialize AI Game
    useEffect(() => {
        if (gameMode === 'vsAI') {
            const aiPlayer = ALL_PLAYERS[Math.floor(Math.random() * ALL_PLAYERS.length)];
            setOpponentSecretPlayer(aiPlayer);
            setOpponentName('IA');
        }
    }, [gameMode]);

    // Selection Timer Countdown
    useEffect(() => {
        if (gamePhase !== 'selection') return;
        if (selectionTimer <= 0) {
            // Auto-select random player when timer runs out
            const randomPlayer = filteredPlayers[Math.floor(Math.random() * filteredPlayers.length)];
            if (randomPlayer && !mySecretPlayer) {
                handleSelectMyPlayer(randomPlayer);
            }
            return;
        }
        const interval = setInterval(() => {
            setSelectionTimer(prev => prev - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [gamePhase, selectionTimer, filteredPlayers, mySecretPlayer]);

    // Socket Events
    useEffect(() => {
        if (gameMode !== 'vsPlayer' || !socket) return;

        socket.on('guesswho:game-started', (data: { roomId: string, opponentName: string, firstTurn: string }) => {
            setOpponentName(data.opponentName);
            setIsMyTurn(data.firstTurn === socket.id);
            setGamePhase('playing');
            setNotification(`¡Juego iniciado contra ${data.opponentName}!`);
            setTimeout(() => setNotification(null), 3000);
        });

        socket.on('guesswho:turn-change', (data: { currentTurn: string }) => {
            setIsMyTurn(data.currentTurn === socket.id);
        });

        socket.on('guesswho:question-received', (data: { question: string }) => {
            setChatHistory(prev => [...prev, { sender: opponentName, text: data.question }]);

            // Auto-answer logic
            if (mySecretPlayer) {
                const qObj = SMART_QUESTIONS.find(q => q.text === data.question);
                let answer: boolean = false;
                if (qObj) answer = evaluateQuestion(qObj, mySecretPlayer);

                socket.emit('guesswho:answer', { roomId, answer: answer ? 'yes' : 'no' });

                setChatHistory(prev => {
                    const last = prev[prev.length - 1];
                    if (last.text === data.question) {
                        return [...prev.slice(0, -1), { ...last, answer: answer ? 'yes' : 'no' }];
                    }
                    return prev;
                });
            }
        });

        socket.on('guesswho:answer-received', (data: { answer: 'yes' | 'no' }) => {
            setChatHistory(prev => {
                const last = [...prev].reverse().find(m => m.sender === 'Tú' && !m.answer);
                if (last) {
                    return prev.map(m => m === last ? { ...m, answer: data.answer } : m);
                }
                return prev;
            });
        });

        socket.on('guesswho:game-ended', (data: { winner: string, opponentSecretPlayer?: string }) => {
            if (data.opponentSecretPlayer) {
                const p = ALL_PLAYERS.find(pl => pl.id === data.opponentSecretPlayer);
                setRevealOpponent(p || null);
            }
            if (data.winner === socket.id) endGame('me');
            else endGame('opponent');
        });

        socket.on('guesswho:opponent-guessed', (data: { correct: boolean, targetPlayerId: string }) => {
            const target = ALL_PLAYERS.find(p => p.id === data.targetPlayerId);
            setNotification(`${opponentName} adivinó: ${target?.name} - ${data.correct ? '¡Correcto!' : 'Incorrecto'}`);
            setTimeout(() => setNotification(null), 3000);
        });

        return () => {
            socket.off('guesswho:game-started');
            socket.off('guesswho:turn-change');
            socket.off('guesswho:question-received');
            socket.off('guesswho:answer-received');
            socket.off('guesswho:game-ended');
            socket.off('guesswho:opponent-guessed');
        };
    }, [gameMode, socket, roomId, opponentName, mySecretPlayer]);

    // Game Logic Functions
    const handleSelectMyPlayer = (player: Player) => {
        if (gamePhase === 'selection') {
            setMySecretPlayer(player);
            if (gameMode === 'vsAI') setGamePhase('playing');
            else {
                setGamePhase('waiting');
                socket?.emit('guesswho:select-player', { roomId, playerId: player.id });
            }
        }
    };

    const handleAskQuestion = (questionText: string) => {
        if (!isMyTurn || !questionText.trim()) return;

        playClickSound();
        setChatHistory(prev => [...prev, { sender: 'Tú', text: questionText }]);

        if (gameMode === 'vsAI') {
            if (!opponentSecretPlayer) return;

            // Check if it's a predefined smart question
            const smartQ = SMART_QUESTIONS.find(q => q.text === questionText);
            let answer: boolean;

            if (smartQ) {
                answer = evaluateQuestion(smartQ, opponentSecretPlayer);
            } else {
                // AI tries to answer custom questions based on keywords
                const q = questionText.toLowerCase();
                const player = opponentSecretPlayer;

                if (q.includes('delantero') || q.includes('forward')) answer = player.position === 'Delantero';
                else if (q.includes('portero') || q.includes('goalkeeper')) answer = player.position === 'Portero';
                else if (q.includes('defensa') || q.includes('defender')) answer = player.position === 'Defensa';
                else if (q.includes('mediocampista') || q.includes('midfielder')) answer = player.position === 'Mediocampista';
                else if (q.includes('españa') || q.includes('spain') || q.includes('laliga')) answer = player.league === 'La Liga';
                else if (q.includes('premier') || q.includes('england') || q.includes('inglaterra')) answer = player.league === 'Premier League';
                else if (q.includes('europa') || q.includes('europe')) answer = ['La Liga', 'Premier League', 'Serie A', 'Bundesliga', 'Ligue 1'].includes(player.league);
                else if (q.includes('rubio') || q.includes('blond')) answer = Math.random() > 0.5; // Can't determine hair color
                else if (q.includes('alto') || q.includes('tall')) answer = Math.random() > 0.5;
                else if (q.includes('argentina')) answer = player.nationality === 'Argentina';
                else if (q.includes('portugal')) answer = player.nationality === 'Portugal';
                else if (q.includes('brasil') || q.includes('brazil')) answer = player.nationality === 'Brazil';
                else if (q.includes('francia') || q.includes('france')) answer = player.nationality === 'France';
                else if (q.includes('leyenda') || q.includes('legend') || q.includes('retir')) answer = (player as any).era === 'leyenda';
                else answer = Math.random() > 0.5; // Random answer for unknown questions
            }

            setChatHistory(prev => {
                const newHist = [...prev];
                newHist[newHist.length - 1].answer = answer ? 'yes' : 'no';
                return newHist;
            });

            setIsMyTurn(false);
            setTimeout(() => aiTurn(), 2000);
        } else {
            socket?.emit('guesswho:ask-question', { roomId, question: questionText });
            setIsMyTurn(false);
        }
    };

    const handleSendCustomQuestion = () => {
        if (customQuestion.trim() && isMyTurn) {
            handleAskQuestion(customQuestion);
            setCustomQuestion('');
        }
    };

    const aiTurn = () => {
        if (!mySecretPlayer) return;
        const remainingPlayers = ALL_PLAYERS.filter(p => !opponentEliminated.includes(p.id));
        const suggestedQ = suggestNextQuestion(remainingPlayers);

        if (suggestedQ) {
            const answer = evaluateQuestion(suggestedQ, mySecretPlayer);
            setChatHistory(prev => [...prev, { sender: 'IA', text: suggestedQ.text, answer: answer ? 'yes' : 'no' }]);

            setTimeout(() => {
                const toEliminate = ALL_PLAYERS
                    .filter(p => !opponentEliminated.includes(p.id))
                    .filter(p => evaluateQuestion(suggestedQ, p) !== answer)
                    .map(p => p.id);
                setOpponentEliminated(prev => [...prev, ...toEliminate]);

                const aiRemaining = ALL_PLAYERS.filter(p => !opponentEliminated.includes(p.id) && !toEliminate.includes(p.id));
                if (aiRemaining.length === 1 && aiRemaining[0].id === mySecretPlayer.id) endGame('opponent');
                else setIsMyTurn(true);
            }, 1500);
        } else {
            const aiGuess = remainingPlayers[0];
            if (aiGuess?.id === mySecretPlayer.id) endGame('opponent');
            else setIsMyTurn(true);
        }
    };

    const handleConfirmGuess = () => {
        if (!selectedGuess) return;
        setIsGuessing(false);

        if (gameMode === 'vsAI') {
            if (selectedGuess.id === opponentSecretPlayer?.id) endGame('me');
            else {
                setNotification('¡Incorrecto! Pierdes un turno.');
                setTimeout(() => setNotification(null), 2000);
                setIsMyTurn(false);
                setTimeout(() => aiTurn(), 1500);
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
        // Only add to eliminated - no toggle back
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
                        <div className={styles.turnBadge} data-active={isMyTurn}>
                            {isMyTurn ? 'TU TURNO' : `TURNO DE ${opponentName.toUpperCase()}`}
                        </div>
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
                    <h3><Zap size={18} /> Panel de Control</h3>
                </div>

                <div className={styles.sidebarContent}>
                    {/* Actions Section */}
                    <div className={styles.actionsSection}>
                        {isMyTurn ? (
                            <>
                                <button className={styles.actionBtn} onClick={() => setIsGuessing(true)}>
                                    <Target size={18} /> ADIVINAR PERSONAJE
                                </button>
                                <p style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '0.5rem' }}>Preguntas Rápidas:</p>
                                <div className={styles.quickQuestions}>
                                    {SMART_QUESTIONS.slice(0, 4).map(q => (
                                        <button
                                            key={q.id}
                                            className={styles.questionBtn}
                                            onClick={() => handleAskQuestion(q.text)}
                                        >
                                            {q.text}
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '1rem', color: '#aaa' }}>
                                <Clock size={32} className={styles.spinIcon} style={{ marginBottom: '0.5rem' }} />
                                <p>Esperando a {opponentName}...</p>
                            </div>
                        )}
                    </div>

                    {/* Chat Section */}
                    <div className={styles.chatSection}>
                        <div className={styles.chatMessages} ref={chatContainerRef}>
                            {chatHistory.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.3 }}>
                                    <MessageSquare size={32} style={{ marginBottom: '0.5rem' }} />
                                    <p>Historial del juego</p>
                                </div>
                            )}
                            {chatHistory.map((msg, i) => (
                                <div key={i} className={`${styles.chatMsg} ${msg.sender === 'Tú' ? styles.me : ''}`}>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.7, marginBottom: '2px' }}>{msg.sender}</div>
                                    {msg.text}
                                    {msg.answer && (
                                        <div style={{ marginTop: '0.2rem', fontWeight: 'bold', color: msg.answer === 'yes' ? '#00e676' : '#ff3d71', textTransform: 'uppercase', fontSize: '0.8rem' }}>
                                            {msg.answer === 'yes' ? 'SÍ' : 'NO'}
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                        {/* Custom Question Input */}
                        {isMyTurn && (
                            <div className={styles.chatInputContainer}>
                                <input
                                    type="text"
                                    className={styles.chatInput}
                                    placeholder="Escribe tu pregunta..."
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
                        )}
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
