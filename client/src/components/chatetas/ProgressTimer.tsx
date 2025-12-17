import { FC } from 'react';
import { motion } from 'framer-motion';
import styles from './ProgressTimer.module.css';

interface ProgressTimerProps {
    totalSeconds: number;
    elapsedSeconds: number;
    phase: string;
}

const ProgressTimer: FC<ProgressTimerProps> = ({ totalSeconds, elapsedSeconds, phase }) => {
    const percentage = ((totalSeconds - elapsedSeconds) / totalSeconds) * 100;
    const isCritical = elapsedSeconds > totalSeconds * 0.8; // Last 20%

    return (
        <div className={styles.container}>
            <div className={styles.phaseLabel}>{phase}</div>

            <div className={styles.timerDisplay}>
                <span className={`${styles.timeText} ${isCritical ? styles.critical : ''}`}>
                    {totalSeconds - elapsedSeconds}s
                </span>
            </div>

            <div className={styles.progressBarContainer}>
                <motion.div
                    className={`${styles.progressBar} ${isCritical ? styles.critical : ''}`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, ease: 'linear' }}
                />
            </div>
        </div>
    );
};

export default ProgressTimer;
