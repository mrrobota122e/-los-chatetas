import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { ArrowLeft, Users, Shield, Clock, Settings, Plus, LogIn, Sparkles, Gamepad2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ImpostorMenuPage.module.css';

export default function ImpostorMenuPage() {
    const navigate = useNavigate();
    const { isConnected, createRoom, joinRoom } = useSocket();
    const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');

    const playerName = localStorage.getItem('globalPlayerName') || '';

    const [roomCode, setRoomCode] = useState('');
    const [maxPlayers, setMaxPlayers] = useState(8);
    const [botMode, setBotMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    const [settings, setSettings] = useState({
        turnDuration: 30,
        discussionDuration: 60,
        votingDuration: 30,
        impostorCount: 1,
        anonymousVoting: false,
        confirmEjects: true,
        wordCategory: 'football'
    });

    const ADMIN_NAME = 'AARONLAMARAVILLA';

    const handleCreateRoom = async () => {
        if (!playerName.trim()) {
            setError('¡Escribe tu nombre primero!');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const room = await createRoom(playerName, maxPlayers, 'NORMAL', botMode, settings);
            localStorage.setItem('currentRoom', JSON.stringify({
                roomId: room.roomId,
                roomCode: room.roomCode,
                hostId: room.hostId,
                playerName,
                isHost: true,
                maxPlayers,
                settings
            }));
            navigate(`/lobby/${room.roomCode}`);
        } catch (err: any) {
            setError(err.message || 'Error al crear sala');
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinRoom = async () => {
        if (!playerName.trim()) {
            setError('¡Vuelve al menú y escribe tu nombre!');
            return;
        }
        if (!roomCode.trim()) {
            setError('Ingresa el código de sala');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await joinRoom(roomCode.toUpperCase(), playerName);
            navigate(`/lobby/${roomCode.toUpperCase()}`);
        } catch (err: any) {
            setError(err.message || 'Error al unirse');
        } finally {
            setIsLoading(false);
        }
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
                        <Shield size={48} />
                        <Sparkles className={styles.sparkle} size={20} />
                    </div>
                    <h1 className={styles.title}>EL IMPOSTOR</h1>
                    <p className={styles.subtitle}>¿Quién no conoce la palabra secreta?</p>

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
                            <motion.button
                                className={styles.modeCard}
                                onClick={() => setMode('create')}
                                whileHover={{ scale: 1.02, y: -5 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className={styles.modeIcon}>
                                    <Plus size={32} />
                                </div>
                                <div className={styles.modeInfo}>
                                    <h3>CREAR SALA</h3>
                                    <p>Inicia una nueva partida</p>
                                </div>
                            </motion.button>

                            <motion.button
                                className={`${styles.modeCard} ${styles.modeJoin}`}
                                onClick={() => setMode('join')}
                                whileHover={{ scale: 1.02, y: -5 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className={styles.modeIconJoin}>
                                    <LogIn size={32} />
                                </div>
                                <div className={styles.modeInfo}>
                                    <h3>UNIRSE</h3>
                                    <p>Ingresa un código</p>
                                </div>
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
                                <button className={styles.formBack} onClick={() => setMode('select')}>
                                    <ArrowLeft size={18} />
                                </button>
                                <h2>Crear Nueva Sala</h2>
                            </div>

                            <div className={styles.formContent}>
                                {/* Players */}
                                <div className={styles.formGroup}>
                                    <label><Users size={16} /> Jugadores</label>
                                    <div className={styles.playerBtns}>
                                        {[6, 8, 10, 12].map(n => (
                                            <button
                                                key={n}
                                                className={`${styles.playerBtn} ${maxPlayers === n ? styles.selected : ''}`}
                                                onClick={() => setMaxPlayers(n)}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Bots */}
                                <label className={styles.toggle}>
                                    <input type="checkbox" checked={botMode} onChange={e => setBotMode(e.target.checked)} />
                                    <div className={styles.toggleTrack}>
                                        <div className={styles.toggleThumb} />
                                    </div>
                                    <span>🤖 Llenar con bots</span>
                                </label>

                                {/* Advanced */}
                                <button className={styles.advancedBtn} onClick={() => setShowAdvanced(!showAdvanced)}>
                                    <Settings size={16} />
                                    Configuración Avanzada
                                    <span className={styles.chevron}>{showAdvanced ? '▲' : '▼'}</span>
                                </button>

                                {showAdvanced && (
                                    <motion.div
                                        className={styles.advancedPanel}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                    >
                                        <div className={styles.settingRow}>
                                            <label><Clock size={14} /> Turno</label>
                                            <select value={settings.turnDuration} onChange={e => setSettings({ ...settings, turnDuration: +e.target.value })}>
                                                <option value={15}>15s</option>
                                                <option value={30}>30s</option>
                                                <option value={45}>45s</option>
                                                <option value={60}>60s</option>
                                            </select>
                                        </div>
                                        <div className={styles.settingRow}>
                                            <label>💬 Discusión</label>
                                            <select value={settings.discussionDuration} onChange={e => setSettings({ ...settings, discussionDuration: +e.target.value })}>
                                                <option value={30}>30s</option>
                                                <option value={60}>1min</option>
                                                <option value={90}>1.5min</option>
                                                <option value={120}>2min</option>
                                            </select>
                                        </div>
                                        <div className={styles.settingRow}>
                                            <label><Shield size={14} /> Impostores</label>
                                            <select value={settings.impostorCount} onChange={e => setSettings({ ...settings, impostorCount: +e.target.value })}>
                                                <option value={1}>1</option>
                                                <option value={2}>2</option>
                                                <option value={3}>3</option>
                                            </select>
                                        </div>
                                    </motion.div>
                                )}

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
                                <button className={styles.formBack} onClick={() => setMode('select')}>
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
