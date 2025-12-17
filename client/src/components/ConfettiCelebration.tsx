import { FC, useState, useEffect } from 'react';
import Confetti from 'react-confetti';

interface ConfettiCelebrationProps {
    trigger: boolean;
    duration?: number;
}

/**
 * Confetti Celebration Component
 * Displays confetti animation when all players have voted or game is won
 */
const ConfettiCelebration: FC<ConfettiCelebrationProps> = ({ trigger, duration = 5000 }) => {
    const [show, setShow] = useState(false);
    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (trigger) {
            setShow(true);
            const timer = setTimeout(() => {
                setShow(false);
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [trigger, duration]);

    if (!show) return null;

    return (
        <Confetti
            width={windowSize.width}
            height={windowSize.height}
            numberOfPieces={200}
            recycle={false}
            colors={['#00d9ff', '#7b2ff7', '#ffa726', '#00e676', '#ff3d71']}
            gravity={0.3}
        />
    );
};

export default ConfettiCelebration;
