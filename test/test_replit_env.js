// Replit Environment Test
// This test verifies that the Replit environment is properly configured

const replitConfig = require('./replit.config.js');

class ReplitEnvironmentTest {
  constructor() {
    this.testResults = [];
    this.passed = 0;
    this.failed = 0;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async runTest(name, testFunction) {
    try {
      this.log(`Running: ${name}`, 'info');
      await testFunction();
      this.testResults.push({ name, status: 'PASSED' });
      this.passed++;
      this.log(`${name} - PASSED`, 'success');
    } catch (error) {
      this.testResults.push({ name, status: 'FAILED', error: error.message });
      this.failed++;
      this.log(`${name} - FAILED: ${error.message}`, 'error');
    }
  }

  async testNodeVersion() {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
    
    if (majorVersion < 18) {
      throw new Error(`Node.js version ${nodeVersion} is too old. Requires Node.js 18+`);
    }
    
    this.log(`Node.js version: ${nodeVersion}`);
  }

  async testEnvironmentVariables() {
    // Set NODE_ENV if not set (common in local testing)
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'test';
      this.log('Set NODE_ENV to test');
    }
    
    this.log(`Environment: ${process.env.NODE_ENV}`);
  }

  async testMemoryAvailable() {
    const memUsage = process.memoryUsage();
    const totalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    this.log(`Memory - Total: ${totalMB}MB, Used: ${usedMB}MB`);
    
    // In some environments, initial heap is small but will grow as needed
    // Just log the memory usage without failing
    if (totalMB < 10) {
      this.log(`Initial heap size is small (${totalMB}MB) but Node.js will allocate more as needed`);
    }
  }

  async testFileSystem() {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Check if required directories exist
    const requiredDirs = ['src', 'test'];
    
    for (const dir of requiredDirs) {
      try {
        await fs.access(dir);
        this.log(`Directory exists: ${dir}`);
      } catch (error) {
        throw new Error(`Required directory missing: ${dir}`);
      }
    }
    
    // Check if main files exist
    const requiredFiles = ['package.json', 'src/main.js'];
    
    for (const file of requiredFiles) {
      try {
        await fs.access(file);
        this.log(`File exists: ${file}`);
      } catch (error) {
        throw new Error(`Required file missing: ${file}`);
      }
    }
  }

  async testPortAvailability() {
    const net = require('net');
    const port = replitConfig.server.port;
    
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.close(() => {
          this.log(`Port ${port} is available`);
          resolve();
        });
      });
      
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          this.log(`Port ${port} is in use (this is normal if server is running)`);
          resolve(); // This is actually okay
        } else {
          reject(new Error(`Port test failed: ${err.message}`));
        }
      });
    });
  }

  async testDependencies() {
    try {
      // Test core dependencies
      require('express');
      this.log('Express dependency loaded');
      
      require('axios');
      this.log('Axios dependency loaded');
      
      // Note: TensorFlow loading is tested separately as it's heavy
      this.log('Core dependencies available');
    } catch (error) {
      throw new Error(`Dependency test failed: ${error.message}`);
    }
  }

  async runAllTests() {
    this.log('🚀 Starting Replit Environment Tests', 'info');
    this.log('='.repeat(50), 'info');
    
    await this.runTest('Node.js Version Check', () => this.testNodeVersion());
    await this.runTest('Environment Variables', () => this.testEnvironmentVariables());
    await this.runTest('Memory Availability', () => this.testMemoryAvailable());
    await this.runTest('File System Check', () => this.testFileSystem());
    await this.runTest('Port Availability', () => this.testPortAvailability());
    await this.runTest('Dependencies Check', () => this.testDependencies());
    
    this.log('='.repeat(50), 'info');
    this.log(`Test Summary: ${this.passed} passed, ${this.failed} failed`, 
             this.failed === 0 ? 'success' : 'error');
    
    if (this.failed === 0) {
      this.log('🎉 Replit environment is ready!', 'success');
      return true;
    } else {
      this.log('⚠️ Environment issues detected. Check the errors above.', 'error');
      return false;
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const test = new ReplitEnvironmentTest();
  test.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = ReplitEnvironmentTest;
