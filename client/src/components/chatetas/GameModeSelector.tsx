import { FC } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { GAME_MODES, GameMode } from '../../game-logic/gameModes';
import styles from './GameModeSelector.module.css';

interface GameModeSelectorProps {
    selectedMode: GameMode;
    onSelect: (mode: GameMode) => void;
    playerCount: number;
}

const GameModeSelector: FC<GameModeSelectorProps> = ({ selectedMode, onSelect, playerCount }) => {
    return (
        <div className={styles.container}>
            <h3 className={styles.title}>Modo de Juego</h3>
            <div className={styles.modesGrid}>
                {Object.values(GAME_MODES).map(mode => {
                    const isSelected = selectedMode === mode.id;
                    const canPlay = playerCount >= mode.settings.minPlayers &&
                        playerCount <= mode.settings.maxPlayers;

                    return (
                        <motion.button
                            key={mode.id}
                            className={`${styles.modeCard} ${isSelected ? styles.selected : ''} ${!canPlay ? styles.disabled : ''}`}
                            onClick={() => canPlay && onSelect(mode.id)}
                            whileHover={canPlay ? { scale: 1.03 } : {}}
                            disabled={!canPlay}
                        >
                            <div className={styles.icon}>{mode.icon}</div>
                            <h4 className={styles.modeName}>{mode.name}</h4>
                            <p className={styles.description}>{mode.description}</p>

                            <div className={styles.features}>
                                {mode.features.map((feature, i) => (
                                    <span key={i} className={styles.feature}>• {feature}</span>
                                ))}
                            </div>

                            {isSelected && (
                                <div className={styles.checkMark}>
                                    <Check size={20} />
                                </div>
                            )}

                            {!canPlay && (
                                <div className={styles.lockOverlay}>
                                    🔒 {mode.settings.minPlayers}-{mode.settings.maxPlayers} jugadores
                                </div>
                            )}
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
};

export default GameModeSelector;
