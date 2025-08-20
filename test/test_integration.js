/**
 * End-to-End Integration Tests
 * Tests the complete application flow from API to database
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const client = axios.create({ baseURL: BASE_URL, timeout: 30000 });

class IntegrationTests {
    constructor() {
        this.testResults = [];
        this.testData = [];
    }
    
    async runTest(name, testFn) {
        console.log(`\n🔗 Running integration test: ${name}`);
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
    
    async testCompleteUserJourney() {
        console.log('   👤 Testing complete user journey:');
        
        const userJourney = [
            { step: 'Landing', action: () => client.get('/') },
            { step: 'Health Check', action: () => client.get('/health/') },
            { step: 'View Tools', action: () => client.get('/tools/') },
            { step: 'Pokemon Query', action: () => client.post('/run_task/', { task: 'Tell me about Pikachu' }) },
            { step: 'General Query', action: () => client.post('/run_task/', { task: 'What is AI?' }) },
            { step: 'Another Pokemon', action: () => client.post('/run_task/', { task: 'Charizard stats' }) },
            { step: 'Cache Stats', action: () => client.get('/cache/stats/') },
            { step: 'Performance Modes', action: () => client.get('/performance/modes/') }
        ];
        
        for (const journey of userJourney) {
            const response = await journey.action();
            
            if (response.status !== 200) {
                throw new Error(`Step "${journey.step}" failed with status ${response.status}`);
            }
            
            // Validate response structure based on step
            if (journey.step === 'Pokemon Query' || journey.step === 'Another Pokemon') {
                if (!response.data.result || !response.data.processing_time) {
                    throw new Error(`Step "${journey.step}" missing required response fields`);
                }
                
                if (!response.data.result.includes('Physical Characteristics')) {
                    throw new Error(`Step "${journey.step}" doesn't appear to contain Pokemon data`);
                }
            }
            
            console.log(`   ✓ ${journey.step}: ${response.status} (${response.data.processing_time || 'N/A'}ms)`);
        }
        
        console.log('   🎉 Complete user journey successful');
    }
    
    async testDataFlow() {
        console.log('   📊 Testing data flow through system:');
        
        // Clear cache to start fresh
        await client.post('/cache/clear/');
        console.log('   🗑️  Cache cleared');
        
        // Make a Pokemon request and track data flow
        const pokemonQuery = 'Tell me about Bulbasaur';
        
        // First request (should hit external API)
        const startTime = Date.now();
        const response1 = await client.post('/run_task/', { task: pokemonQuery });
        const firstRequestTime = Date.now() - startTime;
        
        if (response1.data.cached) {
            throw new Error('First request should not be cached');
        }
        
        console.log(`   ✓ First request: ${firstRequestTime}ms (uncached)`);
        
        // Second request (should be cached)
        const startTime2 = Date.now();
        const response2 = await client.post('/run_task/', { task: pokemonQuery });
        const secondRequestTime = Date.now() - startTime2;
        
        if (!response2.data.cached) {
            console.log('   ⚠️  Second request should be cached');
        }
        
        console.log(`   ✓ Second request: ${secondRequestTime}ms (cached: ${response2.data.cached})`);
        
        // Validate responses are identical
        if (response1.data.result !== response2.data.result) {
            throw new Error('Cached response differs from original');
        }
        
        console.log('   ✓ Data consistency maintained through cache');
        
        // Verify cache statistics
        const cacheStats = await client.get('/cache/stats/');
        if (cacheStats.data.hits === 0) {
            console.log('   ⚠️  Cache stats show no hits - cache may not be working optimally');
        } else {
            console.log(`   ✓ Cache stats: ${cacheStats.data.hits} hits, ${cacheStats.data.misses} misses`);
        }
    }
    
    async testErrorRecovery() {
        console.log('   🔄 Testing error recovery:');
        
        const errorScenarios = [
            {
                name: 'Invalid JSON',
                request: () => client.post('/run_task/', 'invalid json', {
                    headers: { 'Content-Type': 'application/json' }
                }),
                expectedStatus: 400
            },
            {
                name: 'Missing task field',
                request: () => client.post('/run_task/', { notTask: 'test' }),
                expectedStatus: 400
            },
            {
                name: 'Invalid endpoint',
                request: () => client.get('/invalid-endpoint'),
                expectedStatus: 404
            },
            {
                name: 'Wrong method',
                request: () => client.put('/run_task/'),
                expectedStatus: 404
            }
        ];
        
        for (const scenario of errorScenarios) {
            try {
                await scenario.request();
                throw new Error(`${scenario.name} should have failed`);
            } catch (error) {
                if (error.response && error.response.status === scenario.expectedStatus) {
                    console.log(`   ✓ ${scenario.name}: Properly handled (${error.response.status})`);
                } else {
                    throw new Error(`${scenario.name}: Expected status ${scenario.expectedStatus}, got ${error.response?.status || 'no response'}`);
                }
            }
        }
        
        // Test that service continues working after errors
        const recoveryResponse = await client.post('/run_task/', { task: 'Tell me about Pikachu' });
        if (recoveryResponse.status !== 200) {
            throw new Error('Service did not recover properly after errors');
        }
        
        console.log('   ✓ Service recovered properly after errors');
    }
    
    async testConcurrentUserSessions() {
        console.log('   👥 Testing concurrent user sessions:');
        
        const userSessions = [
            { user: 'User1', queries: ['Tell me about Pikachu', 'What is programming?', 'Charizard stats'] },
            { user: 'User2', queries: ['Bulbasaur info', 'How does AI work?', 'Squirtle evolution'] },
            { user: 'User3', queries: ['Mewtwo abilities', 'What is TensorFlow?', 'Eevee evolution'] }
        ];
        
        const sessionPromises = userSessions.map(async (session) => {
            const sessionResults = [];
            
            for (const query of session.queries) {
                const startTime = Date.now();
                const response = await client.post('/run_task/', { task: query });
                const duration = Date.now() - startTime;
                
                sessionResults.push({
                    user: session.user,
                    query,
                    status: response.status,
                    duration,
                    cached: response.data.cached
                });
            }
            
            return sessionResults;
        });
        
        const allResults = await Promise.all(sessionPromises);
        const flatResults = allResults.flat();
        
        // Validate all requests succeeded
        const failed = flatResults.filter(r => r.status !== 200);
        if (failed.length > 0) {
            throw new Error(`${failed.length} requests failed in concurrent sessions`);
        }
        
        // Calculate statistics
        const avgResponseTime = flatResults.reduce((sum, r) => sum + r.duration, 0) / flatResults.length;
        const cacheHits = flatResults.filter(r => r.cached).length;
        
        console.log(`   📊 Session results:`);
        console.log(`      Total requests: ${flatResults.length}`);
        console.log(`      Average response time: ${Math.round(avgResponseTime)}ms`);
        console.log(`      Cache hits: ${cacheHits}/${flatResults.length}`);
        console.log(`      Success rate: 100%`);
        
        for (const session of userSessions) {
            const userResults = flatResults.filter(r => r.user === session.user);
            const userAvg = userResults.reduce((sum, r) => sum + r.duration, 0) / userResults.length;
            console.log(`      ${session.user}: ${Math.round(userAvg)}ms avg`);
        }
    }
    
    async testLongRunningSession() {
        console.log('   ⏰ Testing long-running session:');
        
        const sessionDuration = 30; // seconds
        const requestInterval = 2; // seconds
        const totalRequests = Math.floor(sessionDuration / requestInterval);
        
        console.log(`   🕒 Running ${totalRequests} requests over ${sessionDuration} seconds...`);
        
        const sessionResults = [];
        const startTime = Date.now();
        
        for (let i = 0; i < totalRequests; i++) {
            const query = i % 2 === 0 ? 
                `Tell me about Pokemon ${i}` : 
                `What is request number ${i}?`;
            
            const requestStart = Date.now();
            const response = await client.post('/run_task/', { task: query });
            const requestTime = Date.now() - requestStart;
            
            sessionResults.push({
                index: i,
                query,
                status: response.status,
                duration: requestTime,
                timestamp: Date.now() - startTime
            });
            
            console.log(`      Request ${i + 1}/${totalRequests}: ${requestTime}ms`);
            
            // Wait before next request
            if (i < totalRequests - 1) {
                await new Promise(resolve => setTimeout(resolve, requestInterval * 1000));
            }
        }
        
        const totalTime = Date.now() - startTime;
        const avgResponseTime = sessionResults.reduce((sum, r) => sum + r.duration, 0) / sessionResults.length;
        const successRate = sessionResults.filter(r => r.status === 200).length / sessionResults.length * 100;
        
        console.log(`   📊 Long session results:`);
        console.log(`      Total duration: ${Math.round(totalTime / 1000)}s`);
        console.log(`      Requests completed: ${sessionResults.length}`);
        console.log(`      Average response time: ${Math.round(avgResponseTime)}ms`);
        console.log(`      Success rate: ${Math.round(successRate)}%`);
        
        if (successRate < 95) {
            throw new Error(`Low success rate in long session: ${successRate}%`);
        }
    }
    
    async testCacheConsistency() {
        console.log('   🎯 Testing cache consistency:');
        
        // Clear cache
        await client.post('/cache/clear/');
        
        const testQuery = 'Tell me about cache test Pokemon';
        
        // Make multiple identical requests
        const requests = 5;
        const responses = [];
        
        for (let i = 0; i < requests; i++) {
            const response = await client.post('/run_task/', { task: testQuery });
            responses.push(response.data);
            console.log(`      Request ${i + 1}: ${response.data.processing_time}ms (cached: ${response.data.cached})`);
        }
        
        // Verify all responses are identical
        const firstResult = responses[0].result;
        for (let i = 1; i < responses.length; i++) {
            if (responses[i].result !== firstResult) {
                throw new Error(`Response ${i + 1} differs from first response`);
            }
        }
        
        console.log('   ✓ All responses are identical');
        
        // Verify caching behavior
        const uncachedCount = responses.filter(r => !r.cached).length;
        const cachedCount = responses.filter(r => r.cached).length;
        
        console.log(`   📊 Cache behavior: ${uncachedCount} uncached, ${cachedCount} cached`);
        
        if (uncachedCount !== 1) {
            console.log('   ⚠️  Expected exactly 1 uncached request');
        }
    }
    
    async testSystemResourceUsage() {
        console.log('   💻 Testing system resource usage:');
        
        // Get initial resource usage
        const initialHealth = await client.get('/health/');
        const initialMemory = initialHealth.data.memory_usage;
        
        console.log(`   📊 Initial resources:`);
        console.log(`      Memory: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);
        console.log(`      Cache entries: ${initialHealth.data.cache_entries}`);
        
        // Perform intensive operations
        const intensiveRequests = 20;
        
        for (let i = 0; i < intensiveRequests; i++) {
            await client.post('/run_task/', { 
                task: `Intensive request ${i} with unique data ${Math.random()}` 
            });
            
            if (i % 5 === 0) {
                const health = await client.get('/health/');
                const memory = health.data.memory_usage;
                console.log(`      After ${i} requests: ${Math.round(memory.heapUsed / 1024 / 1024)}MB`);
            }
        }
        
        // Get final resource usage
        const finalHealth = await client.get('/health/');
        const finalMemory = finalHealth.data.memory_usage;
        
        console.log(`   📊 Final resources:`);
        console.log(`      Memory: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);
        console.log(`      Cache entries: ${finalHealth.data.cache_entries}`);
        
        const memoryGrowth = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
        console.log(`      Memory growth: ${Math.round(memoryGrowth)}MB`);
        
        if (memoryGrowth > 100) {
            console.log('   ⚠️  Significant memory growth detected');
        } else {
            console.log('   ✓ Memory usage is stable');
        }
    }
    
    async runAllTests() {
        console.log('🚀 Starting Integration Tests\n');
        console.log(`Testing against: ${BASE_URL}`);
        
        await this.runTest('Complete User Journey', () => this.testCompleteUserJourney());
        await this.runTest('Data Flow', () => this.testDataFlow());
        await this.runTest('Error Recovery', () => this.testErrorRecovery());
        await this.runTest('Concurrent User Sessions', () => this.testConcurrentUserSessions());
        await this.runTest('Long Running Session', () => this.testLongRunningSession());
        await this.runTest('Cache Consistency', () => this.testCacheConsistency());
        await this.runTest('System Resource Usage', () => this.testSystemResourceUsage());
        
        this.printSummary();
    }
    
    printSummary() {
        console.log('\n📊 Integration Test Summary');
        console.log('============================');
        
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        const total = this.testResults.length;
        
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed} ✅`);
        console.log(`Failed: ${failed} ❌`);
        
        if (failed === 0) {
            console.log('\n🎉 All integration tests passed! System is working correctly end-to-end.');
        } else {
            console.log('\n⚠️  Some integration tests failed. Check the details above.');
        }
        
        const avgDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0) / total;
        console.log(`Average Test Duration: ${Math.round(avgDuration)}ms`);
        
        console.log('\n🔍 Integration Test Coverage:');
        console.log('  ✓ Complete user workflows');
        console.log('  ✓ Data consistency and caching');
        console.log('  ✓ Error handling and recovery');
        console.log('  ✓ Concurrent user scenarios');
        console.log('  ✓ Long-running stability');
        console.log('  ✓ Resource usage patterns');
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new IntegrationTests();
    tester.runAllTests().catch(error => {
        console.error('Integration test suite failed:', error.message);
        process.exit(1);
    });
}

module.exports = IntegrationTests;
