// Performance monitoring utility for client-side

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoads: [],
      apiCalls: [],
      cacheHits: 0,
      cacheMisses: 0,
    };
  }

  // Track page load performance
  trackPageLoad(pageName) {
    if (typeof window === 'undefined') return;
    
    const perfData = window.performance.getEntriesByType('navigation')[0];
    if (perfData) {
      this.metrics.pageLoads.push({
        page: pageName,
        loadTime: perfData.loadEventEnd - perfData.fetchStart,
        domReady: perfData.domContentLoadedEventEnd - perfData.fetchStart,
        timestamp: Date.now()
      });
    }
  }

  // Track API call performance
  trackApiCall(url, duration, fromCache = false) {
    this.metrics.apiCalls.push({
      url,
      duration,
      fromCache,
      timestamp: Date.now()
    });

    if (fromCache) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
  }

  // Get performance summary
  getSummary() {
    const avgPageLoad = this.metrics.pageLoads.length > 0
      ? this.metrics.pageLoads.reduce((sum, p) => sum + p.loadTime, 0) / this.metrics.pageLoads.length
      : 0;

    const avgApiCall = this.metrics.apiCalls.length > 0
      ? this.metrics.apiCalls.reduce((sum, a) => sum + a.duration, 0) / this.metrics.apiCalls.length
      : 0;

    const cacheHitRate = (this.metrics.cacheHits + this.metrics.cacheMisses) > 0
      ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100).toFixed(2)
      : 0;

    return {
      averagePageLoad: `${avgPageLoad.toFixed(2)}ms`,
      averageApiCall: `${avgApiCall.toFixed(2)}ms`,
      cacheHitRate: `${cacheHitRate}%`,
      totalPageLoads: this.metrics.pageLoads.length,
      totalApiCalls: this.metrics.apiCalls.length,
      cacheHits: this.metrics.cacheHits,
      cacheMisses: this.metrics.cacheMisses
    };
  }

  // Log performance summary to console
  logSummary() {
    const summary = this.getSummary();
    console.group('🚀 Performance Summary');
    console.log('Average Page Load:', summary.averagePageLoad);
    console.log('Average API Call:', summary.averageApiCall);
    console.log('Cache Hit Rate:', summary.cacheHitRate);
    console.log('Total Page Loads:', summary.totalPageLoads);
    console.log('Total API Calls:', summary.totalApiCalls);
    console.groupEnd();
  }

  // Reset metrics
  reset() {
    this.metrics = {
      pageLoads: [],
      apiCalls: [],
      cacheHits: 0,
      cacheMisses: 0,
    };
  }

  // Check if performance is degrading
  checkPerformance() {
    const recentApiCalls = this.metrics.apiCalls.slice(-10);
    const avgRecent = recentApiCalls.length > 0
      ? recentApiCalls.reduce((sum, a) => sum + a.duration, 0) / recentApiCalls.length
      : 0;

    if (avgRecent > 1000) {
      console.warn('⚠️ Performance degradation detected. Average API response time:', avgRecent.toFixed(2), 'ms');
    }
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Auto-log summary every 5 minutes in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    performanceMonitor.logSummary();
    performanceMonitor.checkPerformance();
  }, 5 * 60 * 1000);
}

export default performanceMonitor;
