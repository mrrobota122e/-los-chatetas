import { useEffect, useState } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import styles from './ResultPhase.module.css';

export default function ResultPhase() {
    const { socket } = useSocket();
    const [result, setResult] = useState<any>(null);

    useEffect(() => {
        if (!socket) return;

        socket.on('impostor:player-eliminated', (data) => {
            setResult({
                type: 'elimination',
                playerName: data.playerName,
                wasImpostor: data.wasImpostor
            });
        });

        socket.on('impostor:votes-tallied', (data) => {
            if (data.tie || !data.eliminated) {
                setResult({
                    type: 'tie'
                });
            }
        });

        return () => {
            socket.off('impostor:player-eliminated');
            socket.off('impostor:votes-tallied');
        };
    }, [socket]);

    if (!result) {
        return (
            <div className={styles.container}>
                <div className={styles.loader} />
                <p>Contando votos...</p>
            </div>
        );
    }

    if (result.type === 'tie') {
        return (
            <div className={styles.container}>
                <div className={styles.icon}>🤝</div>
                <h1 className={styles.title}>EMPATE</h1>
                <p className={styles.subtitle}>Nadie fue expulsado</p>
                <div className={styles.message + ' glass'}>
                    No hubo consenso. El juego continúa...
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.animation}>
                <div className={styles.playerEjected}>
                    {result.playerName.charAt(0).toUpperCase()}
                </div>
                <div className={styles.ejectEffect} />
            </div>

            <h1 className={`${styles.title} ${result.wasImpostor ? styles.titleSuccess : styles.titleDanger}`}>
                {result.playerName}
            </h1>

            <div className={`${styles.verdict} ${result.wasImpostor ? styles.verdictSuccess : styles.verdictDanger}`}>
                {result.wasImpostor ? (
                    <>
                        <div className={styles.icon}>✅</div>
                        <h2>ERA EL IMPOSTOR</h2>
                        <p>¡El grupo gana!</p>
                    </>
                ) : (
                    <>
                        <div className={styles.icon}>❌</div>
                        <h2>NO ERA EL IMPOSTOR</h2>
                        <p>El impostor sigue entre nosotros...</p>
                    </>
                )}
            </div>
        </div>
    );
}
