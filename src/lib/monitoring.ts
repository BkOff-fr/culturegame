interface Metrics {
  activeGames: number
  memoryUsage: NodeJS.MemoryUsage
}

export class PerformanceMonitor {
  private metrics: Metrics

  constructor() {
    this.metrics = {
      activeGames: 0,
      memoryUsage: process.memoryUsage()
    }

    // Update metrics every 30 seconds
    setInterval(() => {
      this.updateMetrics()
    }, 30000)
  }

  private updateMetrics() {
    this.metrics.memoryUsage = process.memoryUsage()
  }

  getMetrics(): Metrics {
    return { ...this.metrics }
  }

  updateActiveGames(count: number) {
    this.metrics.activeGames = count
  }

  trackError(error: Error, context: string) {
    console.error(`[${context}] Error:`, error.message)
  }

  destroy() {
    // Cleanup if needed
  }
}

export const performanceMonitor = new PerformanceMonitor()