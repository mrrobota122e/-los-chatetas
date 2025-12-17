import { FC } from 'react';
import styles from './TypingIndicator.module.css';

interface TypingIndicatorProps {
    playerName: string;
}

/**
 * Typing Indicator Component
 * Shows animated dots when a player is typing in chat
 */
const TypingIndicator: FC<TypingIndicatorProps> = ({ playerName }) => {
    return (
        <div className={styles.typingIndicator}>
            <span className={styles.playerName}>{playerName}</span>
            <span className={styles.typingText}>está escribiendo</span>
            <div className={styles.dots}>
                <span className={styles.dot} style={{ animationDelay: '0s' }}>•</span>
                <span className={styles.dot} style={{ animationDelay: '0.2s' }}>•</span>
                <span className={styles.dot} style={{ animationDelay: '0.4s' }}>•</span>
            </div>
        </div>
    );
};

export default TypingIndicator;
