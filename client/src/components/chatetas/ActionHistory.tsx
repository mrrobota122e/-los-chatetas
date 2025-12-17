import { FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, MessageSquare, Users, Vote } from 'lucide-react';
import styles from './ActionHistory.module.css';

interface Action {
    id: string;
    timestamp: number;
    type: 'clue' | 'chat' | 'vote' | 'elimination' | 'phase';
    player?: string;
    content: string;
    icon: 'clock' | 'message' | 'users' | 'vote';
}

interface ActionHistoryProps {
    actions: Action[];
}

const ActionHistory: FC<ActionHistoryProps> = ({ actions }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const getIcon = (iconType: string) => {
        switch (iconType) {
            case 'clock': return <Clock size={16} />;
            case 'message': return <MessageSquare size={16} />;
            case 'users': return <Users size={16} />;
            case 'vote': return <Vote size={16} />;
            default: return <Clock size={16} />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'clue': return '#00d9ff';
            case 'chat': return '#7b2ff7';
            case 'vote': return '#ff3d71';
            case 'elimination': return '#ffa726';
            case 'phase': return '#00e676';
            default: return '#fff';
        }
    };

    return (
        <div className={styles.container}>
            <button
                className={styles.toggleBtn}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <span>📜 Historial de Acciones ({actions.length})</span>
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        className={styles.historyList}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {actions.slice(-20).reverse().map(action => (
                            <div
                                key={action.id}
                                className={styles.actionItem}
                                style={{ borderLeftColor: getTypeColor(action.type) }}
                            >
                                <div className={styles.icon} style={{ color: getTypeColor(action.type) }}>
                                    {getIcon(action.icon)}
                                </div>
                                <div className={styles.content}>
                                    {action.player && (
                                        <span className={styles.player}>{action.player}</span>
                                    )}
                                    <span className={styles.text}>{action.content}</span>
                                </div>
                                <div className={styles.timestamp}>
                                    {new Date(action.timestamp).toLocaleTimeString('es', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ActionHistory;
