/**
 * Security Tests for TensorFlow.js Agent Service
 * Tests for security vulnerabilities and attack vectors
 */

const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:3000';
const client = axios.create({ baseURL: BASE_URL, timeout: 10000 });

class SecurityTests {
    constructor() {
        this.testResults = [];
        this.vulnerabilities = [];
    }
    
    async runTest(name, testFn) {
        console.log(`\n🔒 Running security test: ${name}`);
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
    
    async testInputValidation() {
        console.log('   🛡️  Testing input validation:');
        
        const maliciousInputs = [
            // SQL Injection attempts
            { task: "'; DROP TABLE users; --", description: 'SQL injection' },
            { task: "' OR '1'='1", description: 'SQL injection boolean' },
            
            // XSS attempts
            { task: '<script>alert("xss")</script>', description: 'Basic XSS' },
            { task: 'javascript:alert("xss")', description: 'JavaScript protocol' },
            { task: '<img src="x" onerror="alert(1)">', description: 'Image XSS' },
            
            // Command injection attempts
            { task: '; cat /etc/passwd', description: 'Command injection' },
            { task: '$(whoami)', description: 'Command substitution' },
            { task: '`id`', description: 'Backtick command execution' },
            
            // Path traversal attempts
            { task: '../../../etc/passwd', description: 'Path traversal' },
            { task: '....//....//....//etc/passwd', description: 'Double encoded path traversal' },
            
            // NoSQL injection attempts
            { task: JSON.stringify({ $ne: null }), description: 'NoSQL injection' },
            
            // XXE attempts
            { task: '<!DOCTYPE test [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>', description: 'XXE injection' },
            
            // Large payload
            { task: 'A'.repeat(10000), description: 'Large payload' },
            
            // Null bytes
            { task: 'test\x00hidden', description: 'Null byte injection' },
            
            // Unicode exploitation
            { task: 'test\u202e\u0041\u0042', description: 'Unicode exploitation' }
        ];
        
        for (const input of maliciousInputs) {
            try {
                const response = await client.post('/run_task/', input);
                
                // Check if the response contains the malicious input directly (potential XSS)
                if (response.data.result && response.data.result.includes('<script>')) {
                    this.vulnerabilities.push({
                        type: 'XSS',
                        input: input.task,
                        description: 'Malicious script not sanitized in response'
                    });
                    throw new Error(`Potential XSS vulnerability with input: ${input.description}`);
                }
                
                // Check if the service crashed or returned an error
                if (response.status !== 200) {
                    console.log(`   ⚠️  Unexpected status ${response.status} for ${input.description}`);
                }
                
                console.log(`   ✓ Handled ${input.description} safely`);
                
            } catch (error) {
                if (error.response && error.response.status >= 400 && error.response.status < 500) {
                    // Expected behavior - reject malicious input
                    console.log(`   ✓ Properly rejected ${input.description} (${error.response.status})`);
                } else {
                    console.log(`   ⚠️  Unexpected error for ${input.description}: ${error.message}`);
                }
            }
        }
    }
    
    async testHTTPHeaders() {
        console.log('   🔒 Testing HTTP security headers:');
        
        const response = await client.get('/health/');
        const headers = response.headers;
        
        const securityHeaders = {
            'x-content-type-options': 'nosniff',
            'x-frame-options': ['DENY', 'SAMEORIGIN'],
            'x-xss-protection': '1; mode=block',
            'strict-transport-security': null, // HTTPS only
            'content-security-policy': null,
            'referrer-policy': null
        };
        
        let headerScore = 0;
        const totalHeaders = Object.keys(securityHeaders).length;
        
        for (const [headerName, expectedValue] of Object.entries(securityHeaders)) {
            const actualValue = headers[headerName];
            
            if (actualValue) {
                if (Array.isArray(expectedValue)) {
                    if (expectedValue.includes(actualValue)) {
                        console.log(`   ✓ ${headerName}: ${actualValue}`);
                        headerScore++;
                    } else {
                        console.log(`   ⚠️  ${headerName}: ${actualValue} (unexpected value)`);
                    }
                } else if (expectedValue === null) {
                    console.log(`   ✓ ${headerName}: ${actualValue} (present)`);
                    headerScore++;
                } else if (actualValue === expectedValue) {
                    console.log(`   ✓ ${headerName}: ${actualValue}`);
                    headerScore++;
                } else {
                    console.log(`   ⚠️  ${headerName}: ${actualValue} (expected: ${expectedValue})`);
                }
            } else {
                console.log(`   ❌ Missing header: ${headerName}`);
            }
        }
        
        console.log(`   📊 Security headers score: ${headerScore}/${totalHeaders}`);
        
        if (headerScore < totalHeaders * 0.6) {
            console.log(`   ⚠️  Low security headers score. Consider adding more security headers.`);
        }
    }
    
    async testRateLimiting() {
        console.log('   🚦 Testing rate limiting:');
        
        const rapidRequests = 50;
        const promises = [];
        
        console.log(`   🔄 Sending ${rapidRequests} rapid requests...`);
        
        const startTime = Date.now();
        for (let i = 0; i < rapidRequests; i++) {
            promises.push(
                client.post('/run_task/', { task: `Rate limit test ${i}` })
                    .catch(error => ({
                        error: error.response ? error.response.status : error.code,
                        index: i
                    }))
            );
        }
        
        const results = await Promise.all(promises);
        const endTime = Date.now();
        
        const successful = results.filter(r => !r.error).length;
        const rateLimited = results.filter(r => r.error === 429).length;
        const otherErrors = results.filter(r => r.error && r.error !== 429).length;
        
        console.log(`   📊 Rate limiting results:`);
        console.log(`      Successful: ${successful}/${rapidRequests}`);
        console.log(`      Rate limited (429): ${rateLimited}`);
        console.log(`      Other errors: ${otherErrors}`);
        console.log(`      Total time: ${endTime - startTime}ms`);
        
        if (rateLimited === 0 && successful === rapidRequests) {
            console.log(`   ⚠️  No rate limiting detected. Consider implementing rate limiting.`);
        } else if (rateLimited > 0) {
            console.log(`   ✓ Rate limiting is working`);
        }
    }
    
    async testDenialOfService() {
        console.log('   💥 Testing DoS resistance:');
        
        // Test with extremely large payloads
        const largeSizes = [1000, 10000, 100000];
        
        for (const size of largeSizes) {
            try {
                const largePayload = 'A'.repeat(size);
                const response = await client.post('/run_task/', { 
                    task: largePayload 
                }, { timeout: 5000 });
                
                console.log(`   ✓ Handled ${size} byte payload (${response.status})`);
                
            } catch (error) {
                if (error.code === 'ECONNABORTED') {
                    console.log(`   ✓ Timeout protection worked for ${size} bytes`);
                } else if (error.response && error.response.status === 413) {
                    console.log(`   ✓ Payload too large protection worked for ${size} bytes`);
                } else {
                    console.log(`   ⚠️  Unexpected error for ${size} bytes: ${error.message}`);
                }
            }
        }
        
        // Test with deeply nested JSON
        try {
            const deepObject = {};
            let current = deepObject;
            for (let i = 0; i < 1000; i++) {
                current.nested = {};
                current = current.nested;
            }
            current.task = 'Deep nesting test';
            
            await client.post('/run_task/', deepObject, { timeout: 5000 });
            console.log(`   ✓ Handled deeply nested JSON`);
            
        } catch (error) {
            if (error.response && [400, 413].includes(error.response.status)) {
                console.log(`   ✓ Deep nesting protection worked`);
            } else {
                console.log(`   ⚠️  Unexpected error for deep nesting: ${error.message}`);
            }
        }
    }
    
    async testAuthenticationBypass() {
        console.log('   🔑 Testing authentication bypass attempts:');
        
        // Test various authentication bypass techniques
        const bypassAttempts = [
            { headers: { 'authorization': 'Bearer fake-token' }, description: 'Fake Bearer token' },
            { headers: { 'x-user-id': 'admin' }, description: 'User ID header injection' },
            { headers: { 'x-real-ip': '127.0.0.1' }, description: 'IP spoofing' },
            { headers: { 'x-forwarded-for': '127.0.0.1' }, description: 'Forwarded IP spoofing' },
            { headers: { 'host': 'admin.example.com' }, description: 'Host header injection' }
        ];
        
        for (const attempt of bypassAttempts) {
            try {
                const response = await client.get('/health/', { headers: attempt.headers });
                
                // Check if the response reveals sensitive information
                if (response.data.toString().includes('admin') || 
                    response.data.toString().includes('secret') ||
                    response.data.toString().includes('password')) {
                    throw new Error(`Potential information disclosure with ${attempt.description}`);
                }
                
                console.log(`   ✓ ${attempt.description} handled safely`);
                
            } catch (error) {
                if (error.response && [401, 403].includes(error.response.status)) {
                    console.log(`   ✓ ${attempt.description} properly rejected`);
                } else {
                    console.log(`   ⚠️  Unexpected response for ${attempt.description}: ${error.message}`);
                }
            }
        }
    }
    
    async testInformationDisclosure() {
        console.log('   📋 Testing information disclosure:');
        
        // Test error responses for information leakage
        const errorInducingRequests = [
            { method: 'GET', path: '/nonexistent' },
            { method: 'POST', path: '/run_task/', data: { invalid: 'json' } },
            { method: 'PUT', path: '/health/' },
            { method: 'DELETE', path: '/tools/' }
        ];
        
        for (const request of errorInducingRequests) {
            try {
                let response;
                if (request.method === 'GET') {
                    response = await client.get(request.path);
                } else if (request.method === 'POST') {
                    response = await client.post(request.path, request.data);
                } else if (request.method === 'PUT') {
                    response = await client.put(request.path);
                } else if (request.method === 'DELETE') {
                    response = await client.delete(request.path);
                }
                
                console.log(`   ✓ ${request.method} ${request.path}: ${response.status}`);
                
            } catch (error) {
                if (error.response) {
                    const errorBody = error.response.data;
                    
                    // Check for sensitive information in error responses
                    const sensitivePatterns = [
                        /\/home\/[^\/]+/,  // Home directory paths
                        /password/i,
                        /secret/i,
                        /key/i,
                        /token/i,
                        /node_modules/,
                        /src\//,
                        /Error:.+at\s+/  // Stack traces
                    ];
                    
                    let infoDisclosed = false;
                    for (const pattern of sensitivePatterns) {
                        if (pattern.test(JSON.stringify(errorBody))) {
                            console.log(`   ⚠️  Potential info disclosure in ${request.method} ${request.path}: ${pattern}`);
                            infoDisclosed = true;
                            break;
                        }
                    }
                    
                    if (!infoDisclosed) {
                        console.log(`   ✓ ${request.method} ${request.path}: Safe error response (${error.response.status})`);
                    }
                } else {
                    console.log(`   ✓ ${request.method} ${request.path}: Network error (expected)`);
                }
            }
        }
    }
    
    async testCORSConfiguration() {
        console.log('   🌐 Testing CORS configuration:');
        
        try {
            const response = await client.options('/health/', {
                headers: {
                    'Origin': 'https://malicious-site.com',
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'Content-Type'
                }
            });
            
            const corsHeaders = {
                'access-control-allow-origin': response.headers['access-control-allow-origin'],
                'access-control-allow-methods': response.headers['access-control-allow-methods'],
                'access-control-allow-headers': response.headers['access-control-allow-headers'],
                'access-control-allow-credentials': response.headers['access-control-allow-credentials']
            };
            
            console.log('   📊 CORS Headers:');
            for (const [header, value] of Object.entries(corsHeaders)) {
                if (value) {
                    console.log(`      ${header}: ${value}`);
                    
                    if (header === 'access-control-allow-origin' && value === '*') {
                        console.log(`   ⚠️  Wildcard CORS origin may be too permissive`);
                    }
                }
            }
            
        } catch (error) {
            console.log(`   ⚠️  CORS preflight failed: ${error.message}`);
        }
    }
    
    async runAllTests() {
        console.log('🚀 Starting Security Tests\n');
        console.log(`Testing against: ${BASE_URL}`);
        
        await this.runTest('Input Validation', () => this.testInputValidation());
        await this.runTest('HTTP Security Headers', () => this.testHTTPHeaders());
        await this.runTest('Rate Limiting', () => this.testRateLimiting());
        await this.runTest('Denial of Service Resistance', () => this.testDenialOfService());
        await this.runTest('Authentication Bypass', () => this.testAuthenticationBypass());
        await this.runTest('Information Disclosure', () => this.testInformationDisclosure());
        await this.runTest('CORS Configuration', () => this.testCORSConfiguration());
        
        this.printSummary();
    }
    
    printSummary() {
        console.log('\n📊 Security Test Summary');
        console.log('=========================');
        
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        const total = this.testResults.length;
        
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed} ✅`);
        console.log(`Failed: ${failed} ❌`);
        
        if (this.vulnerabilities.length > 0) {
            console.log('\n🚨 Potential Vulnerabilities Found:');
            for (const vuln of this.vulnerabilities) {
                console.log(`  ${vuln.type}: ${vuln.description}`);
            }
        } else {
            console.log('\n🔒 No critical vulnerabilities detected');
        }
        
        if (failed === 0 && this.vulnerabilities.length === 0) {
            console.log('\n🎉 All security tests passed! Service appears secure.');
        } else {
            console.log('\n⚠️  Some security issues detected. Review the results above.');
        }
        
        console.log('\n💡 Security Recommendations:');
        console.log('  - Implement rate limiting for production');
        console.log('  - Add comprehensive input validation');
        console.log('  - Use HTTPS in production');
        console.log('  - Implement authentication for sensitive endpoints');
        console.log('  - Add request size limits');
        console.log('  - Use security headers (helmet.js)');
        console.log('  - Implement proper error handling');
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new SecurityTests();
    tester.runAllTests().catch(error => {
        console.error('Security test suite failed:', error.message);
        process.exit(1);
    });
}

module.exports = SecurityTests;
