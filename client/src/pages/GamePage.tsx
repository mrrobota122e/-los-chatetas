import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useAdvancedSound } from '../hooks/useAdvancedSound';
import SoundControls from '../components/SoundControls';
import {
    Vote,
    Skull,
    Crown,
    AlertTriangle,
    Ghost,
    Users
} from 'lucide-react';
import styles from './GamePage.module.css';

// FOOTBALL WORDS - Players and Clubs only
const FOOTBALL_WORDS = [
    // Players
    'Messi', 'Cristiano Ronaldo', 'Neymar', 'Mbappé', 'Haaland', 'Benzema', 'Modric',
    'De Bruyne', 'Salah', 'Lewandowski', 'Vinicius Jr', 'Bellingham', 'Kane', 'Son',
    'Pedri', 'Gavi', 'Casemiro', 'Courtois', 'Alisson', 'Van Dijk', 'Ramos', 'Marcelo',
    'Xavi', 'Iniesta', 'Piqué', 'Busquets', 'Suárez', 'Griezmann', 'Dybala', 'Di María',
    'Maradona', 'Pelé', 'Zidane', 'Ronaldinho', 'Beckham', 'Henry', 'Buffon', 'Neuer',
    // Clubs
    'Real Madrid', 'Barcelona', 'Manchester United', 'Manchester City', 'Liverpool',
    'Chelsea', 'Arsenal', 'Tottenham', 'Bayern Munich', 'Borussia Dortmund', 'PSG',
    'Juventus', 'AC Milan', 'Inter Milan', 'Napoli', 'Roma', 'Atlético Madrid',
    'Sevilla', 'Valencia', 'Athletic Bilbao', 'Real Betis', 'Villarreal',
    'Ajax', 'Porto', 'Benfica', 'River Plate', 'Boca Juniors', 'Flamengo',
    'Santos', 'Palmeiras', 'América', 'Chivas', 'Pumas', 'Cruz Azul',
];

interface Player {
    id: string;
    socketId: string;
    name: string;
    avatarColor: string;
    isImpostor?: boolean;
    status?: 'idle' | 'thinking' | 'speaking' | 'done' | 'eliminated';
    hasSpoken?: boolean;
    votes?: number;
}

interface Message {
    sender: string;
    text: string;
    type: 'clue' | 'chat';
}

type GamePhase = 'INTRO' | 'ROLE_REVEAL' | 'CLUES' | 'DISCUSSION' | 'VOTING' | 'REVEAL' | 'RESULTS';

export default function GamePage() {
    const { gameId } = useParams<{ gameId: string }>();
    const navigate = useNavigate();
    const { socket } = useSocket();
    const cluesRef = useRef<HTMLDivElement>(null);
    const chatRef = useRef<HTMLDivElement>(null);
    const { playSound, playBackgroundMusic, preloadSound } = useAdvancedSound();
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const votesRef = useRef<Record<string, string[]>>({}); // Track votes in real-time
    const settingsRef = useRef({
        turnDuration: 30,
        discussionDuration: 45,
        votingDuration: 30,
        impostorCount: 1,
        anonymousVoting: false,
        confirmEjects: true
    });

    // State
    const [gameWord, setGameWord] = useState<string>('');
    const [activeGameId, setActiveGameId] = useState<string>(''); // Store gameId from server
    const [isImpostor, setIsImpostor] = useState(false);
    const [phase, setPhase] = useState<GamePhase>('INTRO');
    const [round, setRound] = useState(1);
    const [timeRemaining, setTimeRemaining] = useState(60);
    const [roomId, setRoomId] = useState('');
    const [roomCode, setRoomCode] = useState(''); // Added roomCode state
    const [players, setPlayers] = useState<Player[]>([]);
    const [currentTurnIndex, setCurrentTurnIndex] = useState(0);

    const [clues, setClues] = useState<Message[]>([]);
    const [chatMessages, setChatMessages] = useState<Message[]>([]);
    const [clueInput, setClueInput] = useState('');
    const [chatInput, setChatInput] = useState('');

    const [selectedVote, setSelectedVote] = useState('');
    const [hasVoted, setHasVoted] = useState(false);
    const [votes, setVotes] = useState<Record<string, string[]>>({});

    const [showAlert, setShowAlert] = useState(false);
    const [alertText, setAlertText] = useState('');
    const [eliminatedPlayer, setEliminatedPlayer] = useState<Player | null>(null);
    const [showReveal, setShowReveal] = useState(false);
    const [revealPhase, setRevealPhase] = useState<'votes' | 'ejecting' | 'result'>('votes');

    const activePlayers = players.filter(p => p.status !== 'eliminated');
    const currentPlayer = activePlayers[currentTurnIndex % activePlayers.length];
    const isMyTurn = socket && currentPlayer?.socketId === socket.id;
    const myPlayer = players.find(p => socket && p.socketId === socket.id);
    const amEliminated = myPlayer?.status === 'eliminated';

    // Listen for server-side elimination and no-elimination events
    useEffect(() => {
        if (!socket) return;

        socket.on('game:player-eliminated', (data: { playerId: string, playerName: string, wasImpostor: boolean, gameEnded: boolean, winner?: string }) => {
            console.log('Player eliminated:', data);

            // Find player object or create temporary one for display
            const player = players.find(p => p.id === data.playerId) || {
                id: data.playerId,
                name: data.playerName,
                socketId: '',
                avatarColor: '#ff0000', // Default fallback
                isImpostor: data.wasImpostor // CRITICAL: Use server truth
            } as Player;

            // Force update the player object with the server truth about impostor status
            const playerWithRole = { ...player, isImpostor: data.wasImpostor };

            setEliminatedPlayer(playerWithRole);
            startEpicReveal(playerWithRole);
        });

        socket.on('game:no-elimination', (data: { reason: string, message: string }) => {
            console.log('No elimination:', data);
            // Show no elimination reveal and continue to next round
            const wasTie = data.reason === 'TIE';
            showNoEliminationReveal(wasTie);
        });

        socket.on('game:round-started', (data: any) => {
            console.log('Round started event received');
        });

        return () => {
            socket.off('game:player-eliminated');
            socket.off('game:no-elimination');
            socket.off('game:round-started');
        };
    }, [socket, players]);

    // Auto scroll
    useEffect(() => {
        if (cluesRef.current) cluesRef.current.scrollTop = cluesRef.current.scrollHeight;
    }, [clues]);

    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [chatMessages]);

    // CRITICAL FIX: Listen for server events to get CORRECT player IDs
    useEffect(() => {
        if (!socket) return;

        // Listen for game start event with correct player list
        const handleGameStarted = (data: any) => {
            console.log('🎮 v1.0.2 Game started - received players from server:', data.players);
            if (data.gameId) {
                console.log('🆔 v1.0.3 GameId received:', data.gameId);
                setActiveGameId(data.gameId);
            }
            if (data.players && data.players.length > 0) {
                // Use server's player list with CORRECT IDs
                setPlayers(data.players.map((p: Player) => ({
                    ...p,
                    status: 'idle',
                    hasSpoken: false,
                    votes: 0,
                    isImpostor: false
                })));
                console.log('✅ v1.0.2 Players set from game:started:', data.players.length);
            }
        };

        // Listen for role assignment
        const handleYourRole = (data: any) => {
            console.log('🎭 v1.0.2 Received role:', data);
            setIsImpostor(data.isImpostor);
            if (data.gameId) {
                setActiveGameId(data.gameId);
            }
            if (!data.isImpostor && data.word) {
                setGameWord(data.word);
            }
            // Update players with correct IDs if provided
            if (data.players && data.players.length > 0) {
                setPlayers(data.players.map((p: Player) => ({
                    ...p,
                    status: 'idle',
                    hasSpoken: false,
                    votes: 0,
                    isImpostor: false
                })));
                console.log('✅ v1.0.2 Players set from game:your-role:', data.players.length);
            }
        };

        socket.on('game:started', handleGameStarted);
        socket.on('game:your-role', handleYourRole);

        // Listen for clues from other players
        socket.on('game:clue-received', (data: { playerId: string, playerName: string, clue: string }) => {
            console.log('📝 Clue received from', data.playerName, ':', data.clue);

            // Add clue to list (only if not from me)
            if (data.playerId !== socket.id) {
                setClues(prev => [...prev, { sender: data.playerName, text: data.clue, type: 'clue' }]);
            }

            // Mark player as having spoken
            setPlayers(prev => prev.map(p =>
                p.socketId === data.playerId ? { ...p, status: 'done', hasSpoken: true } : p
            ));
        });

        // Listen for chat messages from other players
        socket.on('game:chat-message', (data: { playerId: string, playerName: string, message: string }) => {
            if (data.playerId !== socket.id) {
                setChatMessages(prev => [...prev, { sender: data.playerName, text: data.message, type: 'chat' }]);
            }
        });

        // Listen for turn changes
        socket.on('game:turn-changed', (data: { currentPlayerId: string, currentPlayerName: string, turnNumber: number }) => {
            console.log('🔄 Turn changed to', data.currentPlayerName);

            // Find player index by socketId
            const playerIndex = players.findIndex(p => p.socketId === data.currentPlayerId);
            if (playerIndex >= 0) {
                setCurrentTurnIndex(playerIndex);
            }
        });

        // Listen for next round event
        socket.on('game:next-round', (data: { round: number }) => {
            console.log('🔄 Next round:', data.round);
            setRound(data.round);
            setPhase('CLUES');
            setTimeRemaining(settingsRef.current.turnDuration);
            setCurrentTurnIndex(0);
            setClues([]);
            setChatMessages([]);
            setHasVoted(false);
            setSelectedVote('');
            votesRef.current = {};
            setVotes({});
            setPlayers(prev => prev.map(p =>
                p.status !== 'eliminated' ? { ...p, hasSpoken: false, status: 'idle' } : p
            ));
        });

        return () => {
            socket.off('game:started', handleGameStarted);
            socket.off('game:your-role', handleYourRole);
            socket.off('game:clue-received');
            socket.off('game:chat-message');
            socket.off('game:turn-changed');
            socket.off('game:next-round');
        };
    }, [socket]);

    // Load game data and show intro
    useEffect(() => {
        // Pick random football word
        const randomWord = FOOTBALL_WORDS[Math.floor(Math.random() * FOOTBALL_WORDS.length)];
        setGameWord(randomWord);

        const stored = localStorage.getItem('currentGame');
        if (stored) {
            const data = JSON.parse(stored);
            if (data.roomId) setRoomId(data.roomId);
            if (data.roomCode) setRoomCode(data.roomCode); // Read roomCode

            // Apply settings if available
            if (data.settings) {
                console.log('Applying game settings:', data.settings);
                settingsRef.current = { ...settingsRef.current, ...data.settings };
            }

            // CRITICAL FIX: Restore gameId from localStorage
            if (data.gameId) {
                console.log('🆔 Restored activeGameId from localStorage:', data.gameId);
                setActiveGameId(data.gameId);
            }

            // Randomly decide if player is impostor (20% chance) - TEMPORARY until server sends role
            const playerIsImpostor = Math.random() < 0.2;
            setIsImpostor(playerIsImpostor);

            // IMPORTANT: Players will be set by socket listener when server sends them
            // DON'T use localStorage players as their IDs might be wrong
            if (data.players && data.players.length > 0) { console.log('v1.0.4 Loading players'); } {
                // Only use localStorage if socket not connected (fallback)
                setPlayers(data.players.map((p: Player, i: number) => ({
                    ...p,
                    status: 'idle',
                    hasSpoken: false,
                    votes: 0,
                    isImpostor: false
                })));
            }
            localStorage.removeItem('currentGame');
        }

        // Show intro for 4 seconds, then role reveal
        setTimeout(() => {
            setPhase('ROLE_REVEAL');
            playSound('alert');
        }, 4000);

        // After role reveal, start game WITH background music
        setTimeout(() => {
            setPhase('CLUES');
            setTimeRemaining(settingsRef.current.turnDuration);
            // Start background music
            playBackgroundMusic('gameMusic');
        }, 9000);

        // Preload all game sounds
        ['clue', 'vote', 'alert', 'dramatic', 'countdown', 'whoosh', 'win', 'lose'].forEach(preloadSound);
    }, []);

    // Timer - handles both phase timer and turn timer
    useEffect(() => {
        if (phase === 'INTRO' || phase === 'ROLE_REVEAL' || phase === 'REVEAL') return;

        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    // Handle timeout
                    if (phase === 'CLUES') {
                        // Skip current player's turn
                        handleTurnTimeout();
                    } else {
                        handlePhaseEnd();
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [phase, round, currentTurnIndex]);

    // Handle turn timeout - skip to next player
    const handleTurnTimeout = () => {
        if (currentPlayer && !currentPlayer.hasSpoken) {
            setClues(prev => [...prev, { sender: currentPlayer.name, text: '(Sin respuesta)', type: 'clue' }]);
            setPlayers(prev => prev.map(p => p.id === currentPlayer.id ? { ...p, status: 'done', hasSpoken: true } : p));
        }
        setCurrentTurnIndex(prev => prev + 1);
        setTimeRemaining(settingsRef.current.turnDuration);
    };

    const handlePhaseEnd = () => {
        if (timerRef.current) clearInterval(timerRef.current);

        const settings = settingsRef.current;

        if (phase === 'CLUES') {
            triggerPhaseChange('DISCUSSION', '¡DEBATAN QUIÉN ES EL IMPOSTOR!', settings.discussionDuration);
        } else if (phase === 'DISCUSSION') {
            triggerPhaseChange('VOTING', '¡HORA DE VOTAR!', settings.votingDuration);
        } else if (phase === 'VOTING') {
            processVotingResults();
        }
    };

    // DISABLED: Let server handle ALL vote processing
    // Client should NOT process votes - only display what server sends
    const processVotingResults = () => {
        console.log('⚠️ processVotingResults() DISABLED - server handles this now');
        // Clear the timer
        if (timerRef.current) clearInterval(timerRef.current);

        // Do nothing - wait for server events:
        // - game:player-eliminated
        // - game:no-elimination
    };

    // Epic reveal when no one is eliminated
    const showNoEliminationReveal = (wasTie: boolean) => {
        playSound('alert');
        setShowReveal(true);
        setRevealPhase('votes');
        setEliminatedPlayer(null);

        // Show votes first
        setTimeout(() => {
            setRevealPhase('result');
            setAlertText(wasTie ? '¡EMPATE!' : '¡SIN VOTOS!');
        }, 3000);

        // Then continue to next round
        setTimeout(() => {
            setShowReveal(false);
            nextRound();
        }, 6000);
    };

    const startEpicReveal = (eliminated: Player) => {
        playSound('alert');
        setShowReveal(true);
        setRevealPhase('votes');

        setTimeout(() => {
            setRevealPhase('ejecting');
            playSound('alert');
        }, 3000);

        setTimeout(() => {
            setRevealPhase('result');
            if (eliminated.isImpostor) playSound('win');
            else playSound('lose');
        }, 6000);

        setTimeout(() => {
            setShowReveal(false);
            setEliminatedPlayer(null);

            // Mark player as eliminated
            const newPlayers = players.map(p =>
                p.id === eliminated.id ? { ...p, status: 'eliminated' as const } : p
            );
            setPlayers(newPlayers);

            // Calculate remaining players
            const remainingPlayers = newPlayers.filter(p => p.status !== 'eliminated');
            const remainingImpostors = remainingPlayers.filter(p => p.isImpostor);
            const remainingCrew = remainingPlayers.filter(p => !p.isImpostor);

            console.log('🎮 Game state after elimination:');
            console.log('Remaining players:', remainingPlayers.length);
            console.log('Remaining impostors:', remainingImpostors.length);
            console.log('Remaining crew:', remainingCrew.length);

            if (eliminated.isImpostor) {
                // Crew wins! They caught the impostor
                console.log('🏆 CREW WINS - Impostor caught!');
                navigate('/results', {
                    state: {
                        winner: 'INNOCENTS',
                        impostorName: eliminated.name,
                        word: gameWord,
                        roomCode: roomCode // Pass roomCode
                    }
                });
            } else if (remainingImpostors.length >= remainingCrew.length) {
                // Impostor wins by numbers (equal or more than crew)
                console.log('😈 IMPOSTOR WINS - Outnumbered crew!');
                const impostor = remainingImpostors[0];
                navigate('/results', {
                    state: {
                        winner: 'IMPOSTOR',
                        impostorName: impostor?.name || 'Desconocido',
                        word: gameWord,
                        roomCode: roomCode // Pass roomCode
                    }
                });
            } else {
                // Game continues - go to next round
                console.log('🔄 Game continues to next round');
                nextRound();
            }
        }, 10000);
    };

    const triggerPhaseChange = (newPhase: GamePhase, text: string, duration: number) => {
        playSound('alert');
        setAlertText(text);
        setShowAlert(true);

        setTimeout(() => {
            setShowAlert(false);
            setPhase(newPhase);
            setTimeRemaining(duration);
            if (newPhase === 'VOTING') {
                setHasVoted(false);
                setSelectedVote('');
                votesRef.current = {}; // Reset ref too!
                setVotes({});
            }
        }, 2500);
    };

    const nextRound = () => {
        if (round >= 5) {
            navigate('/results', { state: { winner: 'impostor' } });
            return;
        }

        playSound('alert');
        setAlertText(`¡RONDA ${round + 1}!`);
        setShowAlert(true);

        // Keep same word for all rounds (removed word change)

        setTimeout(() => {
            setShowAlert(false);
            setRound(prev => prev + 1);
            setPhase('CLUES');
            setTimeRemaining(settingsRef.current.turnDuration);
            setCurrentTurnIndex(0);
            setClues([]);
            setChatMessages([]);
            setHasVoted(false);
            setSelectedVote('');
            votesRef.current = {}; // Reset ref too!
            setVotes({});
            setPlayers(prev => prev.map(p =>
                p.status !== 'eliminated' ? { ...p, hasSpoken: false, status: 'idle' } : p
            ));
        }, 2500);
    };

    // Bot auto-clue
    useEffect(() => {
        if (phase !== 'CLUES' || !currentPlayer) return;
        if (currentPlayer.status === 'eliminated') {
            setCurrentTurnIndex(prev => prev + 1);
            return;
        }
        if (currentPlayer.socketId.startsWith('bot_') && !currentPlayer.hasSpoken) {
            const botClues = ["Algo conocido", "Es popular", "Muy famoso", "Lo conocen todos", "De Europa", "Del fútbol"];
            setPlayers(prev => prev.map(p => p.id === currentPlayer.id ? { ...p, status: 'thinking' } : p));
            setTimeout(() => {
                const clue = botClues[Math.floor(Math.random() * botClues.length)];
                setClues(prev => [...prev, { sender: currentPlayer.name, text: clue, type: 'clue' }]);
                setPlayers(prev => prev.map(p => p.id === currentPlayer.id ? { ...p, status: 'done', hasSpoken: true } : p));
                setCurrentTurnIndex(prev => prev + 1);
            }, 1500 + Math.random() * 1000);
        }
    }, [phase, currentPlayer?.id, currentTurnIndex]);

    // Bot auto-vote
    useEffect(() => {
        if (phase !== 'VOTING') return;

        // Track which bots have already voted using ref
        const botsWhoVoted = new Set<string>();
        Object.values(votesRef.current).forEach(voterList => {
            voterList.forEach(voterName => {
                const botPlayer = activePlayers.find(p => p.name === voterName && p.socketId.startsWith('bot_'));
                if (botPlayer) botsWhoVoted.add(botPlayer.id);
            });
        });

        const timeout = setTimeout(() => {
            activePlayers.forEach(player => {
                if (player.socketId.startsWith('bot_') && !botsWhoVoted.has(player.id)) {
                    const targets = activePlayers.filter(p => p.id !== player.id);
                    if (targets.length > 0) {
                        const target = targets[Math.floor(Math.random() * targets.length)];
                        console.log(`🤖 Bot ${player.name} votes for ${target.name}`);

                        // Update both ref and state
                        const newVotes = {
                            ...votesRef.current,
                            [target.id]: [...(votesRef.current[target.id] || []), player.name]
                        };
                        votesRef.current = newVotes;
                        setVotes(newVotes);

                        // CRITICAL: If I am the host, I must send the bot's vote to the server
                        // Check if I am host (myPlayer.isHost)
                        const amHost = myPlayer?.isHost;

                        if (amHost && activeGameId && socket) {
                            console.log(`📤 Sending vote for bot ${player.name} to server`);
                            socket.emit('game:vote', {
                                roomId: roomId,
                                gameId: activeGameId,
                                targetPlayerId: target.id,
                                round: round,
                                voterId: player.id // Send bot's ID as voter
                            });
                        }
                    }
                }
            });
        }, 2000 + Math.random() * 3000);

        return () => clearTimeout(timeout);
    }, [phase]);

    // All spoken -> advance
    useEffect(() => {
        if (phase !== 'CLUES') return;
        const speaking = activePlayers.filter(p => p.status !== 'eliminated');
        if (speaking.length > 0 && speaking.every(p => p.hasSpoken)) {
            setTimeout(() => {
                if (timerRef.current) clearInterval(timerRef.current);
                triggerPhaseChange('DISCUSSION', '¡REUNIÓN DE EMERGENCIA!', 30);
            }, 1500);
        }
    }, [phase, players]);

    const handleSendClue = () => {
        if (!clueInput.trim() || !isMyTurn || amEliminated) return;
        setClues(prev => [...prev, { sender: myPlayer?.name || 'Tú', text: clueInput, type: 'clue' }]);
        setPlayers(prev => prev.map(p => p.socketId === socket!.id ? { ...p, status: 'done', hasSpoken: true } : p));
        setCurrentTurnIndex(prev => prev + 1);
        setClueInput('');
        playSound('clue');

        // Send to server if we have gameId
        if (activeGameId && socket) {
            socket.emit('game:clue', {
                roomId: roomId,
                gameId: activeGameId,
                clue: clueInput,
                round: round
            });
        }
    };

    const handleSendChat = () => {
        if (!chatInput.trim() || amEliminated) return;
        setChatMessages(prev => [...prev, { sender: myPlayer?.name || 'Tú', text: chatInput, type: 'chat' }]);

        // Send to server for sync with other players
        if (socket && roomId) {
            socket.emit('game:chat', {
                roomId: roomId,
                message: chatInput
            });
        }

        setChatInput('');
    };

    const handleVote = (playerId: string) => {
        if (hasVoted || amEliminated || !socket) return;
        setSelectedVote(playerId);
        setHasVoted(true);

        // Update both state and ref
        const voterName = myPlayer?.name || 'Tú';
        const newVotes = {
            ...votesRef.current,
            [playerId]: [...(votesRef.current[playerId] || []), voterName]
        };
        votesRef.current = newVotes;
        setVotes(newVotes);

        // CRITICAL: Send vote to server with CORRECT gameId!
        if (activeGameId) {
            socket.emit('game:vote', {
                roomId: roomId,
                gameId: activeGameId,
                targetPlayerId: playerId,
                round: round
            });
            console.log('Vote sent to server:', { playerId, round, gameId: activeGameId });
        } else {
            console.error('❌ Cannot vote: Missing activeGameId!');
        }

        playSound('vote');
    };

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
    const getVoteCount = (playerId: string) => votes[playerId]?.length || 0;

    // ===== INTRO SCREEN =====
    if (phase === 'INTRO') {
        return (
            <div className={styles.introOverlay}>
                <div className={styles.introContent}>
                    <h1 className={styles.introTitle}>LOS CHATETAS</h1>
                    <h2 className={styles.introSubtitle}>FÚTBOL EDITION</h2>
                    <div className={styles.introRules}>
                        <p><strong>Objetivo:</strong> Descubrir al impostor</p>
                        <p><strong>Pistas:</strong> Da una pista sobre la palabra secreta</p>
                        <p><strong>Debate:</strong> Discute quién es el impostor</p>
                        <p><strong>Votar:</strong> Vota a quien creas que es el impostor</p>
                        <p className={styles.impostorWarning}><strong>Hay {settingsRef.current.impostorCount} impostor{settingsRef.current.impostorCount > 1 ? 'es' : ''}</strong> que NO sabe{settingsRef.current.impostorCount > 1 ? 'n' : ''} la palabra</p>
                    </div>
                    <div className={styles.introLoading}>Cargando partida...</div>
                </div>
            </div>
        );
    }

    // ===== ROLE REVEAL SCREEN =====
    if (phase === 'ROLE_REVEAL') {
        return (
            <div className={`${styles.roleOverlay} ${isImpostor ? styles.impostorReveal : styles.crewReveal}`}>
                <div className={styles.roleContent}>
                    {isImpostor ? (
                        <>
                            <div className={styles.roleIcon}><Ghost size={80} /></div>
                            <h1 className={styles.roleTitle}>ERES EL IMPOSTOR</h1>
                            <p className={styles.roleDesc}>No conoces la palabra secreta</p>
                            <p className={styles.roleDesc}>¡Intenta pasar desapercibido!</p>
                        </>
                    ) : (
                        <>
                            <div className={styles.roleIcon}><Users size={80} /></div>
                            <h1 className={styles.roleTitle}>NO ERES IMPOSTOR</h1>
                            <div className={styles.wordReveal}>
                                <span className={styles.wordLabel}>LA PALABRA ES:</span>
                                <span className={styles.wordValue}>{gameWord}</span>
                            </div>
                            <p className={styles.roleDesc}>Da pistas sin revelar la palabra</p>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // ===== EPIC REVEAL OVERLAY =====
    if (showReveal) {
        // Sort players by vote count for display
        const sortedPlayers = [...activePlayers].sort((a, b) => getVoteCount(b.id) - getVoteCount(a.id));
        const maxVoteCount = Math.max(...activePlayers.map(p => getVoteCount(p.id)), 0);

        return (
            <div className={styles.revealOverlay}>
                {revealPhase === 'votes' && (
                    <div className={styles.revealVotes}>
                        <div className={styles.revealHeader}>
                            <Vote size={48} className={styles.revealIcon} />
                            <h1 className={styles.revealTitle}>RESULTADOS</h1>
                            <p className={styles.revealSubtitle}>Los votos han sido contados...</p>
                        </div>
                        <div className={styles.voteResults}>
                            {sortedPlayers.map((player, index) => {
                                const voteCount = getVoteCount(player.id);
                                const isTopVoted = voteCount === maxVoteCount && voteCount > 0;
                                const percentage = maxVoteCount > 0 ? (voteCount / maxVoteCount) * 100 : 0;

                                return (
                                    <div
                                        key={player.id}
                                        className={`${styles.voteRow} ${isTopVoted ? styles.topVoted : ''}`}
                                        style={{ animationDelay: `${index * 0.15}s` }}
                                    >
                                        <div className={styles.votePlayerInfo}>
                                            <div
                                                className={styles.voteAvatar}
                                                style={{ backgroundColor: player.avatarColor }}
                                            >
                                                {player.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className={styles.voteName}>{player.name}</span>
                                        </div>
                                        <div className={styles.voteBarContainer}>
                                            <div
                                                className={styles.voteBar}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <span className={styles.voteCount}>{voteCount}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {revealPhase === 'ejecting' && eliminatedPlayer && (
                    <div className={styles.revealEjecting}>
                        <div className={styles.ejectGlow} />
                        <div
                            className={styles.ejectAvatar}
                            style={{ backgroundColor: eliminatedPlayer.avatarColor }}
                        >
                            {eliminatedPlayer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.ejectIconContainer}>
                            <Ghost size={64} className={styles.ejectIcon} />
                        </div>
                        <h1 className={styles.ejectName}>{eliminatedPlayer.name}</h1>
                        <p className={styles.ejectText}>FUE EXPULSADO</p>
                    </div>
                )}

                {revealPhase === 'result' && (
                    eliminatedPlayer ? (
                        <div className={`${styles.revealResult} ${eliminatedPlayer.isImpostor ? styles.wasImpostor : styles.wasNotImpostor}`}>
                            <div className={styles.resultGlow} />

                            {eliminatedPlayer.isImpostor ? (
                                <>
                                    <Skull size={80} className={styles.resultIcon} />
                                    <h1 className={styles.resultName}>{eliminatedPlayer.name}</h1>
                                    <div className={styles.impostorStamp}>IMPOSTOR</div>
                                    <h2 className={styles.resultText}>¡ERA EL IMPOSTOR!</h2>
                                    <p className={styles.resultSubtext}>Victoria de la tripulación</p>
                                </>
                            ) : (
                                <>
                                    <Crown size={80} className={styles.resultIcon} />
                                    <h1 className={styles.resultName}>{eliminatedPlayer.name}</h1>
                                    <div className={styles.innocentStamp}>INOCENTE</div>
                                    <h2 className={styles.resultText}>NO ERA EL IMPOSTOR...</h2>
                                    <p className={styles.resultSubtext}>El impostor sigue entre ustedes</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className={styles.revealNoElimination}>
                            <AlertTriangle size={64} className={styles.noEliminationIcon} />
                            <h1 className={styles.noEliminationTitle}>{alertText}</h1>
                            <p className={styles.noEliminationText}>
                                {alertText === '¡EMPATE!'
                                    ? 'Los votos quedaron empatados'
                                    : 'Nadie recibió votos suficientes'}
                            </p>
                            <p className={styles.noEliminationSubtext}>😈 El impostor sigue entre ustedes...</p>
                        </div>
                    )
                )}
            </div>
        );
    }

    // ===== MAIN GAME =====
    return (
        <div className={styles.container}>
            {showAlert && (
                <div className={styles.alertOverlay}>
                    <div className={styles.alertContent}>
                        <div className={styles.alertIcon}>!</div>
                        <h1 className={styles.alertText}>{alertText}</h1>
                    </div>
                </div>
            )}

            {amEliminated && (
                <div className={styles.eliminatedBanner}>
                    👻 Fuiste eliminado - Solo puedes observar
                </div>
            )}

            <header className={styles.header}>
                <div className={styles.phaseInfo}>
                    <span className={`${styles.phaseDot} ${phase === 'CLUES' ? styles.active : ''}`}>Pistas</span>
                    <span className={`${styles.phaseDot} ${phase === 'DISCUSSION' ? styles.active : ''}`}>Debate</span>
                    <span className={`${styles.phaseDot} ${phase === 'VOTING' ? styles.active : ''}`}>Votar</span>
                </div>

                <div className={styles.wordBadge}>
                    {isImpostor ? (
                        <span className={styles.impostor}>❓ IMPOSTOR</span>
                    ) : (
                        <span className={styles.word}>🔒 {gameWord}</span>
                    )}
                </div>

                <div className={`${styles.timer} ${timeRemaining <= 5 ? styles.critical : ''}`}>
                    {formatTime(timeRemaining)}
                </div>
            </header>

            {phase === 'CLUES' && (
                <div className={styles.cluesExplain}>
                    ⏱️ Tienes 30 segundos para dar tu pista
                </div>
            )}

            {phase === 'DISCUSSION' && (
                <div className={styles.debateExplain}>
                    💬 Debatan en el chat quién creen que es el IMPOSTOR
                </div>
            )}

            {phase === 'VOTING' && (
                <div className={styles.votingExplain}>
                    🗳️ Selecciona al jugador que crees que es el IMPOSTOR
                </div>
            )}

            <main className={styles.main}>
                <aside className={styles.playersPanel}>
                    <h3>Jugadores <span>R{round}/5</span></h3>
                    <div className={styles.playersList}>
                        {players.map((player, index) => {
                            const isMe = player.socketId === socket?.id;
                            const isCurrent = currentPlayer?.id === player.id && phase === 'CLUES';
                            const isVoted = selectedVote === player.id;
                            const isElim = player.status === 'eliminated';
                            const voteCount = getVoteCount(player.id);

                            return (
                                <div
                                    key={player.id}
                                    className={`${styles.playerItem} ${isCurrent ? styles.current : ''} ${player.hasSpoken ? styles.spoke : ''} ${isVoted ? styles.voted : ''} ${isElim ? styles.eliminated : ''} ${phase === 'VOTING' && !isMe && !hasVoted && !isElim ? styles.votable : ''}`}
                                    onClick={() => phase === 'VOTING' && !isMe && !hasVoted && !isElim && handleVote(player.id)}
                                    style={{
                                        animation: `slideInLeft 0.4s ease-out ${index * 0.08}s both`,
                                    }}
                                >
                                    <div className={`${styles.avatar} ${isCurrent ? styles.glowingAvatar : ''}`} style={{ backgroundColor: isElim ? '#444' : player.avatarColor }}>
                                        {isElim ? '👻' : player.name.charAt(0)}
                                    </div>
                                    <span className={styles.name}>
                                        {player.name.slice(0, 10)}
                                        {isMe && ' (TÚ)'}
                                    </span>
                                    {player.status === 'thinking' && <span className={styles.dots}>...</span>}
                                    {player.hasSpoken && !isElim && <span className={styles.check}>✓</span>}
                                    {phase === 'VOTING' && voteCount > 0 && (
                                        <span className={styles.voteCount} style={{ animation: 'countUp 0.3s ease-out' }}>{voteCount}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </aside>

                <section className={styles.cluesPanel}>
                    <h3>💬 Pistas ({clues.length})</h3>
                    <div className={styles.messageList} ref={cluesRef}>
                        {clues.length === 0 ? (
                            <div className={styles.empty}>Las pistas aparecerán aquí</div>
                        ) : (
                            clues.map((msg, i) => (
                                <div key={i} className={styles.clueMsg} style={{ animation: 'bounceIn 0.5s ease-out' }}>
                                    <strong>{msg.sender}:</strong> "{msg.text}"
                                </div>
                            ))
                        )}
                    </div>
                    {phase === 'CLUES' && !amEliminated && (
                        <div className={styles.inputArea}>
                            {isMyTurn ? (
                                <div className={styles.myTurn}>
                                    <span>¡TU TURNO!</span>
                                    <div className={styles.inputRow}>
                                        <input value={clueInput} onChange={e => setClueInput(e.target.value)}
                                            onKeyPress={e => e.key === 'Enter' && handleSendClue()}
                                            placeholder="Tu pista..." maxLength={50} />
                                        <button onClick={handleSendClue}>→</button>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.waiting}>Esperando a {currentPlayer?.name}...</div>
                            )}
                        </div>
                    )}
                </section>

                <section className={styles.chatPanel}>
                    <h3>🗣️ Discusión</h3>
                    <div className={styles.messageList} ref={chatRef}>
                        {chatMessages.length === 0 ? (
                            <div className={styles.empty}>El chat aparecerá aquí</div>
                        ) : (
                            chatMessages.map((msg, i) => (
                                <div key={i} className={styles.chatMsg} style={{ animation: 'bounceIn 0.4s ease-out' }}>
                                    <strong>{msg.sender}:</strong> {msg.text}
                                </div>
                            ))
                        )}
                    </div>
                    {!amEliminated && (
                        <div className={styles.inputArea}>
                            <div className={styles.inputRow}>
                                <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                                    onKeyPress={e => e.key === 'Enter' && handleSendChat()}
                                    placeholder="Escribe para debatir..." maxLength={100} />
                                <button onClick={handleSendChat}>→</button>
                            </div>
                        </div>
                    )}
                </section>
            </main>

            {/* Sound Controls */}
            <SoundControls />
        </div>
    );
}

