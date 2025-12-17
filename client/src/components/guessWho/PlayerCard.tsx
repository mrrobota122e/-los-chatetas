import { FC, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Player } from '../../game-data/players/playerUtils';
import styles from './PlayerCard.module.css';

interface PlayerCardProps {
    player: Player;
    isEliminated?: boolean;
    isSelected?: boolean;
    onClick?: () => void;
    size?: 'small' | 'medium' | 'large';
}

const PlayerCard: FC<PlayerCardProps> = ({
    player,
    isEliminated = false,
    isSelected = false,
    onClick,
    size = 'medium'
}) => {
    const [imageError, setImageError] = useState(false);

    return (
        <div
            className={`${styles.card} ${styles[size]} ${isEliminated ? styles.eliminated : ''} ${isSelected ? styles.selected : ''}`}
            onClick={!isEliminated ? onClick : undefined}
        >
            {/* Card Background */}
            <div className={styles.cardBg} />

            {/* Player Image */}
            <div className={styles.imageContainer}>
                {player.imageUrl && !imageError ? (
                    <img
                        src={player.imageUrl}
                        alt={player.name}
                        className={styles.image}
                        style={{ objectFit: 'cover' }}
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div
                        className={styles.image}
                        style={{
                            background: `linear-gradient(135deg, ${getGradientColors(player.team)})`
                        }}
                    >
                        <span className={styles.initial}>{player.name.charAt(0)}</span>
                    </div>
                )}
            </div>

            {/* Player Info */}
            <div className={styles.info}>
                <h3 className={styles.name}>{player.name}</h3>
                {size !== 'small' && (
                    <>
                        <p className={styles.team}>{player.team}</p>
                        <div className={styles.badges}>
                            <span className={styles.badge}>{player.nationality}</span>
                            <span className={styles.badge}>{player.position}</span>
                        </div>
                    </>
                )}
                {size === 'small' && (
                    <p className={styles.teamSmall}>{player.team}</p>
                )}
            </div>

            {/* Elimination Overlay */}
            {isEliminated && (
                <div className={styles.eliminatedOverlay}>
                    <X size={size === 'small' ? 32 : 48} />
                </div>
            )}

            {/* Selection Glow */}
            {isSelected && <div className={styles.selectionGlow} />}
        </div>
    );
};

// Get team colors for gradient
function getGradientColors(team: string): string {
    const teamColors: Record<string, string> = {
        'Inter Miami': '#F7B5CD, #EC268F',
        'Al-Nassr': '#FFD700, #FFA500',
        'Al-Hilal': '#0066CC, #3399FF',
        'Real Madrid': '#FFFFFF, #F0E68C',
        'Manchester City': '#6CABDD, #1C2C5B',
        'Barcelona': '#A50044, #004D98',
        'PSG': '#001F5B, #DA1F2D',
        'Bayern Munich': '#DC052D, #FCBB09'
    };

    return teamColors[team] || '#7b2ff7, #00d9ff';
}

export default PlayerCard;
