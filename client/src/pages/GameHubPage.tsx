import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Brain, TrendingUp, Clock } from 'lucide-react';
import styles from './GameHubPage.module.css';

interface GameCardData {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    players: string;
    duration: string;
    difficulty: string;
    color: string;
    route: string;
    icon: 'users' | 'brain';
}

const GAMES: GameCardData[] = [
    {
        id: 'chatetas',
        title: 'LOS CHATETAS',
        subtitle: 'Fútbol Edition',
        description: 'Encuentra al impostor que no conoce la palabra secreta. Da pistas, debate y vota para eliminarlo.',
        players: '3-12 jugadores',
        duration: '10-20 min',
        difficulty: 'Fácil',
        color: 'linear-gradient(135deg, #7b2ff7 0%, #00d9ff 100%)',
        route: '/chatetas/menu',
        icon: 'users'
    },
    {
        id: 'guess-who',
        title: 'ADIVINA EL JUGADOR',
        subtitle: 'Duelo de Deducción',
        description: 'Desafía a un oponente en un duelo de preguntas. Adivina su jugador antes de que adivine el tuyo.',
        players: '1v1',
        duration: '5-10 min',
        difficulty: 'Media',
        color: 'linear-gradient(135deg, #00C853 0%, #FFD700 100%)',
        route: '/guess-who/menu',
        icon: 'brain'
    }
];

export default function GameHubPage() {
    const navigate = useNavigate();

    const handleGameSelect = (route: string) => {
        navigate(route);
    };

    return (
        <div className={styles.container}>
            {/* Animated Background */}
            <div className={styles.bgGradient} />
            <div className={styles.bgPattern} />

            {/* Header */}
            <header className={styles.header}>
                <motion.div
                    className={styles.logo}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    {/* Logo removed */}
                </motion.div>
                <motion.p
                    className={styles.tagline}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                >
                    ⚽ Juegos de Fútbol Premium
                </motion.p>
            </header>

            {/* Main Content */}
            <main className={styles.main}>
                <motion.h1
                    className={styles.title}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                >
                    Elige Tu Juego
                </motion.h1>

                {/* Game Cards */}
                <div className={styles.gamesGrid}>
                    {GAMES.map((game, index) => (
                        <motion.div
                            key={game.id}
                            className={styles.gameCard}
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 + index * 0.2, duration: 0.6 }}
                            whileHover={{ scale: 1.05, y: -10 }}
                            onClick={() => handleGameSelect(game.route)}
                        >
                            {/* Gradient Background */}
                            <div
                                className={styles.cardGradient}
                                style={{ background: game.color }}
                            />

                            {/* Icon */}
                            <div className={styles.cardIcon}>
                                {game.icon === 'users' ? (
                                    <Users size={48} strokeWidth={2} />
                                ) : (
                                    <Brain size={48} strokeWidth={2} />
                                )}
                            </div>

                            {/* Content */}
                            <div className={styles.cardContent}>
                                <h2 className={styles.cardTitle}>{game.title}</h2>
                                <p className={styles.cardSubtitle}>{game.subtitle}</p>
                                <p className={styles.cardDescription}>{game.description}</p>

                                {/* Stats */}
                                <div className={styles.cardStats}>
                                    <div className={styles.stat}>
                                        <Users size={16} />
                                        <span>{game.players}</span>
                                    </div>
                                    <div className={styles.stat}>
                                        <Clock size={16} />
                                        <span>{game.duration}</span>
                                    </div>
                                    <div className={styles.stat}>
                                        <TrendingUp size={16} />
                                        <span>{game.difficulty}</span>
                                    </div>
                                </div>

                                {/* Play Button */}
                                <button className={styles.playButton}>
                                    JUGAR AHORA
                                    <span className={styles.arrow}>→</span>
                                </button>
                            </div>

                            {/* Hover Effect */}
                            <div className={styles.cardGlow} />
                        </motion.div>
                    ))}
                </div>

                {/* Global Stats */}
                <motion.div
                    className={styles.statsPanel}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 0.6 }}
                >
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>1,234</span>
                        <span className={styles.statLabel}>Partidas Jugadas</span>
                    </div>
                    <div className={styles.statDivider} />
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>56</span>
                        <span className={styles.statLabel}>Jugadores Activos</span>
                    </div>
                    <div className={styles.statDivider} />
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>89%</span>
                        <span className={styles.statLabel}>Satisfacción</span>
                    </div>
                </motion.div>
            </main>

            {/* Footer */}
            <footer className={styles.footer}>
                <p>© 2025 AARON STUD<span className={styles.footerNumber}>10</span>S — Todos los derechos reservados</p>
            </footer>
        </div>
    );
}
