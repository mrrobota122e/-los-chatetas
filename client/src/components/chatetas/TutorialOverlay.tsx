import { FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, HelpCircle } from 'lucide-react';
import styles from './TutorialOverlay.module.css';

interface TutorialStep {
    title: string;
    description: string;
    image?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
    {
        title: '¡Bienvenido a Los Chatetas!',
        description: 'Un jugador es el IMPOSTOR que no conoce la palabra secreta. ¡Todos deben dar pistas para descubrirlo!'
    },
    {
        title: 'Fase de Pistas',
        description: 'Por turnos, cada jugador da una pista sobre la palabra. El impostor debe hacer inferir que la conoce sin decir la palabra exacta.'
    },
    {
        title: 'Discusión',
        description: 'Hablen entre todos para decidir quién parece sospechoso. El chat es tu aliado para debatir.'
    },
    {
        title: 'Votación',
        description: 'Haz clic en un jugador para votar por él. El más votado será eliminado. ¡Elige con cuidado!'
    },
    {
        title: 'Victoria',
        description: 'Los INOCENTES ganan si eliminan al impostor. El IMPOSTOR gana si sobrevive 5 rondas o si quedan solo 2 jugadores.'
    }
];

const TutorialOverlay: FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = () => {
        if (currentStep < TUTORIAL_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            setIsOpen(false);
            setCurrentStep(0);
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    return (
        <>
            {/* Tutorial Floating Button */}
            <button
                className={styles.floatingBtn}
                onClick={() => setIsOpen(true)}
            >
                <HelpCircle size={24} />
            </button>

            {/* Tutorial Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className={styles.overlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className={styles.modal}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: 'spring', damping: 20 }}
                        >
                            {/* Close Button */}
                            <button
                                className={styles.closeBtn}
                                onClick={() => setIsOpen(false)}
                            >
                                <X size={24} />
                            </button>

                            {/* Step Content */}
                            <div className={styles.content}>
                                <div className={styles.stepIndicator}>
                                    Paso {currentStep + 1} de {TUTORIAL_STEPS.length}
                                </div>

                                <h2 className={styles.title}>
                                    {TUTORIAL_STEPS[currentStep].title}
                                </h2>

                                <p className={styles.description}>
                                    {TUTORIAL_STEPS[currentStep].description}
                                </p>

                                {/* Progress Dots */}
                                <div className={styles.dots}>
                                    {TUTORIAL_STEPS.map((_, index) => (
                                        <div
                                            key={index}
                                            className={`${styles.dot} ${index === currentStep ? styles.active : ''}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Navigation */}
                            <div className={styles.navigation}>
                                <button
                                    className={styles.navBtn}
                                    onClick={handlePrev}
                                    disabled={currentStep === 0}
                                >
                                    <ArrowLeft size={20} />
                                    Anterior
                                </button>

                                <button
                                    className={`${styles.navBtn} ${styles.primary}`}
                                    onClick={handleNext}
                                >
                                    {currentStep === TUTORIAL_STEPS.length - 1 ? '¡Entendido!' : 'Siguiente'}
                                    {currentStep < TUTORIAL_STEPS.length - 1 && <ArrowRight size={20} />}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default TutorialOverlay;
