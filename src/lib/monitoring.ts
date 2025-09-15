import { performance } from 'perf_hooks'

interface Metrics {
  connections: number
  activeGames: number
  messagesPerSecond: number
  avgResponseTime: number
  errorRate: number
  dbQueryCount: number
  redisOperations: number
  memoryUsage: NodeJS.MemoryUsage
}

interface ErrorLog {
  timestamp: Date
  error: string
  context: string
  userId?: string
  stackTrace?: string
  metadata?: any
}

interface PerformanceLog {
  timestamp: Date
  operation: string
  duration: number
  success: boolean
  metadata?: any
}

export class PerformanceMonitor {
  private metrics: Metrics
  private messageCount = 0
  private errorCount = 0
  private dbQueryCount = 0
  private redisOpCount = 0
  private responseTimes: number[] = []
  private errorLogs: ErrorLog[] = []
  private performanceLogs: PerformanceLog[] = []
  private metricInterval: NodeJS.Timeout
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    this.metrics = {
      connections: 0,
      activeGames: 0,
      messagesPerSecond: 0,
      avgResponseTime: 0,
      errorRate: 0,
      dbQueryCount: 0,
      redisOperations: 0,
      memoryUsage: process.memoryUsage()
    }

    // Update metrics every minute
    this.metricInterval = setInterval(() => this.updateMetrics(), 60000)

    // Cleanup old logs every hour
    this.cleanupInterval = setInterval(() => this.cleanupLogs(), 3600000)
  }

  trackConnection(increment = true): void {
    this.metrics.connections += increment ? 1 : -1
  }

  trackMessage(): void {
    this.messageCount++
  }

  trackError(error: Error, context: string, userId?: string, metadata?: any): void {
    this.errorCount++

    const errorLog: ErrorLog = {
      timestamp: new Date(),
      error: error.message,
      context,
      userId,
      stackTrace: error.stack,
      metadata
    }

    this.errorLogs.push(errorLog)

    // Log critical errors immediately
    if (this.isCriticalError(error, context)) {
      console.error('🚨 CRITICAL ERROR:', errorLog)
      // Could send to external monitoring service
    }
  }

  trackResponseTime(duration: number): void {
    this.responseTimes.push(duration)
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000) // Keep last 1000
    }
  }

  trackDatabaseQuery(): void {
    this.dbQueryCount++
  }

  trackRedisOperation(): void {
    this.redisOpCount++
  }

  trackPerformance(operation: string, duration: number, success: boolean, metadata?: any): void {
    const log: PerformanceLog = {
      timestamp: new Date(),
      operation,
      duration,
      success,
      metadata
    }

    this.performanceLogs.push(log)

    // Log slow operations
    if (duration > 1000) { // More than 1 second
      console.warn(`🐌 Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`)
    }
  }

  startTimer(operation: string): () => void {
    const start = performance.now()

    return (success = true, metadata?: any) => {
      const duration = performance.now() - start
      this.trackResponseTime(duration)
      this.trackPerformance(operation, duration, success, metadata)
    }
  }

  private updateMetrics(): void {
    // Calculate averages
    if (this.responseTimes.length > 0) {
      this.metrics.avgResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
    }

    this.metrics.messagesPerSecond = this.messageCount / 60 // Per minute to per second
    this.metrics.errorRate = this.errorCount / 60
    this.metrics.dbQueryCount = this.dbQueryCount
    this.metrics.redisOperations = this.redisOpCount
    this.metrics.memoryUsage = process.memoryUsage()

    // Log comprehensive metrics
    this.logMetrics()

    // Reset counters
    this.messageCount = 0
    this.errorCount = 0
    this.dbQueryCount = 0
    this.redisOpCount = 0
  }

  private logMetrics(): void {
    const memUsageMB = {
      rss: Math.round(this.metrics.memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(this.metrics.memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(this.metrics.memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(this.metrics.memoryUsage.external / 1024 / 1024)
    }

    console.log('📊 Performance Metrics:', {
      connections: this.metrics.connections,
      activeGames: this.metrics.activeGames,
      messagesPerSecond: this.metrics.messagesPerSecond.toFixed(2),
      avgResponseTime: `${this.metrics.avgResponseTime.toFixed(2)}ms`,
      errorRate: this.metrics.errorRate.toFixed(2),
      dbQueries: this.metrics.dbQueryCount,
      redisOps: this.metrics.redisOperations,
      memory: memUsageMB,
      uptime: `${Math.round(process.uptime() / 60)}min`
    })

    // Alert on high error rates
    if (this.metrics.errorRate > 10) {
      console.error('🚨 HIGH ERROR RATE DETECTED:', this.metrics.errorRate, 'errors/min')
    }

    // Alert on high memory usage
    if (memUsageMB.heapUsed > 512) {
      console.warn('⚠️ HIGH MEMORY USAGE:', memUsageMB.heapUsed, 'MB')
    }

    // Alert on slow average response time
    if (this.metrics.avgResponseTime > 500) {
      console.warn('⚠️ SLOW RESPONSE TIME:', this.metrics.avgResponseTime.toFixed(2), 'ms')
    }
  }

  private cleanupLogs(): void {
    const oneHourAgo = new Date(Date.now() - 3600000)

    // Keep only recent error logs
    this.errorLogs = this.errorLogs.filter(log => log.timestamp > oneHourAgo)

    // Keep only recent performance logs
    this.performanceLogs = this.performanceLogs.filter(log => log.timestamp > oneHourAgo)

    console.log('🧹 Cleaned up old monitoring logs')
  }

  private isCriticalError(error: Error, context: string): boolean {
    const criticalContexts = ['database', 'authentication', 'payment', 'security']
    const criticalErrorTypes = ['ECONNRESET', 'ENOTFOUND', 'TIMEOUT']

    return criticalContexts.some(ctx => context.toLowerCase().includes(ctx)) ||
           criticalErrorTypes.some(type => error.message.includes(type)) ||
           error.name === 'SecurityError'
  }

  getMetrics(): Metrics {
    return { ...this.metrics }
  }

  getRecentErrors(minutes = 60): ErrorLog[] {
    const cutoff = new Date(Date.now() - minutes * 60000)
    return this.errorLogs.filter(log => log.timestamp > cutoff)
  }

  getPerformanceReport(minutes = 60): {
    slowOperations: PerformanceLog[]
    failedOperations: PerformanceLog[]
    averageTimes: Record<string, number>
  } {
    const cutoff = new Date(Date.now() - minutes * 60000)
    const recentLogs = this.performanceLogs.filter(log => log.timestamp > cutoff)

    const slowOperations = recentLogs.filter(log => log.duration > 1000)
    const failedOperations = recentLogs.filter(log => !log.success)

    // Calculate average times by operation
    const operationTimes: Record<string, number[]> = {}
    recentLogs.forEach(log => {
      if (!operationTimes[log.operation]) {
        operationTimes[log.operation] = []
      }
      operationTimes[log.operation].push(log.duration)
    })

    const averageTimes: Record<string, number> = {}
    Object.entries(operationTimes).forEach(([operation, times]) => {
      averageTimes[operation] = times.reduce((a, b) => a + b, 0) / times.length
    })

    return {
      slowOperations,
      failedOperations,
      averageTimes
    }
  }

  destroy(): void {
    if (this.metricInterval) {
      clearInterval(this.metricInterval)
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }
}

export class ErrorHandler {
  constructor(private monitor: PerformanceMonitor) {}

  handleSocketError(socket: any, error: Error, context: string, metadata?: any): void {
    this.monitor.trackError(error, context, socket.userId, metadata)

    console.error(`Socket error in ${context}:`, {
      error: error.message,
      userId: socket.userId,
      username: socket.user?.username,
      socketId: socket.id,
      metadata
    })

    socket.emit('error', {
      message: this.getSafeErrorMessage(error),
      context,
      timestamp: Date.now(),
      requestId: this.generateRequestId()
    })
  }

  handleDatabaseError(error: Error, context: string, metadata?: any): void {
    this.monitor.trackError(error, `database-${context}`, undefined, metadata)

    console.error(`Database error in ${context}:`, {
      error: error.message,
      stack: error.stack,
      metadata
    })
  }

  handleRedisError(error: Error, context: string, metadata?: any): void {
    this.monitor.trackError(error, `redis-${context}`, undefined, metadata)

    // Redis errors are often non-fatal, just log warning
    console.warn(`Redis error in ${context}:`, {
      error: error.message,
      metadata
    })
  }

  handleApiError(req: any, res: any, error: Error, context: string): void {
    this.monitor.trackError(error, `api-${context}`, req.user?.id, {
      url: req.url,
      method: req.method,
      userAgent: req.headers['user-agent']
    })

    console.error(`API error in ${context}:`, {
      error: error.message,
      url: req.url,
      method: req.method,
      userId: req.user?.id
    })

    if (!res.headersSent) {
      res.status(500).json({
        error: this.getSafeErrorMessage(error),
        context,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      })
    }
  }

  private getSafeErrorMessage(error: Error): string {
    // Don't expose internal error details in production
    if (process.env.NODE_ENV === 'production') {
      return 'Une erreur interne est survenue'
    }
    return error.message
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Singleton instances
export const performanceMonitor = new PerformanceMonitor()
export const errorHandler = new ErrorHandler(performanceMonitor)

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('📊 Saving final metrics before shutdown...')
  performanceMonitor.destroy()
})

process.on('SIGINT', () => {
  console.log('📊 Saving final metrics before shutdown...')
  performanceMonitor.destroy()
})

// Global error handlers
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  performanceMonitor.trackError(
    reason instanceof Error ? reason : new Error(String(reason)),
    'unhandled-rejection'
  )
})

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error)
  performanceMonitor.trackError(error, 'uncaught-exception')
  // Don't exit immediately, let the application try to recover
})

export default { performanceMonitor, errorHandler }