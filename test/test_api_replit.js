/**
 * Replit-optimized API Test Suite for TensorFlow.js Agent Service
 * This test suite is specifically designed for the Replit environment
 */

const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');
const replitConfig = require('./replit.config.js');

// Use Replit test configuration
const TEST_PORT = replitConfig.server.port;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const client = axios.create({ 
    baseURL: BASE_URL, 
    timeout: replitConfig.timeouts.api
});

class ReplitAPITester {
    constructor() {
        this.testResults = [];
        this.serverProcess = null;
        this.serverStartedByTest = false;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    async checkServerOrStart() {
        // First check if server is already running on test port
        try {
            await client.get('/', { timeout: 2000 });
            this.log(`Server already running on port ${TEST_PORT}, proceeding with tests`);
            return;
        } catch (error) {
            this.log(`Server not running on port ${TEST_PORT}, starting test server...`);
        }
        
        // Set environment variables for test server
        const env = {
            ...process.env,
            ...replitConfig.environment,
            PORT: TEST_PORT.toString()
        };
        
        // Start the server with test environment
        const serverPath = path.join(__dirname, '..', 'src', 'main.js');
        this.serverProcess = spawn('node', [serverPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            detached: false,
            env: env
        });
        
        this.serverStartedByTest = true;
        
        // Capture server output for debugging
        this.serverProcess.stdout.on('data', (data) => {
            if (replitConfig.replit.enableConsoleOutput) {
                console.log(`[SERVER] ${data.toString().trim()}`);
            }
        });
        
        this.serverProcess.stderr.on('data', (data) => {
            console.error(`[SERVER ERROR] ${data.toString().trim()}`);
        });
        
        // Wait for server to start with proper timeout
        await new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 30; // 30 seconds timeout
            
            const checkServer = async () => {
                attempts++;
                try {
                    const response = await client.get('/', { timeout: 2000 });
                    this.log(`Test server started successfully on port ${TEST_PORT}`, 'success');
                    resolve();
                } catch (error) {
                    if (attempts >= maxAttempts) {
                        reject(new Error(`Server failed to start within ${maxAttempts} seconds. Last error: ${error.message}`));
                    } else {
                        if (attempts % 5 === 0) {
                            this.log(`Waiting for server... attempt ${attempts}/${maxAttempts}`);
                        }
                        setTimeout(checkServer, 1000);
                    }
                }
            };
            
            // Give server 3 seconds before first check (TensorFlow.js takes time to initialize)
            setTimeout(checkServer, 3000);
        });
    }
    
    async cleanup() {
        if (this.serverStartedByTest && this.serverProcess) {
            this.log('Cleaning up test server...');
            
            // Try graceful shutdown first
            this.serverProcess.kill('SIGTERM');
            
            // Wait for graceful shutdown with timeout
            await new Promise(resolve => {
                let resolved = false;
                
                this.serverProcess.on('exit', () => {
                    if (!resolved) {
                        resolved = true;
                        this.log('Test server stopped gracefully', 'success');
                        resolve();
                    }
                });
                
                // Force kill after 5 seconds if graceful shutdown fails
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        if (this.serverProcess && !this.serverProcess.killed) {
                            this.serverProcess.kill('SIGKILL');
                            this.log('Test server force stopped');
                        }
                        resolve();
                    }
                }, 5000);
            });
        }
    }
    
    async runTest(name, testFn) {
        this.log(`Running API test: ${name}`);
        const startTime = Date.now();
        
        try {
            await testFn();
            const duration = Date.now() - startTime;
            this.log(`PASSED: ${name} (${duration}ms)`, 'success');
            this.testResults.push({ name, status: 'PASSED', duration });
        } catch (error) {
            const duration = Date.now() - startTime;
            this.log(`FAILED: ${name} (${duration}ms) - ${error.message}`, 'error');
            this.testResults.push({ name, status: 'FAILED', duration, error: error.message });
        }
    }
    
    // Test: Basic server health check
    async testServerHealth() {
        const response = await client.get('/');
        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }
        
        const data = response.data;
        if (!data.message || !data.status) {
            throw new Error('Response missing required fields (message, status)');
        }
        
        this.log(`Server health check passed - Status: ${data.status}, Agent Ready: ${data.agent_ready}`);
    }
    
    // Test: Agent processing endpoint (using correct /run_task/ endpoint)
    async testAgentProcessing() {
        const testQuery = "Hello, this is a test query";
        
        const response = await client.post('/run_task/', {
            task: testQuery
        });
        
        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }
        
        const data = response.data;
        if (!data.result) {
            throw new Error('Response missing result field');
        }
        
        this.log(`Agent processing test passed - Response: ${data.result.substring(0, 100)}...`);
    }
    
    // Test: Pokemon tool functionality
    async testPokemonTool() {
        const testQuery = "Tell me about Pikachu";
        
        const response = await client.post('/run_task/', {
            task: testQuery
        });
        
        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }
        
        const data = response.data;
        if (!data.result) {
            throw new Error('No result from agent');
        }
        
        // Check if response contains Pokemon-related information
        const responseText = data.result.toLowerCase();
        if (!responseText.includes('pikachu') && !responseText.includes('pokemon')) {
            throw new Error('Response does not contain expected Pokemon information');
        }
        
        this.log(`Pokemon tool test passed - Response contains Pokemon data`);
    }
    
    // Test: Tools info endpoint
    async testToolsInfo() {
        const response = await client.get('/tools/');
        
        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }
        
        const data = response.data;
        if (!data.tools || !Array.isArray(data.tools)) {
            throw new Error('Tools response missing tools array');
        }
        
        this.log(`Tools info test passed - Available tools: ${data.total_tools}`);
    }
    
    // Test: Health endpoint
    async testHealthEndpoint() {
        const response = await client.get('/health/');
        
        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }
        
        const data = response.data;
        if (!data.service || !data.performance_mode) {
            throw new Error('Health response missing required fields');
        }
        
        this.log(`Health endpoint test passed - Service: ${data.service}, Mode: ${data.performance_mode}`);
    }
    
    // Test: Error handling
    async testErrorHandling() {
        try {
            await client.post('/run_task/', {
                // Send invalid data - missing task field
            });
            throw new Error('Expected error for invalid request, but got success');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                this.log('Error handling test passed - Invalid request properly rejected');
                return;
            }
            throw error;
        }
    }
    
    // Test: Response time performance
    async testResponseTime() {
        const startTime = Date.now();
        
        const response = await client.get('/');
        
        const responseTime = Date.now() - startTime;
        const maxResponseTime = replitConfig.performance.responseTime;
        
        if (responseTime > maxResponseTime) {
            throw new Error(`Response time ${responseTime}ms exceeds maximum ${maxResponseTime}ms`);
        }
        
        this.log(`Response time test passed - ${responseTime}ms (limit: ${maxResponseTime}ms)`);
    }
    
    async runAllTests() {
        this.log('🚀 Starting Replit API Tests', 'info');
        this.log(`Test server will run on port ${TEST_PORT}`);
        this.log('='.repeat(50));
        
        try {
            // Start server
            await this.checkServerOrStart();
            
            // Run all API tests
            await this.runTest('Server Health Check', () => this.testServerHealth());
            await this.runTest('Agent Processing', () => this.testAgentProcessing());
            await this.runTest('Pokemon Tool', () => this.testPokemonTool());
            await this.runTest('Tools Info', () => this.testToolsInfo());
            await this.runTest('Health Endpoint', () => this.testHealthEndpoint());
            await this.runTest('Error Handling', () => this.testErrorHandling());
            await this.runTest('Response Time', () => this.testResponseTime());
            
        } catch (error) {
            this.log(`Test execution failed: ${error.message}`, 'error');
            throw error;
        } finally {
            // Always cleanup
            await this.cleanup();
        }
        
        // Print summary
        this.log('='.repeat(50));
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        
        this.log(`API Test Summary: ${passed} passed, ${failed} failed`);
        
        if (failed === 0) {
            this.log('🎉 All API tests passed!', 'success');
        } else {
            this.log(`⚠️ ${failed} API tests failed`, 'error');
            throw new Error(`${failed} API tests failed`);
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new ReplitAPITester();
    tester.runAllTests().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('API tests failed:', error.message);
        process.exit(1);
    });
}

module.exports = ReplitAPITester;
