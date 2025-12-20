import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import styles from './ImpostorLobbyPage.module.css';

interface Player {
    id: string;
    name: string;
    isReady: boolean;
    isHost: boolean;
    isBot?: boolean;
}

const BOT_NAMES = ['MbappéBot', 'MessiBot', 'HaalandBot', 'ViniBot', 'BellinghamBot', 'PedriBot', 'SakaBot'];

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

        // Try to join room
        socket.emit('room:join', { roomCode, playerName });

        // Listen for room state
        socket.on('room:joined', (data) => {
            console.log('Room joined:', data);
            setRoomId(data.roomId);
            setPlayers(data.players);
            setIsHost(data.hostId === socket.id);
            setMyPlayerId(socket.id || '');
            setLoading(false);
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

    const handleAddBots = () => {
        if (!socket || !roomId) return;

        const botsNeeded = Math.max(0, 4 - players.length); // At least 4 players
        if (botsNeeded === 0) {
            // Already enough players, add 2 more bots anyway
            socket.emit('room:add-bots', { roomId, count: 2 });
        } else {
            socket.emit('room:add-bots', { roomId, count: botsNeeded });
        }

        // Local optimistic update (will be replaced by server response)
        const availableBots = BOT_NAMES.filter(name => !players.some(p => p.name === name));
        const newBots: Player[] = [];
        for (let i = 0; i < botsNeeded && i < availableBots.length; i++) {
            newBots.push({
                id: `bot-${Date.now()}-${i}`,
                name: availableBots[i],
                isReady: true,
                isHost: false,
                isBot: true
            });
        }
        if (newBots.length > 0) {
            setPlayers(prev => [...prev, ...newBots]);
        }
    };

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
                <p>Cargando sala...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.background} />

            <div className={styles.header}>
                <div className={styles.roomInfo}>
                    <h2 className={styles.roomCode}>
                        Sala: <span>{roomCode}</span>
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
                    <h3 className={styles.sectionTitle}>
                        👥 Jugadores en la sala
                    </h3>
                    <div className={styles.playersList}>
                        {players.map((player) => (
                            <div
                                key={player.id}
                                className={`${styles.playerCard} ${player.id === myPlayerId ? styles.me : ''} ${player.isBot ? styles.bot : ''}`}
                            >
                                <div className={styles.playerAvatar} />
                                <div className={styles.playerInfo}>
                                    <div className={styles.playerName}>
                                        {player.name}
                                        {player.id === myPlayerId && ' (Tú)'}
                                        {player.isBot && ' 🤖'}
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
                    {isHost && (
                        <>
                            <button
                                className={styles.botButton}
                                onClick={handleAddBots}
                                disabled={players.length >= 8}
                            >
                                🤖 Añadir Bots
                            </button>
                            <button
                                className={styles.startButton}
                                onClick={handleStartGame}
                                disabled={players.length < 3}
                            >
                                {players.length < 3
                                    ? `Esperando jugadores (${players.length}/3)`
                                    : `🚀 Iniciar Juego`}
                            </button>
                        </>
                    )}
                    {!isHost && (
                        <div className={styles.waitingMessage}>
                            ⏳ Esperando a que el host inicie el juego...
                        </div>
                    )}
                </div>

                <div className={styles.infoPanel}>
                    <h4>📋 Reglas del Juego</h4>
                    <ul>
                        <li>Todos reciben un futbolista menos el impostor</li>
                        <li>Da pistas sobre tu futbolista por turnos</li>
                        <li>Debate y descubre quién es el impostor</li>
                        <li>Vota para eliminar al sospechoso</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
