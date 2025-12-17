import { FC } from 'react';
import {
    FacebookShareButton,
    TwitterShareButton,
    WhatsappShareButton,
    FacebookIcon,
    TwitterIcon,
    WhatsappIcon
} from 'react-share';
import styles from './ShareButtons.module.css';

interface ShareButtonsProps {
    roomCode: string;
    gameTitle?: string;
}

const ShareButtons: FC<ShareButtonsProps> = ({ roomCode, gameTitle = 'Los Chatetas' }) => {
    const shareUrl = `${window.location.origin}/chatetas/lobby/${roomCode}`;
    const shareText = `¡Únete a mi partida de ${gameTitle}! Código: ${roomCode}`;

    return (
        <div className={styles.container}>
            <h4 className={styles.title}>Compartir Sala</h4>
            <div className={styles.buttonsGrid}>
                <FacebookShareButton url={shareUrl} quote={shareText}>
                    <div className={styles.shareBtn}>
                        <FacebookIcon size={40} round />
                        <span>Facebook</span>
                    </div>
                </FacebookShareButton>

                <TwitterShareButton url={shareUrl} title={shareText}>
                    <div className={styles.shareBtn}>
                        <TwitterIcon size={40} round />
                        <span>Twitter</span>
                    </div>
                </TwitterShareButton>

                <WhatsappShareButton url={shareUrl} title={shareText}>
                    <div className={styles.shareBtn}>
                        <WhatsappIcon size={40} round />
                        <span>WhatsApp</span>
                    </div>
                </WhatsappShareButton>
            </div>
        </div>
    );
};

export default ShareButtons;
