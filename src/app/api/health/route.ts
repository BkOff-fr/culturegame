import { NextRequest, NextResponse } from 'next/server'
import { prisma, checkDatabaseConnection } from '@/lib/db'
import { performanceMonitor } from '@/lib/monitoring'

export async function GET(request: NextRequest) {
  const startTime = performance.now()

  try {
    // Basic health checks
    const checks = {
      database: false,
      redis: false,
      memory: true,
      uptime: process.uptime()
    }

    // Check database connection
    try {
      checks.database = await checkDatabaseConnection()
    } catch (error) {
      console.error('Database health check failed:', error)
      checks.database = false
    }

    // Check Redis connection (if available)
    try {
      // This would be imported from Redis client if available
      checks.redis = true // Placeholder
    } catch (error) {
      checks.redis = false
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage()
    const memoryUsageMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    }

    // Memory threshold check (alert if using more than 1GB)
    checks.memory = memoryUsageMB.heapUsed < 1024

    // Get performance metrics
    let metrics = {}
    try {
      metrics = performanceMonitor.getMetrics()
    } catch (error) {
      console.error('Failed to get performance metrics:', error)
    }

    // Calculate response time
    const responseTime = performance.now() - startTime

    // Determine overall health status
    const isHealthy = checks.database && checks.memory
    const status = isHealthy ? 'healthy' : 'unhealthy'
    const httpStatus = isHealthy ? 200 : 503

    const healthData = {
      status,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime.toFixed(2)}ms`,
      uptime: `${Math.round(checks.uptime / 60)}min`,
      checks,
      memory: memoryUsageMB,
      metrics,
      version: process.env.npm_package_version || 'unknown',
      environment: process.env.NODE_ENV || 'unknown',
      node: process.version
    }

    return NextResponse.json(healthData, { status: httpStatus })

  } catch (error) {
    console.error('Health check error:', error)

    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      responseTime: `${(performance.now() - startTime).toFixed(2)}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      uptime: `${Math.round(process.uptime() / 60)}min`
    }, { status: 500 })
  }
}