import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import styles from './ImpostorLobbyPage.module.css';

interface Player {
    id: string;
    name: string;
    isReady: boolean;
    isHost: boolean;
}

export default function ImpostorLobbyPage() {
    const { roomCode } = useParams<{ roomCode: string }>();
    const navigate = useNavigate();
    const { socket } = useSocket();

    const [players, setPlayers] = useState<Player[]>([]);
    const [roomId, setRoomId] = useState<string>('');
    const [isHost, setIsHost] = useState(false);
    const [myPlayerId, setMyPlayerId] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!socket || !roomCode) return;

        const playerName = localStorage.getItem('globalPlayerName') || 'Jugador';
        const storedPlayerId = localStorage.getItem('playerId');

        // Join or create room
        if (storedPlayerId) {
            socket.emit('room:get-state', { roomCode });
        } else {
            socket.emit('room:join', { roomCode, playerName });
        }

        // Listen for room state
        socket.on('room:joined', (data) => {
            console.log('Room joined:', data);
            setRoomId(data.roomId);
            setPlayers(data.players);
            setIsHost(data.hostId === socket.id);
            setMyPlayerId(socket.id || '');
            setLoading(false);

            // Save player ID
            localStorage.setItem('playerId', socket.id || '');
        });

        socket.on('room:state', (data) => {
            console.log('Room state:', data);
            setRoomId(data.roomId);
            setPlayers(data.players);
            setIsHost(data.hostId === socket.id);
            setMyPlayerId(socket.id || '');
            setLoading(false);
        });

        socket.on('room:updated', (data) => {
            setPlayers(data.players);
        });

        socket.on('room:player-joined', (data) => {
            console.log('Player joined:', data);
        });

        socket.on('room:player-left', (data) => {
            console.log('Player left:', data);
        });

        socket.on('room:error', (error) => {
            console.error('Room error:', error);
            alert(error.message);
            navigate('/impostor-v2/menu');
        });

        // Game started
        socket.on('impostor:state-changed', (data) => {
            if (data.state === 'ASSIGNMENT') {
                navigate(`/impostor-v2/game/${roomCode}`);
            }
        });

        return () => {
            socket.off('room:joined');
            socket.off('room:state');
            socket.off('room:updated');
            socket.off('room:player-joined');
            socket.off('room:player-left');
            socket.off('room:error');
            socket.off('impostor:state-changed');
        };
    }, [socket, roomCode, navigate]);

    const handleStartGame = () => {
        if (!socket || !roomId) return;

        if (players.length < 3) {
            alert('Se necesitan al menos 3 jugadores para empezar');
            return;
        }

        socket.emit('impostor:start-game', { roomId });
    };

    const handleLeave = () => {
        if (socket && roomId) {
            socket.emit('room:leave', { roomId });
        }
        navigate('/impostor-v2/menu');
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loader} />
                <p className="neon-text-blue">Cargando sala...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.background} />

            <div className={styles.header + ' glass-strong'}>
                <div className={styles.roomInfo}>
                    <h2 className={styles.roomCode}>
                        Código: <span className="neon-text-blue">{roomCode}</span>
                    </h2>
                    <p className={styles.playerCount}>
                        {players.length} / 8 jugadores
                    </p>
                </div>
                <button className={styles.leaveButton} onClick={handleLeave}>
                    ← Salir
                </button>
            </div>

            <div className={styles.content}>
                <div className={styles.playersSection}>
                    <h3 className={styles.sectionTitle}>Jugadores en la sala</h3>
                    <div className={styles.playersList}>
                        {players.map((player) => (
                            <div
                                key={player.id}
                                className={`${styles.playerCard} glass ${player.id === myPlayerId ? styles.me : ''}`}
                            >
                                <div className={styles.playerAvatar}>
                                    {player.name.charAt(0).toUpperCase()}
                                </div>
                                <div className={styles.playerInfo}>
                                    <div className={styles.playerName}>
                                        {player.name}
                                        {player.id === myPlayerId && ' (Tú)'}
                                    </div>
                                    {player.isHost && (
                                        <div className={styles.hostBadge}>👑 Host</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.controls}>
                    {isHost ? (
                        <button
                            className={styles.startButton + ' neon-border-blue'}
                            onClick={handleStartGame}
                            disabled={players.length < 3}
                        >
                            {players.length < 3
                                ? `Esperando jugadores (mín. 3)`
                                : `🚀 Iniciar Juego`}
                        </button>
                    ) : (
                        <div className={styles.waitingMessage + ' glass'}>
                            ⏳ Esperando a que el host inicie el juego...
                        </div>
                    )}
                </div>

                <div className={styles.infoPanel + ' glass'}>
                    <h4>📋 Reglas del Juego</h4>
                    <ul>
                        <li>Todos los jugadores menos 1 reciben un futbolista</li>
                        <li>El impostor NO tiene futbolista</li>
                        <li>Cada jugador da pistas por turnos</li>
                        <li>Discuten y votan para eliminar al sospechoso</li>
                        <li>El grupo gana si eliminan al impostor</li>
                        <li>El impostor gana si sobrevive</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
