/**
 * DukaPos SaaS — Centralized Structured Logging Service
 * Generates JSON-formatted logs categorized by scope and level.
 */

import { monitoringService } from './monitoringService';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
export type LogScope = 'AUTH' | 'API' | 'DATABASE' | 'INVENTORY' | 'PAYMENTS' | 'TENANTS' | 'SYNC' | 'SECURITY';

export interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  scope: LogScope;
  message: string;
  tenantId?: string;
  userId?: string;
  correlationId: string;
  metadata?: Record<string, any>;
}

class LoggingService {
  private logBuffer: StructuredLog[] = [];
  private maxBufferSize = 500;

  log(
    level: LogLevel,
    scope: LogScope,
    message: string,
    metadata?: Record<string, any>,
    tenantId?: string,
    userId?: string
  ): StructuredLog {
    const entry: StructuredLog = {
      timestamp: new Date().toISOString(),
      level,
      scope,
      message,
      tenantId,
      userId,
      correlationId: monitoringService.getCorrelationId(),
      metadata
    };

    this.logBuffer.unshift(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.pop();
    }

    if (level === 'ERROR' || level === 'FATAL') {
      console.error(`[${entry.timestamp}] [${level}] [${scope}] ${message}`, metadata || '');
    } else if (level === 'WARN') {
      console.warn(`[${entry.timestamp}] [${level}] [${scope}] ${message}`, metadata || '');
    } else {
      console.log(`[${entry.timestamp}] [${level}] [${scope}] ${message}`, metadata || '');
    }

    return entry;
  }

  info(scope: LogScope, message: string, meta?: Record<string, any>, tId?: string, uId?: string) {
    return this.log('INFO', scope, message, meta, tId, uId);
  }

  warn(scope: LogScope, message: string, meta?: Record<string, any>, tId?: string, uId?: string) {
    return this.log('WARN', scope, message, meta, tId, uId);
  }

  error(scope: LogScope, message: string, meta?: Record<string, any>, tId?: string, uId?: string) {
    return this.log('ERROR', scope, message, meta, tId, uId);
  }

  getRecentLogs(limit: number = 50, filterScope?: LogScope): StructuredLog[] {
    let logs = this.logBuffer;
    if (filterScope) {
      logs = logs.filter(l => l.scope === filterScope);
    }
    return logs.slice(0, limit);
  }
}

export const loggingService = new LoggingService();
