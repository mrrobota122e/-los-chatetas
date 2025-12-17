import QRCode from 'qrcode.react';
import { FC } from 'react';
import { motion } from 'framer-motion';
import { X, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import styles from './QRInvite.module.css';

interface QRInviteProps {
    roomCode: string;
    onClose: () => void;
}

const QRInvite: FC<QRInviteProps> = ({ roomCode, onClose }) => {
    const [copied, setCopied] = useState(false);
    const inviteUrl = `${window.location.origin}/chatetas/lobby/${roomCode}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className={styles.modal}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                onClick={(e) => e.stopPropagation()}
            >
                <button className={styles.closeBtn} onClick={onClose}>
                    <X size={24} />
                </button>

                <h2 className={styles.title}>Invita con QR</h2>
                <p className={styles.subtitle}>Escanea para unirte</p>

                <div className={styles.qrContainer}>
                    <QRCode
                        value={inviteUrl}
                        size={200}
                        level="H"
                        includeMargin={true}
                    />
                </div>

                <div className={styles.codeSection}>
                    <span className={styles.label}>Código de sala:</span>
                    <div className={styles.codeBox}>
                        <span className={styles.code}>{roomCode}</span>
                        <button className={styles.copyBtn} onClick={handleCopy}>
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                            {copied ? 'Copiado' : 'Copiar'}
                        </button>
                    </div>
                </div>

                <div className={styles.urlSection}>
                    <input
                        type="text"
                        value={inviteUrl}
                        readOnly
                        className={styles.urlInput}
                        onClick={(e) => e.currentTarget.select()}
                    />
                </div>
            </motion.div>
        </motion.div>
    );
};

export default QRInvite;
