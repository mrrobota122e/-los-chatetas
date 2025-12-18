import { FC, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Target, Trophy, MessageSquare, Send, HelpCircle } from 'lucide-react';
import PlayerCard from '../../components/guessWho/PlayerCard';
import { Player, ALL_PLAYERS } from '../../game-data/players/playerUtils';
import ConfettiCelebration from '../../components/ConfettiCelebration';
import { useSocket } from '../../hooks/useSocket';
import styles from './GuessWhoGamePage.module.css';

type GameMode = 'vsAI' | 'vsPlayer';

export default function GuessWhoGamePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { socket } = useSocket();
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Game Config
    const [gameMode, setGameMode] = useState<GameMode>('vsAI');
    const [roomId, setRoomId] = useState<string>('');
    const [opponentName, setOpponentName] = useState('IA');

    // Game state
    const [mySecretPlayer, setMySecretPlayer] = useState<Player | null>(null);
    const [opponentSecretPlayer, setOpponentSecretPlayer] = useState<Player | null>(null);
    const [myEliminated, setMyEliminated] = useState<string[]>([]);
    const [isMyTurn, setIsMyTurn] = useState(true);
    const [gamePhase, setGamePhase] = useState<'selection' | 'waiting' | 'playing' | 'victory'>('selection');
    const [winner, setWinner] = useState<'me' | 'opponent' | null>(null);

    // Chat
    const [chatHistory, setChatHistory] = useState<{ sender: string, text: string }[]>([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [showConfetti, setShowConfetti] = useState(false);

    // UI
    const [showGuessModal, setShowGuessModal] = useState(false);
    const [selectedGuess, setSelectedGuess] = useState<Player | null>(null);

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

    // Socket Events for multiplayer
    useEffect(() => {
        if (gameMode !== 'vsPlayer' || !socket) return;

        socket.on('guesswho:game-started', (data: { roomId: string, opponentName: string, firstTurn: string }) => {
            setOpponentName(data.opponentName);
            setIsMyTurn(data.firstTurn === socket.id);
            setGamePhase('playing');
        });

        socket.on('guesswho:turn-change', (data: { currentTurn: string }) => {
            setIsMyTurn(data.currentTurn === socket.id);
        });

        socket.on('guesswho:message-received', (data: { sender: string, text: string }) => {
            setChatHistory(prev => [...prev, { sender: data.sender, text: data.text }]);
        });

        socket.on('guesswho:game-ended', (data: { winner: string, opponentSecretPlayer: string }) => {
            const won = data.winner === socket.id;
            setWinner(won ? 'me' : 'opponent');
            setGamePhase('victory');
            if (won) setShowConfetti(true);

            // Show opponent's player
            const oppPlayer = ALL_PLAYERS.find(p => p.id === data.opponentSecretPlayer);
            if (oppPlayer) setOpponentSecretPlayer(oppPlayer);
        });

        return () => {
            socket.off('guesswho:game-started');
            socket.off('guesswho:turn-change');
            socket.off('guesswho:message-received');
            socket.off('guesswho:game-ended');
        };
    }, [gameMode, socket]);

    // Select my player
    const handleSelectPlayer = (player: Player) => {
        if (gamePhase !== 'selection') return;
        setMySecretPlayer(player);

        if (gameMode === 'vsAI') {
            setGamePhase('playing');
        } else {
            setGamePhase('waiting');
            socket?.emit('guesswho:select-player', { roomId, playerId: player.id });
        }
    };

    // Toggle elimination
    const handleToggleEliminate = (playerId: string) => {
        if (gamePhase !== 'playing') return;
        setMyEliminated(prev =>
            prev.includes(playerId)
                ? prev.filter(id => id !== playerId)
                : [...prev, playerId]
        );
    };

    // Send chat message
    const handleSendMessage = () => {
        if (!currentMessage.trim()) return;

        setChatHistory(prev => [...prev, { sender: 'Tú', text: currentMessage }]);

        if (gameMode === 'vsAI') {
            // AI responds with simple yes/no based on random or player attributes
            setTimeout(() => {
                const aiResponses = ['Sí', 'No', 'Tal vez...', 'Hmm, puede ser', '¡Claro!', 'No lo creo'];
                const response = aiResponses[Math.floor(Math.random() * aiResponses.length)];
                setChatHistory(prev => [...prev, { sender: 'IA', text: response }]);
            }, 1000);
        } else {
            socket?.emit('guesswho:send-message', { roomId, text: currentMessage });
        }

        setCurrentMessage('');
    };

    // Make a guess
    const handleMakeGuess = () => {
        if (!selectedGuess) return;

        if (gameMode === 'vsAI') {
            if (selectedGuess.id === opponentSecretPlayer?.id) {
                setWinner('me');
                setShowConfetti(true);
            } else {
                setWinner('opponent');
            }
            setGamePhase('victory');
        } else {
            socket?.emit('guesswho:guess', { roomId, targetPlayerId: selectedGuess.id });
        }

        setShowGuessModal(false);
    };

    // Get non-eliminated players
    const visiblePlayers = ALL_PLAYERS.filter(p => !myEliminated.includes(p.id));

    return (
        <div className={styles.container}>
            {/* Background */}
            <div className={styles.bgGradient} />

            {/* Confetti */}
            {showConfetti && <ConfettiCelebration />}

            {/* Header */}
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate('/guess-who/menu')}>
                    <ArrowLeft size={20} />
                    <span>Salir</span>
                </button>
                <div className={styles.headerTitle}>
                    <Target size={20} />
                    <span>ADIVINA EL JUGADOR</span>
                </div>
            </header>

            {/* Main Content */}
            <main className={styles.main}>
                {/* SELECTION PHASE */}
                {gamePhase === 'selection' && (
                    <motion.div
                        className={styles.selectionPhase}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <h2>🎯 Elige tu jugador secreto</h2>
                        <p>Este será el jugador que tu oponente debe adivinar</p>

                        <div className={styles.playerGrid}>
                            {ALL_PLAYERS.map(player => (
                                <motion.div
                                    key={player.id}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleSelectPlayer(player)}
                                    className={styles.selectablePlayer}
                                >
                                    <PlayerCard player={player} size="small" />
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* WAITING PHASE */}
                {gamePhase === 'waiting' && (
                    <motion.div
                        className={styles.waitingPhase}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <div className={styles.waitingContent}>
                            <div className={styles.spinner} />
                            <h2>Esperando al oponente...</h2>
                            <p>Tu jugador: <strong>{mySecretPlayer?.name}</strong></p>
                        </div>
                    </motion.div>
                )}

                {/* PLAYING PHASE */}
                {gamePhase === 'playing' && (
                    <div className={styles.playingLayout}>
                        {/* Left: Player Board */}
                        <div className={styles.boardSection}>
                            <div className={styles.boardHeader}>
                                <h3>📋 Tablero ({visiblePlayers.length} jugadores)</h3>
                                <p>Click para eliminar/restaurar</p>
                            </div>
                            <div className={styles.playerBoard}>
                                {ALL_PLAYERS.map(player => (
                                    <motion.div
                                        key={player.id}
                                        className={`${styles.boardPlayer} ${myEliminated.includes(player.id) ? styles.eliminated : ''}`}
                                        onClick={() => handleToggleEliminate(player.id)}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <PlayerCard
                                            player={player}
                                            size="tiny"
                                            eliminated={myEliminated.includes(player.id)}
                                        />
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Right: Chat & Actions */}
                        <div className={styles.chatSection}>
                            {/* My secret player */}
                            <div className={styles.myPlayerCard}>
                                <span>Tu jugador secreto:</span>
                                <strong>{mySecretPlayer?.name}</strong>
                            </div>

                            {/* Chat */}
                            <div className={styles.chatContainer}>
                                <div className={styles.chatMessages}>
                                    {chatHistory.length === 0 && (
                                        <div className={styles.chatEmpty}>
                                            <MessageSquare size={32} />
                                            <p>¡Pregunta cosas para adivinar quién es el jugador de tu oponente!</p>
                                        </div>
                                    )}
                                    {chatHistory.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={`${styles.chatMessage} ${msg.sender === 'Tú' ? styles.myMessage : styles.theirMessage}`}
                                        >
                                            <span className={styles.sender}>{msg.sender}</span>
                                            <p>{msg.text}</p>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>

                                <div className={styles.chatInput}>
                                    <input
                                        type="text"
                                        placeholder="Escribe una pregunta..."
                                        value={currentMessage}
                                        onChange={(e) => setCurrentMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    />
                                    <button onClick={handleSendMessage}>
                                        <Send size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Guess Button */}
                            <button
                                className={styles.guessBtn}
                                onClick={() => setShowGuessModal(true)}
                            >
                                🎯 ¡ADIVINAR AHORA!
                            </button>

                            {/* Help */}
                            <div className={styles.helpBox}>
                                <HelpCircle size={16} />
                                <span>Pregunta cosas como: "¿Es delantero?", "¿Juega en España?", "¿Es rubio?"</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* VICTORY PHASE */}
                {gamePhase === 'victory' && (
                    <motion.div
                        className={styles.victoryPhase}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                    >
                        <div className={`${styles.victoryCard} ${winner === 'me' ? styles.won : styles.lost}`}>
                            <div className={styles.victoryIcon}>
                                {winner === 'me' ? '🏆' : '😢'}
                            </div>
                            <h2>{winner === 'me' ? '¡GANASTE!' : '¡PERDISTE!'}</h2>
                            <p>
                                {winner === 'me'
                                    ? '¡Adivinaste correctamente!'
                                    : 'El jugador era: ' + (opponentSecretPlayer?.name || 'desconocido')
                                }
                            </p>

                            {opponentSecretPlayer && (
                                <div className={styles.revealPlayer}>
                                    <PlayerCard player={opponentSecretPlayer} size="medium" />
                                </div>
                            )}

                            <div className={styles.victoryActions}>
                                <button onClick={() => navigate('/guess-who/menu')}>
                                    Volver al Menú
                                </button>
                                <button onClick={() => window.location.reload()}>
                                    Jugar de Nuevo
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </main>

            {/* Guess Modal */}
            <AnimatePresence>
                {showGuessModal && (
                    <motion.div
                        className={styles.modalOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowGuessModal(false)}
                    >
                        <motion.div
                            className={styles.guessModal}
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.8 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2>🎯 ¿Quién es el jugador?</h2>
                            <p>Selecciona al jugador que crees que es</p>

                            <div className={styles.guessGrid}>
                                {visiblePlayers.map(player => (
                                    <motion.div
                                        key={player.id}
                                        className={`${styles.guessOption} ${selectedGuess?.id === player.id ? styles.selected : ''}`}
                                        onClick={() => setSelectedGuess(player)}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <PlayerCard player={player} size="small" />
                                    </motion.div>
                                ))}
                            </div>

                            <div className={styles.modalActions}>
                                <button onClick={() => setShowGuessModal(false)}>Cancelar</button>
                                <button
                                    onClick={handleMakeGuess}
                                    disabled={!selectedGuess}
                                    className={styles.confirmBtn}
                                >
                                    ¡Confirmar!
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
