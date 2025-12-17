import { FC } from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { POWER_UPS, PowerUpType, PlayerPowerUps, canUsePowerUp } from '../../game-logic/powerUps';
import styles from './PowerUpShop.module.css';

interface PowerUpShopProps {
    playerPowerUps: PlayerPowerUps;
    currentRound: number;
    onPurchase: (powerUpType: PowerUpType) => void;
}

const PowerUpShop: FC<PowerUpShopProps> = ({ playerPowerUps, currentRound, onPurchase }) => {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>⚡ Power-Ups</h3>
                <div className={styles.pointsBadge}>
                    <Zap size={16} />
                    <span>{playerPowerUps.points} pts</span>
                </div>
            </div>

            <div className={styles.grid}>
                {Object.values(POWER_UPS).map(powerUp => {
                    const canUse = canUsePowerUp(playerPowerUps, powerUp.id, currentRound);
                    const isActive = playerPowerUps.activePowerUps.includes(powerUp.id);

                    return (
                        <motion.button
                            key={powerUp.id}
                            className={`${styles.powerUpCard} ${!canUse ? styles.disabled : ''} ${isActive ? styles.active : ''}`}
                            onClick={() => canUse && onPurchase(powerUp.id)}
                            whileHover={canUse ? { scale: 1.05 } : {}}
                            whileTap={canUse ? { scale: 0.95 } : {}}
                            disabled={!canUse}
                        >
                            <div className={styles.icon}>{powerUp.icon}</div>
                            <div className={styles.info}>
                                <h4>{powerUp.name}</h4>
                                <p className={styles.description}>{powerUp.description}</p>
                                <div className={styles.meta}>
                                    <span className={styles.cost}>{powerUp.cost} pts</span>
                                    <span className={styles.cooldown}>CD: {powerUp.cooldown}</span>
                                </div>
                            </div>
                            {isActive && <div className={styles.activeBadge}>ACTIVO</div>}
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
};

export default PowerUpShop;
