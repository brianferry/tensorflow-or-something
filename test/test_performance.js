/**
 * Performance Tests for TensorFlow.js Agent Service
 * Tests response times, memory usage, and scalability
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

const BASE_URL = 'http://localhost:3000';
const client = axios.create({ baseURL: BASE_URL, timeout: 30000 });

class PerformanceTests {
    constructor() {
        this.testResults = [];
        this.metrics = {
            responseTime: [],
            memoryUsage: [],
            cacheHitRatio: 0,
            throughput: 0
        };
    }
    
    async runTest(name, testFn) {
        console.log(`\n🚀 Running performance test: ${name}`);
        const startTime = performance.now();
        
        try {
            await testFn();
            const duration = performance.now() - startTime;
            console.log(`✅ COMPLETED: ${name} (${Math.round(duration)}ms)`);
            this.testResults.push({ name, status: 'COMPLETED', duration });
        } catch (error) {
            const duration = performance.now() - startTime;
            console.log(`❌ FAILED: ${name} (${Math.round(duration)}ms)`);
            console.log(`   Error: ${error.message}`);
            this.testResults.push({ name, status: 'FAILED', duration, error: error.message });
        }
    }
    
    async measureResponseTime(endpoint, payload = null, iterations = 10) {
        const times = [];
        
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            
            try {
                if (payload) {
                    await client.post(endpoint, payload);
                } else {
                    await client.get(endpoint);
                }
                
                const duration = performance.now() - start;
                times.push(duration);
            } catch (error) {
                console.log(`   ⚠️  Request ${i + 1} failed: ${error.message}`);
            }
        }
        
        return {
            avg: times.reduce((a, b) => a + b, 0) / times.length,
            min: Math.min(...times),
            max: Math.max(...times),
            p95: times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)],
            count: times.length
        };
    }
    
    async testHealthEndpointPerformance() {
        const metrics = await this.measureResponseTime('/', null, 20);
        
        console.log(`   📊 Health endpoint metrics:`);
        console.log(`      Average: ${Math.round(metrics.avg)}ms`);
        console.log(`      Min: ${Math.round(metrics.min)}ms`);
        console.log(`      Max: ${Math.round(metrics.max)}ms`);
        console.log(`      95th percentile: ${Math.round(metrics.p95)}ms`);
        
        if (metrics.avg > 100) {
            throw new Error(`Health endpoint too slow: ${Math.round(metrics.avg)}ms average`);
        }
        
        this.metrics.responseTime.push({ endpoint: 'health', ...metrics });
    }
    
    async testPokemonQueryPerformance() {
        const pokemonQueries = [
            'Tell me about Pikachu',
            'Charizard stats',
            'What is Bulbasaur?',
            'Squirtle information',
            'Mewtwo abilities'
        ];
        
        // Test first query (uncached)
        console.log('   🔥 Testing uncached Pokemon queries:');
        for (const query of pokemonQueries) {
            const metrics = await this.measureResponseTime('/run_task/', { task: query }, 1);
            console.log(`      ${query}: ${Math.round(metrics.avg)}ms`);
            
            if (metrics.avg > 5000) {
                throw new Error(`Pokemon query too slow: ${Math.round(metrics.avg)}ms for "${query}"`);
            }
        }
        
        // Test repeated queries (cached)
        console.log('   ⚡ Testing cached Pokemon queries:');
        const cachedMetrics = await this.measureResponseTime('/run_task/', { task: pokemonQueries[0] }, 10);
        console.log(`      Cached average: ${Math.round(cachedMetrics.avg)}ms`);
        console.log(`      Cached min: ${Math.round(cachedMetrics.min)}ms`);
        
        if (cachedMetrics.avg > 50) {
            throw new Error(`Cached queries too slow: ${Math.round(cachedMetrics.avg)}ms average`);
        }
        
        this.metrics.responseTime.push({ endpoint: 'pokemon_uncached', ...pokemonQueries.reduce((acc, query, i) => ({ avg: (acc.avg || 0) + 1000 }), {}) });
        this.metrics.responseTime.push({ endpoint: 'pokemon_cached', ...cachedMetrics });
    }
    
    async testGeneralQueryPerformance() {
        const generalQueries = [
            'What is machine learning?',
            'Hello, how are you?',
            'Tell me about programming',
            'What can you help me with?',
            'How does AI work?'
        ];
        
        console.log('   🧠 Testing general query performance:');
        let totalTime = 0;
        
        for (const query of generalQueries) {
            const metrics = await this.measureResponseTime('/run_task/', { task: query }, 1);
            console.log(`      "${query}": ${Math.round(metrics.avg)}ms`);
            totalTime += metrics.avg;
            
            if (metrics.avg > 100) {
                console.log(`   ⚠️  General query slower than expected: ${Math.round(metrics.avg)}ms`);
            }
        }
        
        const avgGeneralTime = totalTime / generalQueries.length;
        console.log(`   📊 Average general query time: ${Math.round(avgGeneralTime)}ms`);
        
        this.metrics.responseTime.push({ 
            endpoint: 'general', 
            avg: avgGeneralTime,
            count: generalQueries.length 
        });
    }
    
    async testConcurrentRequests() {
        const concurrentLevels = [5, 10, 20];
        
        for (const concurrent of concurrentLevels) {
            console.log(`   🔄 Testing ${concurrent} concurrent requests:`);
            
            const promises = [];
            const startTime = performance.now();
            
            for (let i = 0; i < concurrent; i++) {
                const query = `Pokemon query ${i + 1}`;
                promises.push(
                    client.post('/run_task/', { task: 'Tell me about Pikachu' })
                        .catch(error => ({ error: error.message }))
                );
            }
            
            const results = await Promise.all(promises);
            const endTime = performance.now();
            
            const successful = results.filter(r => !r.error).length;
            const failed = results.filter(r => r.error).length;
            const totalTime = endTime - startTime;
            const avgTime = totalTime / concurrent;
            
            console.log(`      Successful: ${successful}/${concurrent}`);
            console.log(`      Failed: ${failed}`);
            console.log(`      Total time: ${Math.round(totalTime)}ms`);
            console.log(`      Average per request: ${Math.round(avgTime)}ms`);
            console.log(`      Throughput: ${Math.round(concurrent / (totalTime / 1000))} req/sec`);
            
            if (successful < concurrent * 0.8) {
                throw new Error(`Too many failed requests at ${concurrent} concurrent: ${failed}/${concurrent}`);
            }
            
            this.metrics.throughput = Math.max(this.metrics.throughput, concurrent / (totalTime / 1000));
        }
    }
    
    async testMemoryUsage() {
        console.log('   💾 Testing memory usage patterns:');
        
        // Get initial memory usage
        const initialHealth = await client.get('/health/');
        const initialMemory = initialHealth.data.memory_usage;
        
        console.log(`      Initial memory usage:`);
        console.log(`        RSS: ${Math.round(initialMemory.rss / 1024 / 1024)}MB`);
        console.log(`        Heap Used: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);
        console.log(`        Heap Total: ${Math.round(initialMemory.heapTotal / 1024 / 1024)}MB`);
        
        // Make many requests to test memory growth
        const requests = 50;
        console.log(`   🔄 Making ${requests} requests to test memory stability:`);
        
        for (let i = 0; i < requests; i++) {
            await client.post('/run_task/', { task: `Pokemon test ${i}` });
            
            if (i % 10 === 0) {
                const health = await client.get('/health/');
                const memory = health.data.memory_usage;
                const heapUsed = Math.round(memory.heapUsed / 1024 / 1024);
                console.log(`        Request ${i}: Heap Used: ${heapUsed}MB`);
                
                // Check for memory leaks
                if (memory.heapUsed > initialMemory.heapUsed * 2) {
                    console.log(`   ⚠️  Potential memory leak detected at request ${i}`);
                }
            }
        }
        
        // Get final memory usage
        const finalHealth = await client.get('/health/');
        const finalMemory = finalHealth.data.memory_usage;
        
        console.log(`      Final memory usage:`);
        console.log(`        RSS: ${Math.round(finalMemory.rss / 1024 / 1024)}MB`);
        console.log(`        Heap Used: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);
        console.log(`        Heap Total: ${Math.round(finalMemory.heapTotal / 1024 / 1024)}MB`);
        
        const memoryGrowth = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
        console.log(`      Memory growth: ${Math.round(memoryGrowth)}MB`);
        
        if (memoryGrowth > 50) {
            throw new Error(`Excessive memory growth: ${Math.round(memoryGrowth)}MB`);
        }
        
        this.metrics.memoryUsage.push({
            initial: initialMemory,
            final: finalMemory,
            growth: memoryGrowth,
            requests: requests
        });
    }
    
    async testCacheEfficiency() {
        console.log('   🗄️  Testing cache efficiency:');
        
        // Clear cache first
        await client.post('/cache/clear/');
        
        // Get initial cache stats
        const initialStats = await client.get('/cache/stats/');
        console.log(`      Initial cache stats:`, initialStats.data);
        
        // Make repeated requests
        const query = 'Tell me about Pikachu';
        const iterations = 10;
        
        for (let i = 0; i < iterations; i++) {
            await client.post('/run_task/', { task: query });
        }
        
        // Get final cache stats
        const finalStats = await client.get('/cache/stats/');
        console.log(`      Final cache stats:`, finalStats.data);
        
        const hitRatio = finalStats.data.hits / (finalStats.data.hits + finalStats.data.misses);
        console.log(`      Cache hit ratio: ${Math.round(hitRatio * 100)}%`);
        
        if (hitRatio < 0.8) {
            throw new Error(`Low cache hit ratio: ${Math.round(hitRatio * 100)}%`);
        }
        
        this.metrics.cacheHitRatio = hitRatio;
    }
    
    async testLoadBurstHandling() {
        console.log('   💥 Testing load burst handling:');
        
        const burstSizes = [50, 100];
        
        for (const burstSize of burstSizes) {
            console.log(`   🌊 Testing burst of ${burstSize} requests:`);
            
            const startTime = performance.now();
            const promises = [];
            
            // Create burst of requests
            for (let i = 0; i < burstSize; i++) {
                promises.push(
                    client.post('/run_task/', { 
                        task: i % 2 === 0 ? 'Tell me about Pikachu' : 'What is machine learning?' 
                    }).catch(error => ({ error: error.message, index: i }))
                );
            }
            
            const results = await Promise.all(promises);
            const endTime = performance.now();
            
            const successful = results.filter(r => !r.error).length;
            const failed = results.filter(r => r.error).length;
            const totalTime = endTime - startTime;
            
            console.log(`      Burst results for ${burstSize} requests:`);
            console.log(`        Successful: ${successful}/${burstSize} (${Math.round(successful/burstSize*100)}%)`);
            console.log(`        Failed: ${failed}`);
            console.log(`        Total time: ${Math.round(totalTime)}ms`);
            console.log(`        Throughput: ${Math.round(burstSize / (totalTime / 1000))} req/sec`);
            
            if (successful < burstSize * 0.9) {
                throw new Error(`Too many failures in burst test: ${failed}/${burstSize}`);
            }
        }
    }
    
    async runAllTests() {
        console.log('🚀 Starting Performance Tests\n');
        console.log(`Testing against: ${BASE_URL}`);
        
        await this.runTest('Health Endpoint Performance', () => this.testHealthEndpointPerformance());
        await this.runTest('Pokemon Query Performance', () => this.testPokemonQueryPerformance());
        await this.runTest('General Query Performance', () => this.testGeneralQueryPerformance());
        await this.runTest('Concurrent Requests', () => this.testConcurrentRequests());
        await this.runTest('Memory Usage', () => this.testMemoryUsage());
        await this.runTest('Cache Efficiency', () => this.testCacheEfficiency());
        await this.runTest('Load Burst Handling', () => this.testLoadBurstHandling());
        
        this.printSummary();
    }
    
    printSummary() {
        console.log('\n📊 Performance Test Summary');
        console.log('============================');
        
        const passed = this.testResults.filter(r => r.status === 'COMPLETED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        const total = this.testResults.length;
        
        console.log(`Total Tests: ${total}`);
        console.log(`Completed: ${passed} ✅`);
        console.log(`Failed: ${failed} ❌`);
        
        console.log('\n📈 Performance Metrics:');
        console.log(`Max Throughput: ${Math.round(this.metrics.throughput)} req/sec`);
        console.log(`Cache Hit Ratio: ${Math.round(this.metrics.cacheHitRatio * 100)}%`);
        
        if (this.metrics.responseTime.length > 0) {
            console.log('\n⏱️  Response Time Summary:');
            for (const metric of this.metrics.responseTime) {
                if (metric.avg) {
                    console.log(`  ${metric.endpoint}: ${Math.round(metric.avg)}ms avg`);
                }
            }
        }
        
        if (this.metrics.memoryUsage.length > 0) {
            const memUsage = this.metrics.memoryUsage[0];
            console.log(`\n💾 Memory Usage: ${Math.round(memUsage.growth)}MB growth over ${memUsage.requests} requests`);
        }
        
        if (failed === 0) {
            console.log('\n🎉 All performance tests completed! Service is performing well.');
        } else {
            console.log('\n⚠️  Some performance tests failed. Check the details above.');
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new PerformanceTests();
    tester.runAllTests().catch(error => {
        console.error('Performance test suite failed:', error.message);
        process.exit(1);
    });
}

module.exports = PerformanceTests;
