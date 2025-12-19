import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import styles from './DiscussionPhase.module.css';

interface DiscussionPhaseProps {
    roomCode: string;
    duration: number;
}

interface Message {
    playerId: string;
    playerName: string;
    message: string;
    timestamp: number;
}

export default function DiscussionPhase({ roomCode, duration }: DiscussionPhaseProps) {
    const { socket } = useSocket();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [timeLeft, setTimeLeft] = useState(Math.floor(duration / 1000));
    const [canChat, setCanChat] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!socket) return;

        socket.on('chat:new-message', (data) => {
            if (data.type === 'discussion' || !data.type) {
                setMessages(prev => [...prev, {
                    playerId: data.playerId,
                    playerName: data.playerName,
                    message: data.message,
                    timestamp: data.timestamp
                }]);
            }
        });

        socket.on('impostor:chat-locked', () => {
            setCanChat(false);
        });

        socket.on('impostor:chat-unlocked', (data) => {
            if (data.chatType === 'discussion') {
                setCanChat(true);
            }
        });

        return () => {
            socket.off('chat:new-message');
            socket.off('impostor:chat-locked');
            socket.off('impostor:chat-unlocked');
        };
    }, [socket]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = () => {
        if (!socket || !newMessage.trim() || !canChat) return;

        socket.emit('impostor:chat-message', {
            roomCode,
            message: newMessage.trim()
        });

        setNewMessage('');
    };

    return (
        <div className={styles.container}>
            <div className={styles.header + ' glass-strong'}>
                <h2 className={styles.title}>💬 Discusión Abierta</h2>
                <div className={styles.timer + (timeLeft <= 30 ? ' ' + styles.timerWarning : '')}>
                    ⏱️ {timeLeft}s
                </div>
            </div>

            <div className={styles.chatContainer + ' glass'}>
                <div className={styles.messagesList}>
                    {messages.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>💬 El chat está abierto. ¡Comienza la discusión!</p>
                        </div>
                    ) : (
                        messages.map((msg, index) => (
                            <div key={index} className={styles.message}>
                                <div className={styles.messageHeader}>
                                    <span className={styles.messageName}>{msg.playerName}</span>
                                    <span className={styles.messageTime}>
                                        {new Date(msg.timestamp).toLocaleTimeString('es-ES', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit'
                                        })}
                                    </span>
                                </div>
                                <div className={styles.messageText}>{msg.message}</div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className={styles.inputContainer}>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder={canChat ? "Escribe tu mensaje..." : "Chat bloqueado"}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        maxLength={200}
                        disabled={!canChat}
                    />
                    <button
                        className={styles.sendButton}
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || !canChat}
                    >
                        Enviar
                    </button>
                </div>
            </div>

            <div className={styles.hint + ' glass'}>
                💡 Discute las pistas y trata de identificar al impostor antes de que termine el tiempo
            </div>
        </div>
    );
}
