type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private minLevel: LogLevel = 'info';

  private prefix: string;

  constructor(prefix: string, minLevel?: LogLevel) {
    this.prefix = prefix;
    if (minLevel) this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.minLevel];
  }

  debug(...args: unknown[]): void {
    if (this.shouldLog('debug')) console.debug(`[${this.prefix}]`, ...args);
  }

  info(...args: unknown[]): void {
    if (this.shouldLog('info')) console.info(`[${this.prefix}]`, ...args);
  }

  warn(...args: unknown[]): void {
    if (this.shouldLog('warn')) console.warn(`[${this.prefix}]`, ...args);
  }

  error(...args: unknown[]): void {
    if (this.shouldLog('error')) console.error(`[${this.prefix}]`, ...args);
  }

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}
