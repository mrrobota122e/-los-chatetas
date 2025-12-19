import { useState, useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import styles from './VotingPhase.module.css';

interface VotingPhaseProps {
    roomCode: string;
    players: any[];
    duration: number;
}

export default function VotingPhase({ roomCode, players, duration }: VotingPhaseProps) {
    const { socket } = useSocket();
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(Math.floor(duration / 1000));
    const myPlayerId = localStorage.getItem('playerId') || '';

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const handleVote = (targetId: string) => {
        if (hasVoted || !socket) return;

        setSelectedPlayer(targetId);
    };

    const confirmVote = () => {
        if (!socket || !selectedPlayer || hasVoted) return;

        socket.emit('impostor:vote', {
            roomCode,
            targetPlayerId: selectedPlayer
        });

        setHasVoted(true);
    };

    const activePlayers = players.filter(p => !p.isEliminated && p.id !== myPlayerId);

    return (
        <div className={styles.container}>
            <div className={styles.header + ' glass-strong'}>
                <h2 className={styles.title}>🗳️ Votación</h2>
                <div className={styles.timer + (timeLeft <= 15 ? ' ' + styles.timerWarning : '')}>
                    ⏱️ {timeLeft}s
                </div>
            </div>

            <p className={styles.subtitle}>
                {hasVoted
                    ? '✅ Voto registrado. Esperando a los demás...'
                    : '¿Quién crees que es el impostor?'}
            </p>

            <div className={styles.playersGrid}>
                {activePlayers.map((player) => (
                    <button
                        key={player.id}
                        className={`${styles.playerCard} ${selectedPlayer === player.id ? styles.selected : ''} glass`}
                        onClick={() => handleVote(player.id)}
                        disabled={hasVoted}
                    >
                        <div className={styles.playerAvatar}>
                            {player.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.playerName}>{player.name}</div>
                        {selectedPlayer === player.id && (
                            <div className={styles.checkmark}>✓</div>
                        )}
                    </button>
                ))}
            </div>

            {selectedPlayer && !hasVoted && (
                <button
                    className={styles.confirmButton + ' neon-border-blue'}
                    onClick={confirmVote}
                >
                    Confirmar Voto
                </button>
            )}
        </div>
    );
}
