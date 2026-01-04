import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { Target, Shield, Sparkles, Zap, Trophy, Users, Gamepad2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAdvancedSound } from '../hooks/useAdvancedSound';
import SoundControls from '../components/SoundControls';
import styles from './MenuPage.module.css';

export default function MenuPage() {
    const navigate = useNavigate();
    const { playSound, playBackgroundMusic, preloadSound } = useAdvancedSound();
    const { isConnected } = useSocket();

    const [playerName, setPlayerName] = useState(() => localStorage.getItem('globalPlayerName') || '');
    const [error, setError] = useState('');
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);

    useEffect(() => {
        localStorage.setItem('globalPlayerName', playerName);
    }, [playerName]);

    useEffect(() => {
        const startMusic = () => {
            playBackgroundMusic('menuMusic');
            document.removeEventListener('click', startMusic);
        };
        document.addEventListener('click', startMusic, { once: true });
        ['buttonClick', 'success', 'error', 'whoosh'].forEach(preloadSound);
    }, []);

    const handleGameSelect = (path: string) => {
        if (!playerName.trim()) {
            setError('¡Escribe tu nombre primero!');
            return;
        }
        playSound('whoosh');
        navigate(path);
    };

    return (
        <div className={styles.container}>
            {/* Epic Background Effects */}
            <div className={styles.bgBase} />
            <div className={styles.bgGradient} />
            <div className={styles.bgGrid} />
            <div className={styles.bgOrbs}>
                <div className={styles.orb1} />
                <div className={styles.orb2} />
                <div className={styles.orb3} />
            </div>

            {/* Floating Particles */}
            <div className={styles.particles}>
                {[...Array(12)].map((_, i) => (
                    <div
                        key={i}
                        className={styles.particle}
                        style={{
                            left: `${5 + (i * 8)}%`,
                            animationDelay: `${i * 0.4}s`,
                            animationDuration: `${6 + (i % 4)}s`,
                            background: i % 2 === 0 ? 'rgba(255, 61, 113, 0.5)' : 'rgba(255, 68, 68, 0.5)'
                        }}
                    />
                ))}
            </div>

            {/* Decorative Icons */}
            <div className={styles.floatingIcons}>
                <div className={styles.floatIcon} style={{ top: '15%', left: '8%', animationDelay: '0s' }}>⚽</div>
                <div className={styles.floatIcon} style={{ top: '25%', right: '10%', animationDelay: '1s' }}>🎯</div>
                <div className={styles.floatIcon} style={{ bottom: '30%', left: '5%', animationDelay: '2s' }}>🕵️</div>
                <div className={styles.floatIcon} style={{ bottom: '20%', right: '8%', animationDelay: '0.5s' }}>🏆</div>
                <div className={styles.floatIcon} style={{ top: '50%', left: '3%', animationDelay: '1.5s' }}>⭐</div>
                <div className={styles.floatIcon} style={{ top: '40%', right: '5%', animationDelay: '2.5s' }}>🔥</div>
            </div>

            {/* Main Content */}
            <main className={styles.main}>
                {/* Hero Section */}
                <motion.div
                    className={styles.hero}
                    initial={{ opacity: 0, y: -40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                >
                    <div className={styles.logoContainer}>
                        <div className={styles.logoGlow} />
                        <h1 className={styles.logo}>
                            <span className={styles.logoMain}>
                                LOS CHA<span className={styles.logoHighlight}>TETAS</span>
                            </span>
                        </h1>
                    </div>
                </motion.div>

                {/* Player Name Section */}
                <motion.div
                    className={styles.playerSection}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                >
                    <div className={styles.playerCard}>
                        <div className={styles.playerIcon}>
                            <Gamepad2 size={24} />
                        </div>
                        <div className={styles.playerInput}>
                            <label>NOMBRE DE JUGADOR</label>
                            <input
                                type="text"
                                value={playerName}
                                onChange={e => { setPlayerName(e.target.value); setError(''); }}
                                placeholder="Escribe tu nombre..."
                                maxLength={25}
                            />
                        </div>
                        <div className={`${styles.connectionBadge} ${isConnected ? styles.online : ''}`}>
                            <div className={styles.connDot} />
                            {isConnected ? 'ONLINE' : '...'}
                        </div>
                    </div>
                    {error && (
                        <motion.div
                            className={styles.errorMsg}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            {error}
                        </motion.div>
                    )}
                </motion.div>

                {/* Game Selection */}
                <motion.div
                    className={styles.gamesSection}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                >
                    <h2 className={styles.selectTitle}>
                        <Zap size={20} />
                        SELECCIONA TU JUEGO
                        <Zap size={20} />
                    </h2>

                    <div className={styles.gameCards}>
                        {/* Guess Who Card */}
                        <motion.button
                            className={`${styles.gameCard} ${styles.guessCard}`}
                            onClick={() => handleGameSelect('/guess-who/menu')}
                            onMouseEnter={() => setHoveredCard('guess')}
                            onMouseLeave={() => setHoveredCard(null)}
                            whileHover={{ scale: 1.02, y: -8 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <div className={styles.cardGlow} />
                            <div className={styles.cardContent}>
                                <div className={styles.cardIcon}>
                                    <Target size={48} />
                                </div>
                                <div className={styles.cardInfo}>
                                    <h3>ADIVINA EL JUGADOR</h3>
                                    <p>Duelo de deducción 1vs1</p>
                                    <div className={styles.cardFeatures}>
                                        <span><Users size={14} /> 2 Jugadores</span>
                                        <span><Trophy size={14} /> Competitivo</span>
                                    </div>
                                </div>
                                <div className={styles.cardBadge}>
                                    <span>NUEVO</span>
                                </div>
                                <div className={styles.cardArrow}>→</div>
                            </div>
                            {hoveredCard === 'guess' && (
                                <div className={styles.cardShine} />
                            )}
                        </motion.button>

                        {/* Impostor Card */}
                        <motion.button
                            className={`${styles.gameCard} ${styles.impostorCard}`}
                            onClick={() => handleGameSelect('/impostor-v2/menu')}
                            onMouseEnter={() => setHoveredCard('impostor')}
                            onMouseLeave={() => setHoveredCard(null)}
                            whileHover={{ scale: 1.02, y: -8 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <div className={styles.cardGlow} />
                            <div className={styles.cardContent}>
                                <div className={styles.cardIcon}>
                                    <Shield size={48} />
                                </div>
                                <div className={styles.cardInfo}>
                                    <h3>EL IMPOSTOR</h3>
                                    <p>¿Quién no conoce la palabra?</p>
                                    <div className={styles.cardFeatures}>
                                        <span><Users size={14} /> 4-12 Jugadores</span>
                                        <span><Trophy size={14} /> Social</span>
                                    </div>
                                </div>
                                <div className={styles.cardBadge}>
                                    <span>CLÁSICO</span>
                                </div>
                                <div className={styles.cardArrow}>→</div>
                            </div>
                            {hoveredCard === 'impostor' && (
                                <div className={styles.cardShine} />
                            )}
                        </motion.button>
                    </div>
                </motion.div>

                {/* Stats/Info Section */}
                <motion.div
                    className={styles.infoSection}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                >
                    <div className={styles.infoItem}>
                        <span className={styles.infoIcon}>🎮</span>
                        <span>2 Juegos</span>
                    </div>
                    <div className={styles.infoDivider} />
                    <div className={styles.infoItem}>
                        <span className={styles.infoIcon}>⚽</span>
                        <span>Temática Fútbol</span>
                    </div>
                    <div className={styles.infoDivider} />
                    <div className={styles.infoItem}>
                        <span className={styles.infoIcon}>🌐</span>
                        <span>Multijugador Online</span>
                    </div>
                </motion.div>
            </main>

            {/* Footer */}
            <footer className={styles.footer}>
                <p>© 2025 — v1.0.5</p>
            </footer>

            {/* Sound Controls */}
            <SoundControls />
        </div>
    );
}
