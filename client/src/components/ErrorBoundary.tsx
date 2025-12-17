import { Component, ReactNode, ErrorInfo } from 'react';
import styles from './ErrorBoundary.module.css';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught error:', error, errorInfo);
        // TODO: Send to error tracking service (Sentry)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className={styles.container}>
                    <div className={styles.content}>
                        <h1 className={styles.title}>😢 Algo salió mal</h1>
                        <p className={styles.message}>
                            Lo sentimos, ocurrió un error inesperado.
                        </p>
                        <button
                            className={styles.button}
                            onClick={() => window.location.reload()}
                        >
                            Recargar Página
                        </button>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className={styles.details}>
                                <summary>Detalles del error</summary>
                                <pre>{this.state.error.toString()}</pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
