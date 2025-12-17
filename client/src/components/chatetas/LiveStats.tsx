import { FC } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, MessageSquare, Users, Award } from 'lucide-react';
import styles from './LiveStats.module.css';

interface LiveStatsProps {
    totalClues: number;
    totalMessages: number;
    alivePlayers: number;
    currentRound: number;
    maxRounds: number;
}

const LiveStats: FC<LiveStatsProps> = ({
    totalClues,
    totalMessages,
    alivePlayers,
    currentRound,
    maxRounds
}) => {
    return (
        <div className={styles.container}>
            <h4 className={styles.title}>📊 Estadísticas en Vivo</h4>

            <div className={styles.statsGrid}>
                <motion.div
                    className={styles.statCard}
                    whileHover={{ scale: 1.05 }}
                >
                    <div className={styles.icon} style={{ color: '#00d9ff' }}>
                        <MessageSquare size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{totalClues}</span>
                        <span className={styles.statLabel}>Pistas Dadas</span>
                    </div>
                </motion.div>

                <motion.div
                    className={styles.statCard}
                    whileHover={{ scale: 1.05 }}
                >
                    <div className={styles.icon} style={{ color: '#7b2ff7' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{totalMessages}</span>
                        <span className={styles.statLabel}>Mensajes Chat</span>
                    </div>
                </motion.div>

                <motion.div
                    className={styles.statCard}
                    whileHover={{ scale: 1.05 }}
                >
                    <div className={styles.icon} style={{ color: '#00e676' }}>
                        <Users size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{alivePlayers}</span>
                        <span className={styles.statLabel}>Jugadores Vivos</span>
                    </div>
                </motion.div>

                <motion.div
                    className={styles.statCard}
                    whileHover={{ scale: 1.05 }}
                >
                    <div className={styles.icon} style={{ color: '#ffa726' }}>
                        <Award size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{currentRound}/{maxRounds}</span>
                        <span className={styles.statLabel}>Ronda Actual</span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default LiveStats;
