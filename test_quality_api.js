#!/usr/bin/env node

/**
 * Test script to demonstrate the correct API usage for quality mode
 */

const API_BASE = 'https://tensorflow-agent-service-h32356f5d-brianferrys-projects.vercel.app/api';

async function testQualityMode() {
    console.log('🧪 Testing Quality Mode API Calls\n');
    
    // Step 1: Set performance mode to quality
    console.log('1️⃣ Setting performance mode to quality...');
    const modeResponse = await fetch(`${API_BASE}/set_performance_mode/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mode: 'quality' })
    });
    
    const modeResult = await modeResponse.json();
    console.log('Mode setting result:', modeResult);
    console.log('');
    
    // Step 2: Make the task request
    console.log('2️⃣ Making task request...');
    const taskResponse = await fetch(`${API_BASE}/run_task/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task: 'Info on Eevee evolutions' })
    });
    
    const taskResult = await taskResponse.json();
    console.log('Task result cached:', taskResult.cached || false);
    console.log('Response preview:', taskResult.result?.response?.substring(0, 100) + '...');
    console.log('Processing time:', taskResult.processing_time_ms, 'ms');
    console.log('');
    
    // Step 3: Make the same request again to test caching
    console.log('3️⃣ Making same request again...');
    const taskResponse2 = await fetch(`${API_BASE}/run_task/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task: 'Info on Eevee evolutions' })
    });
    
    const taskResult2 = await taskResponse2.json();
    console.log('Second task result cached:', taskResult2.cached || false);
    console.log('Response preview:', taskResult2.result?.response?.substring(0, 100) + '...');
    console.log('Processing time:', taskResult2.processing_time_ms, 'ms');
    console.log('');
    
    // Step 4: Check if responses are identical
    const responsesIdentical = taskResult.result?.response === taskResult2.result?.response;
    console.log('4️⃣ Responses identical:', responsesIdentical);
    
    if (responsesIdentical && !taskResult.cached && !taskResult2.cached) {
        console.log('✅ Quality mode is working correctly - fresh responses each time');
    } else if (taskResult2.cached) {
        console.log('⚠️  Second request was cached - this indicates a caching issue');
    } else {
        console.log('✅ Quality mode is working - responses may vary due to ML processing');
    }
}

testQualityMode().catch(console.error);
