import { FC, useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import styles from './AvatarSelector.module.css';

// 30 avatar options
const AVATARS = [
    '⚽', '🏆', '🥅', '👟', '🎯', '⭐', '🔥', '⚡', '💎', '🎮',
    '🎪', '🎨', '🎭', '🎯', '🎲', '🎸', '🎺', '🎻', '🎬', '📸',
    '🚀', '✨', '💫', '🌟', '🏅', '👑', '🦁', '🦅', '🐉', '🎃'
];

interface AvatarSelectorProps {
    selectedAvatar: string;
    onSelect: (avatar: string) => void;
}

const AvatarSelector: FC<AvatarSelectorProps> = ({ selectedAvatar, onSelect }) => {
    return (
        <div className={styles.container}>
            <h4 className={styles.title}>Elige tu Avatar</h4>
            <div className={styles.grid}>
                {AVATARS.map((avatar) => (
                    <motion.button
                        key={avatar}
                        className={`${styles.avatarBtn} ${selectedAvatar === avatar ? styles.selected : ''}`}
                        onClick={() => onSelect(avatar)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <span className={styles.emoji}>{avatar}</span>
                        {selectedAvatar === avatar && (
                            <div className={styles.checkMark}>
                                <Check size={16} />
                            </div>
                        )}
                    </motion.button>
                ))}
            </div>
        </div>
    );
};

export default AvatarSelector;
