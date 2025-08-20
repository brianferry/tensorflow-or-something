#!/usr/bin/env node

/**
 * Debug script to test quality mode caching behavior
 */

const TensorFlowAgentServerless = require('./src/agent/tensorflow_agent_serverless');

async function debugQualityMode() {
    console.log('🔍 Debugging Quality Mode Caching Behavior\n');
    
    const agent = new TensorFlowAgentServerless();
    await agent.initialize();
    
    // Test 1: Default mode behavior
    console.log('📊 Test 1: Default mode (balanced)');
    console.log('Performance mode:', agent.performanceMode);
    console.log('Config cache enabled:', agent.config.cacheEnabled);
    
    const task1 = "Info on Eevee evolutions";
    const result1 = await agent.processTask(task1);
    console.log('First result cached:', result1.cached || false);
    console.log('Response preview:', result1.response.substring(0, 100) + '...\n');
    
    // Second request in same mode
    const result1b = await agent.processTask(task1);
    console.log('Second result cached:', result1b.cached || false);
    console.log('Response preview:', result1b.response.substring(0, 100) + '...\n');
    
    // Test 2: Switch to quality mode
    console.log('📊 Test 2: Switching to quality mode');
    agent.setPerformanceMode('quality');
    console.log('Performance mode:', agent.performanceMode);
    console.log('Config cache enabled:', agent.config.cacheEnabled);
    
    const result2 = await agent.processTask(task1);
    console.log('First quality result cached:', result2.cached || false);
    console.log('Response preview:', result2.response.substring(0, 100) + '...\n');
    
    // Second request in quality mode
    const result2b = await agent.processTask(task1);
    console.log('Second quality result cached:', result2b.cached || false);
    console.log('Response preview:', result2b.response.substring(0, 100) + '...\n');
    
    // Test 3: Cache key comparison
    console.log('📊 Test 3: Cache key analysis');
    agent.setPerformanceMode('balanced');
    const balancedKey = agent.generateCacheKey(task1);
    agent.setPerformanceMode('quality');
    const qualityKey = agent.generateCacheKey(task1);
    console.log('Balanced mode cache key:', balancedKey);
    console.log('Quality mode cache key:', qualityKey);
    console.log('Keys are different:', balancedKey !== qualityKey);
    
    // Test 4: Manual cache inspection
    console.log('\n📊 Test 4: Manual cache inspection');
    console.log('Cache stats:', agent.cache.getStats());
    const allKeys = agent.cache.keys();
    console.log('All cache keys:', allKeys);
    
    console.log('\n✅ Debug analysis complete');
}

// Run the debug
debugQualityMode().catch(console.error);
