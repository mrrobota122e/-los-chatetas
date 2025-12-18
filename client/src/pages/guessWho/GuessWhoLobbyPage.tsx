import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../hooks/useSocket';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Target, Copy, Check, Play, Sparkles } from 'lucide-react';
import styles from './GuessWhoLobbyPage.module.css';

interface Player {
    id: string;
    socketId: string;
    name: string;
    isReady: boolean;
    isHost: boolean;
    avatarColor: string;
}

export default function GuessWhoLobbyPage() {
    const { roomCode } = useParams<{ roomCode: string }>();
    const navigate = useNavigate();
    const { socket } = useSocket();
    const [players, setPlayers] = useState<Player[]>([]);
    const [roomId, setRoomId] = useState<string>('');
    const [isHost, setIsHost] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!socket || !roomCode) return;

        const storedRoom = localStorage.getItem('currentRoom');
        if (storedRoom) {
            const roomData = JSON.parse(storedRoom);
            if (roomData.roomCode === roomCode) {
                setRoomId(roomData.roomId);
                setIsHost(true);
                socket.emit('room:get-state', { roomCode });
                localStorage.removeItem('currentRoom');
            }
        }

        socket.on('room:state', (data: { roomId: string; players: Player[]; hostId: string }) => {
            setRoomId(data.roomId);
            setPlayers(data.players);
            setIsHost(data.hostId === socket.id);
        });

        socket.on('room:joined', (data: { roomId: string; players: Player[]; hostId: string }) => {
            setRoomId(data.roomId);
            setPlayers(data.players);
            setIsHost(data.hostId === socket.id);
        });

        socket.on('room:updated', (data: { players: Player[] }) => {
            setPlayers(data.players);
        });

        socket.on('guesswho:start-selection', () => {
            navigate(`/guess-who/game`, { state: { roomId, mode: 'vsPlayer' } });
        });

        socket.on('room:error', (error: { code: string; message: string }) => {
            console.error('Room error:', error);
            if (error.code === 'ROOM_CLOSED' || error.code === 'ROOM_NOT_FOUND') {
                alert(error.message);
                navigate('/guess-who/menu');
            }
        });

        return () => {
            socket.off('room:state');
            socket.off('room:joined');
            socket.off('room:updated');
            socket.off('guesswho:start-selection');
            socket.off('room:error');
        };
    }, [socket, navigate, roomCode, roomId]);

    const handleReady = () => {
        if (!socket || !roomId) return;
        const newReadyState = !isReady;
        setIsReady(newReadyState);
        socket.emit('player:ready', { roomId, isReady: newReadyState });
    };

    const handleStartGame = () => {
        if (!socket || !roomId) return;
        socket.emit('guesswho:init', { roomId });
    };

    const handleCopyCode = () => {
        if (roomCode) {
            navigator.clipboard.writeText(roomCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleLeave = () => {
        if (socket && roomId) {
            socket.emit('room:leave', { roomId });
        }
        navigate('/guess-who/menu');
    };

    const canStart = players.length === 2;

    return (
        <div className={styles.container}>
            {/* Background */}
            <div className={styles.bgGradient} />
            <div className={styles.bgGrid} />
            <div className={styles.particles}>
                {[...Array(8)].map((_, i) => (
                    <div key={i} className={styles.particle} style={{
                        left: `${10 + i * 12}%`,
                        animationDelay: `${i * 0.3}s`,
                    }} />
                ))}
            </div>

            {/* Header */}
            <header className={styles.header}>
                <motion.button
                    className={styles.backBtn}
                    onClick={handleLeave}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <ArrowLeft size={20} />
                    <span>Salir</span>
                </motion.button>

                <div className={styles.headerTitle}>
                    <Target size={20} />
                    <span>ADIVINA EL JUGADOR</span>
                </div>
            </header>

            {/* Main */}
            <main className={styles.main}>
                {/* Hero */}
                <motion.div
                    className={styles.hero}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1>SALA DE ESPERA</h1>
                    <p>Duelo 1 vs 1</p>
                </motion.div>

                {/* Room Code */}
                <motion.div
                    className={styles.codeCard}
                    onClick={handleCopyCode}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <span className={styles.codeLabel}>CÓDIGO DE SALA</span>
                    <span className={styles.codeValue}>{roomCode}</span>
                    <div className={styles.copyBtn}>
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                    </div>
                </motion.div>

                {/* Share Link */}
                <motion.button
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                    onClick={() => {
                        const shareUrl = `${window.location.origin}/guess-who/join/${roomCode}`;
                        navigator.clipboard.writeText(shareUrl);
                        alert('¡Link copiado! Compártelo con tu amigo');
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                >
                    🔗 Compartir Link de Invitación
                </motion.button>

                {/* Players */}
                <motion.div
                    className={styles.playersSection}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className={styles.playersHeader}>
                        <Users size={18} />
                        <span>Jugadores ({players.length}/2)</span>
                    </div>

                    <div className={styles.playersGrid}>
                        {players.map((player, idx) => (
                            <motion.div
                                key={player.id}
                                className={`${styles.playerCard} ${player.isReady || player.isHost ? styles.ready : ''}`}
                                initial={{ opacity: 0, x: idx === 0 ? -20 : 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + idx * 0.1 }}
                            >
                                <div
                                    className={styles.playerAvatar}
                                    style={{ background: player.avatarColor }}
                                >
                                    {player.name.charAt(0).toUpperCase()}
                                </div>
                                <div className={styles.playerInfo}>
                                    <span className={styles.playerName}>
                                        {player.name}
                                        {player.isHost && <span className={styles.hostBadge}>HOST</span>}
                                    </span>
                                    <span className={styles.playerStatus}>
                                        {player.isHost ? '👑 Puede iniciar' : player.isReady ? '✓ Listo' : '⏳ Esperando...'}
                                    </span>
                                </div>
                                {(player.isReady || player.isHost) && (
                                    <Sparkles className={styles.readyIcon} size={20} />
                                )}
                            </motion.div>
                        ))}

                        {/* Empty Slot */}
                        {players.length < 2 && (
                            <div className={styles.emptySlot}>
                                <div className={styles.emptyAvatar}>?</div>
                                <span>Esperando oponente...</span>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Actions */}
                <motion.div
                    className={styles.actions}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    {isHost ? (
                        <>
                            <p className={styles.hint}>
                                {!canStart ? 'Esperando al otro jugador...' : '¡Listo para jugar!'}
                            </p>
                            <motion.button
                                className={`${styles.startBtn} ${canStart ? styles.active : ''}`}
                                onClick={handleStartGame}
                                disabled={!canStart}
                                whileHover={canStart ? { scale: 1.05 } : {}}
                                whileTap={canStart ? { scale: 0.98 } : {}}
                            >
                                <Play size={24} fill="currentColor" />
                                <span>INICIAR PARTIDA</span>
                            </motion.button>
                        </>
                    ) : (
                        <motion.button
                            className={`${styles.readyBtn} ${isReady ? styles.isReady : ''}`}
                            onClick={handleReady}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {isReady ? '✓ ESTOY LISTO' : 'MARCAR LISTO'}
                        </motion.button>
                    )}
                </motion.div>
            </main>

            {/* Footer */}
            <footer className={styles.footer}>
                © 2025 AARON STUD10S
            </footer>
        </div>
    );
}
