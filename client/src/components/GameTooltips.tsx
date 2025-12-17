import { FC } from 'react';
import { Tooltip } from 'react-tooltip';
import styles from './GameTooltips.module.css';

/**
 * Game Tooltips Component
 * Provides contextual help throughout the game
 */
const GameTooltips: FC = () => {
    return (
        <>
            {/* Player Panel Tooltips */}
            <Tooltip
                id="players-tooltip"
                place="right"
                className={styles.tooltip}
            >
                <div className={styles.tooltipContent}>
                    <strong>Panel de Jugadores</strong>
                    <p>🟢 Borde naranja = Turno activo</p>
                    <p>✓ Check verde = Ya dio pista</p>
                    <p>🗳️ Número rojo = Votos recibidos</p>
                </div>
            </Tooltip>

            {/* Timer Tooltip */}
            <Tooltip
                id="timer-tooltip"
                place="bottom"
                className={styles.tooltip}
            >
                <div className={styles.tooltipContent}>
                    <strong>Temporizador</strong>
                    <p>Tiempo restante en esta fase</p>
                    <p>🔴 Rojo parpadeante = Últimos 5 segundos</p>
                </div>
            </Tooltip>

            {/* Word Badge Tooltip */}
            <Tooltip
                id="word-tooltip"
                place="bottom"
                className={styles.tooltip}
            >
                <div className={styles.tooltipContent}>
                    <strong>Tu Rol</strong>
                    <p>🔒 = Conoces la palabra</p>
                    <p>❓ = Eres el IMPOSTOR</p>
                    <p><em>No reveles tu rol directamente!</em></p>
                </div>
            </Tooltip>

            {/* Voting Tooltip */}
            <Tooltip
                id="vote-tooltip"
                place="left"
                className={styles.tooltip}
            >
                <div className={styles.tooltipContent}>
                    <strong>Votación</strong>
                    <p>Haz clic en un jugador para votar</p>
                    <p>Solo puedes votar una vez</p>
                    <p>El más votado será expulsado</p>
                </div>
            </Tooltip>

            {/* Clues Tooltip */}
            <Tooltip
                id="clues-tooltip"
                place="bottom"
                className={styles.tooltip}
            >
                <div className={styles.tooltipContent}>
                    <strong>Pistas</strong>
                    <p>Da pistas sin decir la palabra exacta</p>
                    <p>Sé creativo pero no obvio</p>
                    <p>Los impostores intentarán imitarte</p>
                </div>
            </Tooltip>
        </>
    );
};

export default GameTooltips;
