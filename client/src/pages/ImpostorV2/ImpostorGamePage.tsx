import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import AssignmentPhase from '../../components/impostor/AssignmentPhase';
import CluesPhase from '../../components/impostor/CluesPhase';
import DiscussionPhase from '../../components/impostor/DiscussionPhase';
import VotingPhase from '../../components/impostor/VotingPhase';
import ResultPhase from '../../components/impostor/ResultPhase';
import GameEndScreen from '../../components/impostor/GameEndScreen';
import styles from './ImpostorGamePage.module.css';

type GameState = 'IDLE' | 'ASSIGNMENT' | 'CLUES_TURN' | 'DISCUSSION' | 'VOTING' | 'RESULT' | 'GAME_END';

interface GameContext {
    state: GameState;
    players: any[];
    currentRound: number;
    totalRounds: number;
    duration: number;
}

interface PlayerRole {
    footballer: any | null;
    isImpostor: boolean;
}

export default function ImpostorGamePage() {
    const { roomCode } = useParams<{ roomCode: string }>();
    const navigate = useNavigate();
    const { socket } = useSocket();

    const [gameContext, setGameContext] = useState<GameContext | null>(null);
    const [playerRole, setPlayerRole] = useState<PlayerRole | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!socket || !roomCode) return;

        // Listen for state changes
        socket.on('impostor:state-changed', (data) => {
            console.log('State changed:', data);
            setGameContext({
                state: data.state as GameState,
                players: data.context.players || [],
                currentRound: data.context.currentRound || 1,
                totalRounds: data.context.totalRounds || 3,
                duration: data.duration || 0,
            });
            setLoading(false);
        });

        // Listen for role assignment
        socket.on('impostor:role-assigned', (data) => {
            console.log('Role assigned:', data);
            setPlayerRole({
                footballer: data.footballer,
                isImpostor: data.isImpostor,
            });
        });

        // Listen for game end
        socket.on('impostor:game-ended', (data) => {
            console.log('Game ended:', data);
            setGameContext(prev => prev ? { ...prev, state: 'GAME_END' } : null);
        });

        return () => {
            socket.off('impostor:state-changed');
            socket.off('impostor:role-assigned');
            socket.off('impostor:game-ended');
        };
    }, [socket, roomCode]);

    const handleLeaveGame = () => {
        navigate('/impostor-v2/menu');
    };

    if (loading || !gameContext) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loader} />
                <p className="neon-text-blue">Cargando juego...</p>
            </div>
        );
    }

    const renderPhase = () => {
        switch (gameContext.state) {
            case 'ASSIGNMENT':
                return (
                    <AssignmentPhase
                        footballer={playerRole?.footballer}
                        isImpostor={playerRole?.isImpostor || false}
                        duration={gameContext.duration}
                    />
                );

            case 'CLUES_TURN':
                return (
                    <CluesPhase
                        roomCode={roomCode!}
                        players={gameContext.players}
                        currentRound={gameContext.currentRound}
                        totalRounds={gameContext.totalRounds}
                    />
                );

            case 'DISCUSSION':
                return (
                    <DiscussionPhase
                        roomCode={roomCode!}
                        duration={gameContext.duration}
                    />
                );

            case 'VOTING':
                return (
                    <VotingPhase
                        roomCode={roomCode!}
                        players={gameContext.players}
                        duration={gameContext.duration}
                    />
                );

            case 'RESULT':
                return (
                    <ResultPhase />
                );

            case 'GAME_END':
                return (
                    <GameEndScreen
                        onExit={handleLeaveGame}
                    />
                );

            default:
                return <div className="neon-text-blue">Esperando...</div>;
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.background} />

            <div className={styles.header}>
                <div className={styles.roundInfo}>
                    Ronda {gameContext.currentRound} / {gameContext.totalRounds}
                </div>
                <button
                    className={styles.leaveButton}
                    onClick={handleLeaveGame}
                >
                    Salir
                </button>
            </div>

            <div className={styles.gameArea}>
                {renderPhase()}
            </div>
        </div>
    );
}
