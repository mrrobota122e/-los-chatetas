import { ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps {
    children: ReactNode;
    className?: string;
    variant?: 'default' | 'glass';
    onClick?: () => void;
}

export default function Card({ children, className = '', variant = 'default', onClick }: CardProps) {
    const classes = [
        styles.card,
        styles[variant],
        onClick && styles.clickable,
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={classes} onClick={onClick}>
            {children}
        </div>
    );
}
