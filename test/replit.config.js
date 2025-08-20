// Replit Test Configuration
// This file contains Replit-specific test settings

module.exports = {
  // Test environment settings for Replit
  environment: {
    NODE_ENV: 'test',
    PORT: 3001,
    TEST_MODE: true,
    LOG_LEVEL: 'debug',
    PERFORMANCE_MODE: 'balanced',
    CACHE_TTL: 300,
    LOG_TO_FILE: false
  },
  
  // Test timeouts (Replit can be slower)
  timeouts: {
    unit: 10000,       // 10 seconds for unit tests
    integration: 30000, // 30 seconds for integration tests
    api: 20000,        // 20 seconds for API tests
    performance: 60000  // 60 seconds for performance tests
  },
  
  // Test server configuration
  server: {
    port: 3001,
    host: '0.0.0.0',
    timeout: 30000
  },
  
  // Performance test thresholds (adjusted for Replit)
  performance: {
    responseTime: 2000,     // 2 seconds max response time
    throughput: 10,         // 10 requests per second minimum
    memoryUsage: 200        // 200MB max memory usage
  },
  
  // Security test settings
  security: {
    maxPayloadSize: '10mb',
    rateLimitWindow: 900000, // 15 minutes
    rateLimitMax: 100        // 100 requests per window
  },
  
  // Replit-specific settings
  replit: {
    enableConsoleOutput: true,
    colorOutput: true,
    detailedErrors: true,
    skipSlowTests: false
  }
};
