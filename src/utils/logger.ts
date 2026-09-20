/**
 * Structured Logging System for AETHERIA
 * Provides typed log levels, module namespacing, formatted browser styling,
 * in-memory telemetry ring-buffer, and structured metadata logging.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface LogEntry {
  timestamp: string;
  level: keyof typeof LogLevel;
  module: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export class Logger {
  private static currentLevel: LogLevel = LogLevel.INFO;
  private static logHistory: LogEntry[] = [];
  private static maxHistorySize: number = 200;

  constructor(private readonly moduleName: string) {}

  public static setLevel(level: LogLevel): void {
    Logger.currentLevel = level;
  }

  public static getLevel(): LogLevel {
    return Logger.currentLevel;
  }

  public static getHistory(): readonly LogEntry[] {
    return Logger.logHistory;
  }

  public static clearHistory(): void {
    Logger.logHistory = [];
  }

  public static create(moduleName: string): Logger {
    return new Logger(moduleName);
  }

  public debug(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, '#8a99ad', metadata);
  }

  public info(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, 'INFO', message, '#00f2fe', metadata);
  }

  public warn(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, 'WARN', message, '#ffaa00', metadata);
  }

  public error(message: string, error?: unknown, metadata?: Record<string, unknown>): void {
    const combinedMeta = {
      ...(metadata ?? {}),
      ...(error instanceof Error
        ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
        : error !== undefined
          ? { error }
          : {})
    };
    this.log(LogLevel.ERROR, 'ERROR', message, '#ff4b4b', combinedMeta);
  }

  private log(
    level: LogLevel,
    levelName: keyof typeof LogLevel,
    message: string,
    color: string,
    metadata?: Record<string, unknown>
  ): void {
    if (level < Logger.currentLevel) return;

    const timestamp = new Date().toISOString();
    const entry: LogEntry = {
      timestamp,
      level: levelName,
      module: this.moduleName,
      message,
      metadata
    };

    Logger.logHistory.push(entry);
    if (Logger.logHistory.length > Logger.maxHistorySize) {
      Logger.logHistory.shift();
    }

    const prefix = `%c[${timestamp.substring(11, 23)}] [${this.moduleName}] [${levelName}]`;
    const style = `color: ${color}; font-weight: bold;`;

    if (level === LogLevel.ERROR) {
      if (metadata && Object.keys(metadata).length > 0) {
        console.error(prefix, style, message, metadata);
      } else {
        console.error(prefix, style, message);
      }
    } else if (level === LogLevel.WARN) {
      if (metadata && Object.keys(metadata).length > 0) {
        console.warn(prefix, style, message, metadata);
      } else {
        console.warn(prefix, style, message);
      }
    } else {
      if (metadata && Object.keys(metadata).length > 0) {
        console.info(prefix, style, message, metadata);
      } else {
        console.info(prefix, style, message);
      }
    }
  }
}
