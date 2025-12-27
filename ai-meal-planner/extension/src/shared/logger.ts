type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

class Logger {
    private prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    private log(level: LogLevel, message: string, ...args: any[]) {
        const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
        const formattedMessage = `[${timestamp}] [${this.prefix}] [${level}] ${message}`;

        switch (level) {
            case 'DEBUG':
            case 'INFO':
                console.log(formattedMessage, ...args);
                break;
            case 'WARN':
                console.warn(formattedMessage, ...args);
                break;
            case 'ERROR':
                console.error(formattedMessage, ...args);
                break;
        }
    }

    debug(message: string, ...args: any[]) {
        this.log('DEBUG', message, ...args);
    }

    info(message: string, ...args: any[]) {
        this.log('INFO', message, ...args);
    }

    warn(message: string, ...args: any[]) {
        this.log('WARN', message, ...args);
    }

    error(message: string, error?: Error | any) {
        if (error instanceof Error) {
            this.log('ERROR', message, error.message, error.stack);
        } else {
            this.log('ERROR', message, error);
        }
    }
}

export const createLogger = (prefix: string) => new Logger(prefix);
