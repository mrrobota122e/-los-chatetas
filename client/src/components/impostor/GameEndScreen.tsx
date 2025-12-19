import { useEffect, useState } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import styles from './GameEndScreen.module.css';

interface GameEndScreenProps {
    onExit: () => void;
}

export default function GameEndScreen({ onExit }: GameEndScreenProps) {
    const { socket } = useSocket();
    const [gameResult, setGameResult] = useState<any>(null);

    useEffect(() => {
        if (!socket) return;

        socket.on('impostor:game-ended', (data) => {
            setGameResult(data);
        });

        return () => {
            socket.off('impostor:game-ended');
        };
    }, [socket]);

    if (!gameResult) {
        return (
            <div className={styles.container}>
                <div className={styles.loader} />
                <p>Finalizando juego...</p>
            </div>
        );
    }

    const isCrewWin = gameResult.winner === 'crew';

    return (
        <div className={styles.container}>
            <div className={styles.resultCard + ' glass-strong'}>
                <div className={styles.icon}>
                    {isCrewWin ? '🏆' : '🎭'}
                </div>

                <h1 className={`${styles.title} ${isCrewWin ? 'neon-text-blue' : 'neon-text-red'}`}>
                    {isCrewWin ? '¡VICTORIA DEL GRUPO!' : '¡EL IMPOSTOR GANA!'}
                </h1>

                <div className={styles.impostorReveal}>
                    <p className={styles.revealLabel}>El impostor era:</p>
                    <h2 className={styles.impostorName}>{gameResult.impostorId}</h2>
                </div>

                <div className={styles.footballerInfo}>
                    <p className={styles.footballerLabel}>Futbolista de la ronda:</p>
                    <h3 className={styles.footballerName}>⚽ {gameResult.footballer}</h3>
                </div>

                <div className={styles.message}>
                    {isCrewWin ? (
                        <p>¡Felicidades! El grupo identificó correctamente al impostor.</p>
                    ) : (
                        <p>El impostor logró engañar al grupo y sobrevivió.</p>
                    )}
                </div>

                <button
                    className={styles.exitButton + ' neon-border-blue'}
                    onClick={onExit}
                >
                    Volver al Menú
                </button>
            </div>
        </div>
    );
}
