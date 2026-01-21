type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';

class Logger {
  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private log(level: LogLevel, message: string, data?: any): void {
    const timestamp = this.formatTimestamp();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}`, data || '');
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`, data || '');
        break;
      case 'success':
        console.log(`${prefix} ✓ ${message}`, data || '');
        break;
      case 'debug':
        if (process.env.DEBUG) {
          console.log(`${prefix} ${message}`, data || '');
        }
        break;
      default:
        console.log(`${prefix} ${message}`, data || '');
    }
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: any): void {
    this.log('error', message, error);
  }

  success(message: string, data?: any): void {
    this.log('success', message, data);
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }
}

export const logger = new Logger();
