import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, Trophy, Star, Play, Globe, Target, Sparkles, Gamepad2 } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import styles from './GuessWhoMenuPage.module.css';

export default function GuessWhoMenuPage() {
    const navigate = useNavigate();
    const { socket, isConnected } = useSocket();
    const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');

    const playerName = localStorage.getItem('globalPlayerName') || '';
    const [roomCode, setRoomCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCreateRoom = () => {
        if (!playerName.trim()) {
            setError('¡Vuelve al menú y escribe tu nombre!');
            return;
        }
        if (!socket) return;

        setIsLoading(true);
        setError('');

        socket.emit('room:create', {
            hostName: playerName,
            maxPlayers: 2,
            mode: 'GUESS_WHO'
        });

        const handleRoomCreated = (data: any) => {
            navigate(`/guess-who/lobby/${data.roomCode}`);
            socket.off('room:created', handleRoomCreated);
        };

        socket.on('room:created', handleRoomCreated);

        setTimeout(() => setIsLoading(false), 3000);
    };

    const handleJoinRoom = () => {
        if (!playerName.trim()) {
            setError('¡Vuelve al menú y escribe tu nombre!');
            return;
        }
        if (!roomCode.trim()) {
            setError('Ingresa el código de sala');
            return;
        }
        if (!socket) return;

        setIsLoading(true);
        setError('');

        socket.emit('room:join', {
            roomCode: roomCode.toUpperCase(),
            playerName
        });

        const handleRoomJoined = () => {
            navigate(`/guess-who/lobby/${roomCode.toUpperCase()}`);
            socket.off('room:joined', handleRoomJoined);
        };

        const handleRoomError = (err: any) => {
            setError(err.message);
            setIsLoading(false);
            socket.off('room:error', handleRoomError);
        };

        socket.on('room:joined', handleRoomJoined);
        socket.on('room:error', handleRoomError);
    };

    const handlePlayVsAI = () => {
        if (!playerName.trim()) {
            setError('¡Vuelve al menú y escribe tu nombre!');
            return;
        }
        navigate('/guess-who/game', { state: { mode: 'vsAI', playerName } });
    };

    return (
        <div className={styles.container}>
            {/* Background Effects */}
            <div className={styles.bgGradient} />
            <div className={styles.bgGrid} />

            {/* Floating Particles */}
            <div className={styles.particles}>
                {[...Array(6)].map((_, i) => (
                    <div key={i} className={styles.particle} style={{
                        left: `${15 + i * 15}%`,
                        animationDelay: `${i * 0.5}s`,
                        animationDuration: `${4 + i}s`
                    }} />
                ))}
            </div>

            {/* Header */}
            <header className={styles.header}>
                <motion.button
                    className={styles.backBtn}
                    onClick={() => navigate('/menu')}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <ArrowLeft size={20} />
                    <span>Menú</span>
                </motion.button>

                <div className={`${styles.status} ${isConnected ? styles.online : ''}`}>
                    <div className={styles.statusDot} />
                    {isConnected ? 'Online' : 'Conectando...'}
                </div>
            </header>

            {/* Main */}
            <main className={styles.main}>
                {/* Hero */}
                <motion.div
                    className={styles.hero}
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className={styles.heroIcon}>
                        <Target size={48} />
                        <Sparkles className={styles.sparkle} size={20} />
                    </div>
                    <h1 className={styles.title}>ADIVINA EL JUGADOR</h1>
                    <p className={styles.subtitle}>Duelo de deducción 1 vs 1 ⚽</p>

                    {playerName && (
                        <div className={styles.playerTag}>
                            <Gamepad2 size={16} />
                            <span>Jugando como <strong>{playerName}</strong></span>
                        </div>
                    )}
                </motion.div>

                {/* Mode Selection */}
                <AnimatePresence mode="wait">
                    {mode === 'select' && (
                        <motion.div
                            className={styles.modeSelect}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                        >
                            {/* Create Room */}
                            <motion.button
                                className={styles.modeCard}
                                onClick={() => setMode('create')}
                                whileHover={{ scale: 1.02, y: -5 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className={styles.modeIcon}>
                                    <Globe size={32} />
                                </div>
                                <div className={styles.modeInfo}>
                                    <h3>CREAR SALA</h3>
                                    <p>Invita a un amigo</p>
                                </div>
                                <div className={styles.modeBadge}>
                                    <Trophy size={12} /> Online
                                </div>
                            </motion.button>

                            {/* Join Room */}
                            <motion.button
                                className={`${styles.modeCard} ${styles.modeJoin}`}
                                onClick={() => setMode('join')}
                                whileHover={{ scale: 1.02, y: -5 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className={styles.modeIconJoin}>
                                    <Users size={32} />
                                </div>
                                <div className={styles.modeInfo}>
                                    <h3>UNIRSE</h3>
                                    <p>Ingresa un código</p>
                                </div>
                            </motion.button>

                            {/* VS AI */}
                            <motion.button
                                className={`${styles.modeCard} ${styles.modeAI}`}
                                onClick={handlePlayVsAI}
                                whileHover={{ scale: 1.02, y: -5 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className={styles.modeIconAI}>
                                    <Star size={32} />
                                </div>
                                <div className={styles.modeInfo}>
                                    <h3>VS COMPUTADORA</h3>
                                    <p>Entrena contra la IA</p>
                                </div>
                                <div className={styles.modeBadgeAI}>Offline</div>
                            </motion.button>
                        </motion.div>
                    )}

                    {mode === 'create' && (
                        <motion.div
                            className={styles.formPanel}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <div className={styles.formHeader}>
                                <button className={styles.formBack} onClick={() => { setMode('select'); setError(''); }}>
                                    <ArrowLeft size={18} />
                                </button>
                                <h2>Crear Nueva Sala</h2>
                            </div>

                            <div className={styles.formContent}>
                                <div className={styles.infoBox}>
                                    <Globe size={20} />
                                    <div>
                                        <h4>Partida 1 vs 1</h4>
                                        <p>Se creará una sala para 2 jugadores. Comparte el código con tu amigo.</p>
                                    </div>
                                </div>

                                {error && <div className={styles.error}>{error}</div>}

                                <button
                                    className={styles.submitBtn}
                                    onClick={handleCreateRoom}
                                    disabled={isLoading || !isConnected}
                                >
                                    {isLoading ? '⏳ Creando...' : '🎮 CREAR SALA'}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {mode === 'join' && (
                        <motion.div
                            className={styles.formPanel}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <div className={styles.formHeader}>
                                <button className={styles.formBack} onClick={() => { setMode('select'); setError(''); }}>
                                    <ArrowLeft size={18} />
                                </button>
                                <h2>Unirse a Sala</h2>
                            </div>

                            <div className={styles.formContent}>
                                <div className={styles.formGroup}>
                                    <label>🎟️ Código de Sala</label>
                                    <input
                                        type="text"
                                        className={styles.codeInput}
                                        value={roomCode}
                                        onChange={e => setRoomCode(e.target.value.toUpperCase())}
                                        placeholder="XXXXXX"
                                        maxLength={6}
                                    />
                                </div>

                                {error && <div className={styles.error}>{error}</div>}

                                <button
                                    className={styles.submitBtnJoin}
                                    onClick={handleJoinRoom}
                                    disabled={isLoading || !isConnected || !roomCode.trim()}
                                >
                                    {isLoading ? '⏳ Uniendo...' : '🚀 UNIRSE'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Footer */}
            <footer className={styles.footer}>
                © 2025 AARON STUD10S
            </footer>
        </div>
    );
}
