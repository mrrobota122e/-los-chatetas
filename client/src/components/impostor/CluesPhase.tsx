import { useState, useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import styles from './CluesPhase.module.css';

interface CluesPhasePr ops {
    roomCode: string;
    players: any[];
    currentRound: number;
    totalRounds: number;
}

interface Clue {
    playerId: string;
    playerName: string;
    clue: string;
}

export default function CluesPhase({ roomCode, players, currentRound, totalRounds }: CluesPhaseProps) {
    const { socket } = useSocket();
    const [currentTurn, setCurrentTurn] = useState<{ playerId: string; playerName: string } | null>(null);
    const [myClue, setMyClue] = useState('');
    const [clues, setClues] = useState<Clue[]>([]);
    const [timeLeft, setTimeLeft] = useState(30);
    const [canSendClue, setCanSendClue] = useState(false);
    const [clueSent, setClueSent] = useState(false);

    const myPlayerId = localStorage.getItem('playerId') || '';

    useEffect(() => {
        if (!socket) return;

        socket.on('impostor:turn-changed', (data) => {
            setCurrentTurn({ playerId: data.playerId, playerName: data.playerName });
            setTimeLeft(Math.floor(data.duration / 1000));
            setCanSendClue(data.playerId === myPlayerId);
            setClueSent(false);
        });

        socket.on('impostor:clue-received', (data) => {
            setClues(prev => [...prev, {
                playerId: data.playerId,
                playerName: data.playerName,
                clue: data.clue
            }]);
        });

        socket.on('impostor:chat-locked', () => {
            setCanSendClue(false);
        });

        return () => {
            socket.off('impostor:turn-changed');
            socket.off('impostor:clue-received');
            socket.off('impostor:chat-locked');
        };
    }, [socket, myPlayerId]);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, [currentTurn]);

    const handleSendClue = () => {
        if (!socket || !myClue.trim() || !canSendClue || clueSent) return;

        socket.emit('impostor:send-clue', {
            roomCode,
            clue: myClue.trim()
        });

        setClueSent(true);
        setCanSendClue(false);
        setMyClue('');
    };

    const isMyTurn = currentTurn?.playerId === myPlayerId;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>📝 Fase de Pistas</h2>
                <div className={styles.roundInfo}>
                    Ronda {currentRound} / {totalRounds}
                </div>
            </div>

            <div className={styles.content}>
                {/* Turn indicator */}
                <div className={styles.turnIndicator + ' glass-strong'}>
                    <div className={styles.turnIcon}>⏱️</div>
                    <div className={styles.turnInfo}>
                        <div className={styles.turnPlayer}>
                            {isMyTurn ? '¡Tu turno!' : `Turno de ${currentTurn?.playerName || '...'}`}
                        </div>
                        <div className={styles.timer + (timeLeft <= 10 ? ' ' + styles.timerWarning : '')}>
                            {timeLeft}s
                        </div>
                    </div>
                </div>

                {/* Clue input (only visible on your turn) */}
                {isMyTurn && !clueSent && (
                    <div className={styles.clueInput + ' glass neon-border-blue'}>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="Escribe tu pista aquí... (ej: Juega en España)"
                            value={myClue}
                            onChange={(e) => setMyClue(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendClue()}
                            maxLength={100}
                            disabled={!canSendClue || clueSent}
                            autoFocus
                        />
                        <button
                            className={styles.sendButton}
                            onClick={handleSendClue}
                            disabled={!myClue.trim() || !canSendClue || clueSent}
                        >
                            Enviar Pista →
                        </button>
                    </div>
                )}

                {clueSent && (
                    <div className={styles.sentConfirmation + ' glass'}>
                        ✅ Pista enviada. Esperando a los demás jugadores...
                    </div>
                )}

                {/* Clues history */}
                <div className={styles.cluesContainer}>
                    <h3 className={styles.cluesTitle}>Pistas Recibidas ({clues.length})</h3>
                    <div className={styles.cluesList}>
                        {clues.length === 0 ? (
                            <p className={styles.emptyState}>Esperando primera pista...</p>
                        ) : (
                            clues.map((clue, index) => (
                                <div key={index} className={styles.clueCard + ' glass'}>
                                    <div className={styles.clueHeader}>
                                        <span className={styles.clueNumber}>#{index + 1}</span>
                                        <span className={styles.clueName}>{clue.playerName}</span>
                                    </div>
                                    <div className={styles.clueText}>{clue.clue}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
