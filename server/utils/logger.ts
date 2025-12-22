/**
 * Centralized logging utility for Filadex
 * Respects LOG_LEVEL environment variable
 */

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  DEBUG: LogLevel.DEBUG,
  INFO: LogLevel.INFO,
  WARN: LogLevel.WARN,
  ERROR: LogLevel.ERROR,
};

const currentLogLevel: LogLevel =
  LOG_LEVEL_MAP[process.env.LOG_LEVEL?.toUpperCase() || "INFO"] || LogLevel.INFO;

function formatTime(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function shouldLog(level: LogLevel): boolean {
  return level >= currentLogLevel;
}

export const logger = {
  debug: (...args: any[]) => {
    if (shouldLog(LogLevel.DEBUG)) {
      console.log(`[${formatTime()}] [DEBUG]`, ...args);
    }
  },

  info: (...args: any[]) => {
    if (shouldLog(LogLevel.INFO)) {
      console.log(`[${formatTime()}] [INFO]`, ...args);
    }
  },

  warn: (...args: any[]) => {
    if (shouldLog(LogLevel.WARN)) {
      console.warn(`[${formatTime()}] [WARN]`, ...args);
    }
  },

  error: (...args: any[]) => {
    if (shouldLog(LogLevel.ERROR)) {
      console.error(`[${formatTime()}] [ERROR]`, ...args);
    }
  },
};

