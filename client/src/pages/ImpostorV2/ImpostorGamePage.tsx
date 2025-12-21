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

// Among Us Sound Effects (free sources)
const SOUNDS = {
    meeting: 'https://www.myinstants.com/media/sounds/among-us-emergency-meeting.mp3',
    vote: 'https://www.myinstants.com/media/sounds/among-us-voting-time.mp3',
    eject: 'https://www.myinstants.com/media/sounds/among-us-eject.mp3',
    win: 'https://www.myinstants.com/media/sounds/among-us-victory.mp3',
    lose: 'https://www.myinstants.com/media/sounds/among-us-defeat.mp3',
    start: 'https://www.myinstants.com/media/sounds/among-us-role-reveal.mp3',
    kill: 'https://www.myinstants.com/media/sounds/among-us-kill.mp3'
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

    // Load game settings from lobby
    const [gameSettings] = useState(() => {
        const saved = localStorage.getItem('gameSettings');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) { }
        }
        return { impostorCount: 1, clueTime: 12, discussionTime: 30, votingTime: 20 };
    });

    // ADMIN MODE
    const [isAdmin, setIsAdmin] = useState(false);
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [adminIP] = useState(''); // Will be detected

    // Check for admin mode on mount
    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const res = await fetch('https://api.ipify.org?format=json');
                const data = await res.json();
                const userIP = data.ip;
                // Admin IPs - add your IP here
                const ADMIN_IPS = ['YOUR_IP_HERE', '127.0.0.1', 'localhost'];
                // Also check localStorage for admin key
                const adminKey = localStorage.getItem('adminKey');
                if (ADMIN_IPS.includes(userIP) || adminKey === 'AARON_ADMIN_2024') {
                    setIsAdmin(true);
                }
            } catch (e) {
                // Check localStorage fallback
                const adminKey = localStorage.getItem('adminKey');
                if (adminKey === 'AARON_ADMIN_2024') {
                    setIsAdmin(true);
                }
            }
        };
        checkAdmin();
    }, []);


    // Sound synthesizer using Web Audio API (no CORS issues)
    const playSound = (soundName: string) => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            // Different sounds based on event
            switch (soundName) {
                case 'meeting':
                    // Emergency meeting alarm - rapid beeps
                    oscillator.type = 'square';
                    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
                    oscillator.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);
                    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime + 0.2);
                    oscillator.frequency.setValueAtTime(600, audioCtx.currentTime + 0.3);
                    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
                    oscillator.start();
                    oscillator.stop(audioCtx.currentTime + 0.4);
                    break;
                case 'start':
                    // Role reveal - dramatic ascending sound
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.2);
                    oscillator.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.4);
                    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
                    oscillator.start();
                    oscillator.stop(audioCtx.currentTime + 0.5);
                    break;
                case 'vote':
                    // Voting time - descending tone
                    oscillator.type = 'triangle';
                    oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.3);
                    gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                    oscillator.start();
                    oscillator.stop(audioCtx.currentTime + 0.3);
                    break;
                case 'eject':
                    // Ejection - whoosh sound
                    oscillator.type = 'sawtooth';
                    oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 1);
                    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);
                    oscillator.start();
                    oscillator.stop(audioCtx.currentTime + 1);
                    break;
                case 'win':
                    // Victory fanfare - ascending tones
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
                    oscillator.frequency.setValueAtTime(500, audioCtx.currentTime + 0.15);
                    oscillator.frequency.setValueAtTime(600, audioCtx.currentTime + 0.3);
                    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime + 0.45);
                    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
                    oscillator.start();
                    oscillator.stop(audioCtx.currentTime + 0.6);
                    break;
                case 'lose':
                    // Defeat - descending sad tones
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
                    oscillator.frequency.setValueAtTime(300, audioCtx.currentTime + 0.2);
                    oscillator.frequency.setValueAtTime(200, audioCtx.currentTime + 0.4);
                    gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
                    oscillator.start();
                    oscillator.stop(audioCtx.currentTime + 0.5);
                    break;
                default:
                    // Default click sound
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
                    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                    oscillator.start();
                    oscillator.stop(audioCtx.currentTime + 0.1);
            }
        } catch (e) { console.log('Sound error:', e); }
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
                playSound('start'); // Role reveal sound
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
                    setTimer(gameSettings.clueTime);
                    setMaxTimer(gameSettings.clueTime);
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
                    setTimer(gameSettings.clueTime);
                    simulateBotClueIfNeeded(nextIdx);
                } else {
                    playSound('meeting');
                    setShowEmergency(true);
                    setTimeout(() => {
                        setShowEmergency(false);
                        setPhase('DISCUSSION');
                        setTimer(gameSettings.discussionTime);
                        setMaxTimer(gameSettings.discussionTime);
                        addSystemMessage('💬 ¡DISCUSIÓN ABIERTA!');
                    }, 2000);
                }
                break;

            case 'DISCUSSION':
                playSound('vote');
                setPhase('VOTING');
                setTimer(gameSettings.votingTime);
                setMaxTimer(gameSettings.votingTime);
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

            {/* ADMIN PANEL */}
            {isAdmin && (
                <div style={{
                    position: 'fixed',
                    top: '10px',
                    right: '10px',
                    zIndex: 9999,
                    fontFamily: 'monospace'
                }}>
                    <button
                        onClick={() => setShowAdminPanel(!showAdminPanel)}
                        style={{
                            padding: '8px 16px',
                            background: showAdminPanel ? '#ff4444' : '#4444ff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.4)'
                        }}
                    >
                        👑 ADMIN {showAdminPanel ? '▲' : '▼'}
                    </button>

                    {showAdminPanel && (
                        <div style={{
                            marginTop: '8px',
                            padding: '15px',
                            background: 'rgba(0,0,0,0.95)',
                            borderRadius: '12px',
                            border: '2px solid #4444ff',
                            minWidth: '280px',
                            maxHeight: '400px',
                            overflowY: 'auto'
                        }}>
                            <h3 style={{ color: '#4444ff', margin: '0 0 12px', fontSize: '14px' }}>🛠️ PANEL ADMIN</h3>

                            {/* Game Info */}
                            <div style={{ marginBottom: '12px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                <div style={{ color: '#00ff88', fontSize: '11px', marginBottom: '4px' }}>🔐 PALABRA SECRETA:</div>
                                <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>{secretWord}</div>
                            </div>

                            {/* Impostor */}
                            <div style={{ marginBottom: '12px', padding: '10px', background: 'rgba(255,50,50,0.15)', borderRadius: '8px', border: '1px solid rgba(255,50,50,0.3)' }}>
                                <div style={{ color: '#ff5555', fontSize: '11px', marginBottom: '4px' }}>🔪 IMPOSTOR:</div>
                                <div style={{ color: '#ff5555', fontSize: '16px', fontWeight: 'bold' }}>
                                    {players.find(p => p.isImpostor)?.name || '-'}
                                </div>
                            </div>

                            {/* Phase & Round */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                <div style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', textAlign: 'center' }}>
                                    <div style={{ color: '#888', fontSize: '9px' }}>FASE</div>
                                    <div style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>{phase}</div>
                                </div>
                                <div style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', textAlign: 'center' }}>
                                    <div style={{ color: '#888', fontSize: '9px' }}>RONDA</div>
                                    <div style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>{round}</div>
                                </div>
                                <div style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', textAlign: 'center' }}>
                                    <div style={{ color: '#888', fontSize: '9px' }}>TIEMPO</div>
                                    <div style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>{timer}s</div>
                                </div>
                            </div>

                            {/* Players List */}
                            <div style={{ marginBottom: '12px' }}>
                                <div style={{ color: '#888', fontSize: '10px', marginBottom: '6px' }}>👥 JUGADORES ({players.filter(p => p.isAlive).length}/{players.length} vivos):</div>
                                {players.map(p => (
                                    <div key={p.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '6px 8px',
                                        marginBottom: '4px',
                                        background: p.isImpostor ? 'rgba(255,50,50,0.2)' : 'rgba(255,255,255,0.03)',
                                        borderRadius: '6px',
                                        opacity: p.isAlive ? 1 : 0.4
                                    }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: p.color }} />
                                        <span style={{ color: 'white', fontSize: '11px', flex: 1 }}>
                                            {p.name} {p.isImpostor ? '🔪' : ''} {p.isBot ? '🤖' : ''} {!p.isAlive ? '💀' : ''}
                                        </span>
                                        <span style={{ color: '#888', fontSize: '10px' }}>{p.votes} votos</span>
                                    </div>
                                ))}
                            </div>

                            {/* Admin Actions */}
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                                <div style={{ color: '#888', fontSize: '10px', marginBottom: '6px' }}>⚡ ACCIONES:</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    <button onClick={() => setTimer(5)} style={{ padding: '6px 10px', background: '#333', border: 'none', borderRadius: '4px', color: 'white', fontSize: '10px', cursor: 'pointer' }}>
                                        ⏱️ +5s
                                    </button>
                                    <button onClick={() => setPhase('VOTING')} style={{ padding: '6px 10px', background: '#333', border: 'none', borderRadius: '4px', color: 'white', fontSize: '10px', cursor: 'pointer' }}>
                                        🗳️ Votar
                                    </button>
                                    <button onClick={() => setPhase('GAME_END')} style={{ padding: '6px 10px', background: '#333', border: 'none', borderRadius: '4px', color: 'white', fontSize: '10px', cursor: 'pointer' }}>
                                        🏁 Fin
                                    </button>
                                    <button onClick={() => { setWinner('CREW'); setPhase('GAME_END'); }} style={{ padding: '6px 10px', background: '#2222aa', border: 'none', borderRadius: '4px', color: 'white', fontSize: '10px', cursor: 'pointer' }}>
                                        👥 Crew Gana
                                    </button>
                                    <button onClick={() => { setWinner('IMPOSTOR'); setPhase('GAME_END'); }} style={{ padding: '6px 10px', background: '#aa2222', border: 'none', borderRadius: '4px', color: 'white', fontSize: '10px', cursor: 'pointer' }}>
                                        🔪 Imp. Gana
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
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
                    <div className={isImpostor ? styles.impostorRevealScreen : styles.crewRevealScreen}>
                        {/* Title - Word for crew, IMPOSTOR for impostor */}
                        <h1 className={isImpostor ? styles.impostorBigTitle : styles.crewBigTitle}>
                            {isImpostor ? 'Impostor' : secretWord}
                        </h1>

                        {/* Subtitle */}
                        <p className={styles.revealSubtitle}>
                            {isImpostor
                                ? 'Sabotea y elimina a la tripulación'
                                : `Hay ${gameSettings.impostorCount} impostor${gameSettings.impostorCount > 1 ? 'es' : ''} entre nosotros`}
                        </p>

                        {/* Row of beans - like Among Us */}
                        <div className={styles.beansRow}>
                            {players.map((p, i) => (
                                <div
                                    key={i}
                                    className={styles.miniBean}
                                    style={{ '--bean-color': p.color, '--delay': `${i * 0.08}s` } as any}
                                >
                                    <div className={styles.miniBeanBody} />
                                    <div className={styles.miniBeanVisor} />
                                </div>
                            ))}
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
                        {/* Big title like Among Us */}
                        <h1 className={winner === 'CREW' ? styles.victoryTitle : styles.defeatTitle}>
                            {winner === 'CREW' ? 'Victoria' : 'Derrota'}
                        </h1>

                        {/* Row of beans at center */}
                        <div className={styles.endBeansRow}>
                            {players.map((p, i) => (
                                <div
                                    key={i}
                                    className={`${styles.endBean} ${!p.isAlive ? styles.deadBean : ''} ${p.isImpostor ? styles.impostorBean : ''}`}
                                    style={{ '--bean-color': p.color, '--delay': `${i * 0.1}s` } as any}
                                >
                                    <div className={styles.endBeanBody} />
                                    <div className={styles.endBeanVisor} />
                                </div>
                            ))}
                        </div>

                        {/* Bottom buttons - QUIT left, PLAY AGAIN right */}
                        <div className={styles.endButtonsBar}>
                            <button onClick={() => navigate('/impostor-v2/menu')} className={styles.quitBtn}>
                                <span className={styles.btnIcon}>✕</span>
                                <span>SALIR</span>
                            </button>
                            <button onClick={() => initializeGame()} className={styles.playAgainBtn}>
                                <span className={styles.btnIcon}>↻</span>
                                <span>DE NUEVO</span>
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
