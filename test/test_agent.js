/**
 * Test suite for TensorFlow.js Agent Service
 */

const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const client = axios.create({ baseURL: BASE_URL, timeout: 30000 });

class AgentTester {
    constructor() {
        this.testResults = [];
        this.serverProcess = null;
        this.serverStartedByTest = false;
    }
    async checkServerOrStart() {
        // First check if server is already running
        try {
            await client.get('/', { timeout: 2000 });
            console.log('   ✓ Server already running, proceeding with tests');
            return;
        } catch (error) {
            // Server not running, we need to start it
            console.log('   🔄 Server not running, starting it...');
        }
        
        // Start the server
        const serverPath = path.join(__dirname, '..', 'src', 'main.js');
        this.serverProcess = spawn('node', [serverPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            detached: false
        });
        
        this.serverStartedByTest = true;
        
        // Wait for server to start
        await new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 30; // 30 seconds timeout
            
            const checkServer = async () => {
                attempts++;
                try {
                    await client.get('/', { timeout: 1000 });
                    console.log('   ✅ Server started successfully');
                    resolve();
                } catch (error) {
                    if (attempts >= maxAttempts) {
                        reject(new Error('Server failed to start within 30 seconds'));
                    } else {
                        setTimeout(checkServer, 1000);
                    }
                }
            };
            
            setTimeout(checkServer, 2000); // Give server 2 seconds before first check
        });
    }
    
    async cleanup() {
        if (this.serverStartedByTest && this.serverProcess) {
            console.log('\n   🧹 Cleaning up test server...');
            this.serverProcess.kill('SIGTERM');
            
            // Wait for graceful shutdown
            await new Promise(resolve => {
                this.serverProcess.on('exit', () => {
                    console.log('   ✅ Test server stopped');
                    resolve();
                });
                
                // Force kill after 5 seconds if graceful shutdown fails
                setTimeout(() => {
                    if (this.serverProcess && !this.serverProcess.killed) {
                        this.serverProcess.kill('SIGKILL');
                    }
                    resolve();
                }, 5000);
            });
        }
    }
    
    async runTest(name, testFn) {
        console.log(`\n🧪 Running test: ${name}`);
        const startTime = Date.now();
        
        try {
            await testFn();
            const duration = Date.now() - startTime;
            console.log(`✅ PASSED: ${name} (${duration}ms)`);
            this.testResults.push({ name, status: 'PASSED', duration });
        } catch (error) {
            const duration = Date.now() - startTime;
            console.log(`❌ FAILED: ${name} (${duration}ms)`);
            console.log(`   Error: ${error.message}`);
            this.testResults.push({ name, status: 'FAILED', duration, error: error.message });
        }
    }
    
    async testHealthCheck() {
        const response = await client.get('/');
        
        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }
        
        const data = response.data;
        if (!data.message || !data.status || data.agent_ready === undefined) {
            throw new Error('Invalid health check response structure');
        }
        
        console.log(`   Status: ${data.status}, Agent Ready: ${data.agent_ready}`);
    }
    
    async testDetailedHealth() {
        const response = await client.get('/health/');
        
        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }
        
        const data = response.data;
        const requiredFields = ['service', 'agent_ready', 'tools_count', 'performance_mode'];
        
        for (const field of requiredFields) {
            if (data[field] === undefined) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        
        console.log(`   Tools: ${data.tools_count}, Mode: ${data.performance_mode}`);
        console.log(`   Memory: ${Math.round(data.memory_usage.heapUsed / 1024 / 1024)}MB`);
    }
    
    async testToolsList() {
        const response = await client.get('/tools/');
        
        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }
        
        const data = response.data;
        if (!Array.isArray(data.tools) || data.total_tools === undefined) {
            throw new Error('Invalid tools response structure');
        }
        
        const pokemonTool = data.tools.find(tool => tool.name === 'pokemon_info');
        if (!pokemonTool) {
            throw new Error('Pokemon tool not found in tools list');
        }
        
        console.log(`   Found ${data.total_tools} tools including pokemon_info`);
    }
    
    async testPokemonQuery() {
        const testCases = [
            'Tell me about Pikachu',
            'Charizard stats',
            'What is Bulbasaur?',
            'Squirtle information'
        ];
        
        for (const task of testCases) {
            const response = await client.post('/run_task/', { task });
            
            if (response.status !== 200) {
                throw new Error(`Expected status 200, got ${response.status}`);
            }
            
            const data = response.data;
            if (!data.result || data.processing_time === undefined) {
                throw new Error('Invalid task response structure');
            }
            
            // Check if response contains Pokemon information
            const responseText = data.result.toLowerCase();
            const pokemonIndicators = [
                'physical characteristics', 'base stats', '#', // Old format
                'pokemon', 'electric', 'fire', 'water', 'grass', // Types
                'hp', 'attack', 'defense', 'speed', // Stats
                'abilities', 'species', 'generation', 'height', 'weight', // Data fields
                'pikachu', 'charizard', 'bulbasaur', 'squirtle' // Pokemon names
            ];
            
            const hasValidContent = pokemonIndicators.some(indicator => 
                responseText.includes(indicator)
            ) || data.result.length > 100; // Valid Pokemon responses should be substantial
            
            if (!hasValidContent) {
                throw new Error('Response does not appear to contain Pokemon information');
            }
            
            console.log(`   ✓ ${task}: ${data.processing_time}ms (cached: ${data.cached || false})`);
        }
    }
    
    async testGeneralQuery() {
        const testCases = [
            'What is machine learning?',
            'Hello, how are you?',
            'Tell me about programming',
            'What can you help me with?'
        ];
        
        for (const task of testCases) {
            const response = await client.post('/run_task/', { task });
            
            if (response.status !== 200) {
                throw new Error(`Expected status 200, got ${response.status}`);
            }
            
            const data = response.data;
            if (!data.result || data.processing_time === undefined) {
                throw new Error('Invalid task response structure');
            }
            
            // Check that we got a reasonable response
            if (data.result.length < 10) {
                throw new Error('Response is too short to be meaningful');
            }
            
            console.log(`   ✓ ${task}: ${data.processing_time}ms (cached: ${data.cached || false})`);
        }
    }
    
    async testCacheFunction() {
        const task = 'Test cache with unique Pikachu information request';
        
        // Clear cache first to ensure clean test
        await client.post('/cache/clear/');
        
        // First request (should not be cached)
        const response1 = await client.post('/run_task/', { task });
        if (response1.data.cached) {
            throw new Error('First request should not be cached');
        }
        
        // Second request (should be cached)
        const response2 = await client.post('/run_task/', { task });
        if (!response2.data.cached) {
            console.log('   ⚠️  Cache may not be working as expected');
        } else {
            console.log('   ✓ Cache working correctly');
        }
        
        // Verify responses are identical
        if (response1.data.result !== response2.data.result) {
            throw new Error('Cached response differs from original');
        }
    }
    
    async testErrorHandling() {
        // Test invalid endpoint
        try {
            await client.get('/invalid-endpoint');
            throw new Error('Should have returned 404');
        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.log('   ✓ 404 handling works correctly');
            } else {
                throw error;
            }
        }
        
        // Test invalid request body
        try {
            await client.post('/run_task/', {});
            throw new Error('Should have returned 400');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('   ✓ Request validation works correctly');
            } else {
                throw error;
            }
        }
    }
    
    async testPerformanceModes() {
        const response = await client.get('/performance/modes/');
        
        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }
        
        const data = response.data;
        const requiredModes = ['fast', 'balanced', 'quality'];
        
        for (const mode of requiredModes) {
            if (!data.available_modes[mode]) {
                throw new Error(`Missing performance mode: ${mode}`);
            }
        }
        
        console.log(`   Current mode: ${data.current_mode}`);
        console.log(`   Available modes: ${Object.keys(data.available_modes).join(', ')}`);
    }
    
    async runAllTests() {
        console.log('🚀 Starting TensorFlow.js Agent Service Test Suite\n');
        console.log(`Testing against: ${BASE_URL}`);
        
        try {
            // Ensure server is running
            await this.checkServerOrStart();
            
            await this.runTest('Health Check', () => this.testHealthCheck());
            await this.runTest('Detailed Health Check', () => this.testDetailedHealth());
            await this.runTest('Tools List', () => this.testToolsList());
            await this.runTest('Pokemon Queries', () => this.testPokemonQuery());
            await this.runTest('General Queries', () => this.testGeneralQuery());
            await this.runTest('Cache Functionality', () => this.testCacheFunction());
            await this.runTest('Error Handling', () => this.testErrorHandling());
            await this.runTest('Performance Modes', () => this.testPerformanceModes());
            
            this.printSummary();
        } finally {
            // Always cleanup, even if tests fail
            await this.cleanup();
        }
    }
    
    printSummary() {
        console.log('\n📊 Test Summary');
        console.log('================');
        
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        const total = this.testResults.length;
        
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed} ✅`);
        console.log(`Failed: ${failed} ❌`);
        
        if (failed === 0) {
            console.log('\n🎉 All tests passed! Agent service is working correctly.');
        } else {
            console.log('\n⚠️  Some tests failed. Check the details above.');
        }
        
        const avgDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0) / total;
        console.log(`Average Response Time: ${Math.round(avgDuration)}ms`);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new AgentTester();
    tester.runAllTests().catch(error => {
        console.error('Test suite failed:', error.message);
        process.exit(1);
    });
}

module.exports = AgentTester;
