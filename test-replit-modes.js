#!/usr/bin/env node

/**
 * Replit Performance Mode Test Suite
 * Tests all three performance modes (fast, balanced, quality) against a Replit deployment
 * Usage: node test-replit-modes.js <replit-base-url> [test-query]
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

class ReplitModeTestSuite {
    constructor(baseUrl) {
        this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        this.client = axios.create({
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'ReplitModeTestSuite/1.0'
            }
        });
    }

    /**
     * Test server health
     */
    async testHealth() {
        try {
            const response = await this.client.get(`${this.baseUrl}/health/`);
            return {
                success: true,
                status: response.status,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                status: error.response?.status
            };
        }
    }

    /**
     * Test a specific performance mode
     */
    async testMode(mode, task) {
        const startTime = performance.now();
        
        try {
            const response = await this.client.post(`${this.baseUrl}/run_task/`, {
                task: task,
                mode: mode
            });
            
            const endTime = performance.now();
            const duration = Math.round(endTime - startTime);
            
            return {
                success: true,
                mode: mode,
                task: task,
                response: response.data.result,
                duration: duration,
                cached: response.data.cached || false,
                performance_mode: response.data.performance_mode,
                server_processing_time: response.data.processing_time || null,
                status: response.status,
                response_length: response.data.result ? response.data.result.length : 0
            };
            
        } catch (error) {
            const endTime = performance.now();
            const duration = Math.round(endTime - startTime);
            
            return {
                success: false,
                mode: mode,
                task: task,
                error: error.message,
                duration: duration,
                status: error.response?.status,
                response_data: error.response?.data
            };
        }
    }

    /**
     * Test all three performance modes
     */
    async testAllModes(task) {
        console.log(`🧪 Testing all performance modes for task: "${task}"`);
        console.log(`🌐 Target URL: ${this.baseUrl}`);
        console.log('=' * 80);
        
        const modes = ['fast', 'balanced', 'quality'];
        const results = {};
        
        for (const mode of modes) {
            console.log(`\n🚀 Testing ${mode.toUpperCase()} mode...`);
            
            const result = await this.testMode(mode, task);
            results[mode] = result;
            
            if (result.success) {
                console.log(`✅ ${mode} mode completed in ${result.duration}ms`);
                console.log(`📊 Response length: ${result.response_length} characters`);
                if (result.cached) {
                    console.log(`💾 Response was cached`);
                }
            } else {
                console.log(`❌ ${mode} mode failed: ${result.error}`);
            }
        }
        
        return results;
    }

    /**
     * Display comprehensive results
     */
    displayResults(results, task) {
        console.log('\n' + '='.repeat(100));
        console.log('📊 COMPREHENSIVE PERFORMANCE MODE COMPARISON');
        console.log('='.repeat(100));
        
        // Summary table
        console.log('\n📈 PERFORMANCE SUMMARY:');
        console.log('┌─────────────┬─────────────┬──────────────┬─────────────────┬─────────────┐');
        console.log('│ Mode        │ Status      │ Duration     │ Response Length │ Cached      │');
        console.log('├─────────────┼─────────────┼──────────────┼─────────────────┼─────────────┤');
        
        const modes = ['fast', 'balanced', 'quality'];
        for (const mode of modes) {
            const result = results[mode];
            const status = result.success ? '✅ Success' : '❌ Failed';
            const duration = result.success ? `${result.duration}ms` : 'N/A';
            const length = result.success ? `${result.response_length} chars` : 'N/A';
            const cached = result.success ? (result.cached ? 'Yes' : 'No') : 'N/A';
            
            console.log(`│ ${mode.padEnd(11)} │ ${status.padEnd(11)} │ ${duration.padEnd(12)} │ ${length.padEnd(15)} │ ${cached.padEnd(11)} │`);
        }
        console.log('└─────────────┴─────────────┴──────────────┴─────────────────┴─────────────┘');
        
        // Detailed responses
        console.log('\n📝 DETAILED RESPONSES:');
        console.log('=' * 100);
        
        for (const mode of modes) {
            const result = results[mode];
            
            console.log(`\n🎯 ${mode.toUpperCase()} MODE RESPONSE:`);
            console.log('─'.repeat(60));
            
            if (result.success) {
                console.log('✅ Status: Success');
                console.log(`⏱️  Client Duration: ${result.duration}ms`);
                if (result.server_processing_time) {
                    console.log(`🖥️  Server Processing: ${result.server_processing_time}ms`);
                }
                console.log(`📏 Response Length: ${result.response_length} characters`);
                console.log(`🔄 Cached: ${result.cached ? 'Yes' : 'No'}`);
                console.log(`🎛️  Performance Mode: ${result.performance_mode || mode}`);
                console.log('\n📄 Full Response:');
                console.log('┌' + '─'.repeat(78) + '┐');
                
                // Word wrap the response for better display
                const response = result.response || '';
                const lines = this.wordWrap(response, 76);
                for (const line of lines) {
                    console.log(`│ ${line.padEnd(76)} │`);
                }
                
                console.log('└' + '─'.repeat(78) + '┘');
                
            } else {
                console.log('❌ Status: Failed');
                console.log(`⏱️  Duration: ${result.duration}ms`);
                console.log(`🚨 Error: ${result.error}`);
                if (result.status) {
                    console.log(`🔢 HTTP Status: ${result.status}`);
                }
                if (result.response_data) {
                    console.log(`📋 Server Response: ${JSON.stringify(result.response_data, null, 2)}`);
                }
            }
        }
        
        // Analysis
        console.log('\n🔍 RESPONSE ANALYSIS:');
        console.log('─'.repeat(60));
        
        const successful = modes.filter(mode => results[mode].success);
        
        if (successful.length > 0) {
            // Compare response lengths
            const lengths = successful.map(mode => ({
                mode,
                length: results[mode].response_length
            })).sort((a, b) => a.length - b.length);
            
            console.log('📏 Response Length Ranking:');
            lengths.forEach((item, index) => {
                const emoji = index === 0 ? '🥉' : index === 1 ? '🥈' : '🥇';
                console.log(`   ${emoji} ${item.mode}: ${item.length} characters`);
            });
            
            // Compare performance
            const durations = successful.map(mode => ({
                mode,
                duration: results[mode].duration
            })).sort((a, b) => a.duration - b.duration);
            
            console.log('\n⚡ Speed Ranking:');
            durations.forEach((item, index) => {
                const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
                console.log(`   ${emoji} ${item.mode}: ${item.duration}ms`);
            });
            
            // Response style analysis
            console.log('\n📊 Response Style Analysis:');
            for (const mode of successful) {
                const response = results[mode].response || '';
                const hasMarkdown = /#{1,6}\s/.test(response) || /\*\*.*\*\*/.test(response);
                const hasListItems = /^\s*[-*]\s/m.test(response);
                const hasSections = response.includes('\n\n');
                const wordCount = response.split(/\s+/).length;
                
                console.log(`   ${mode.toUpperCase()}:`);
                console.log(`     📝 Word count: ${wordCount}`);
                console.log(`     🎨 Uses markdown: ${hasMarkdown ? 'Yes' : 'No'}`);
                console.log(`     📋 Has bullet points: ${hasListItems ? 'Yes' : 'No'}`);
                console.log(`     📑 Multiple sections: ${hasSections ? 'Yes' : 'No'}`);
            }
        }
        
        console.log('\n🏁 Test completed successfully!');
        console.log('=' * 100);
    }

    /**
     * Word wrap utility for better display
     */
    wordWrap(text, maxLength) {
        if (!text) return [''];
        
        const lines = [];
        const paragraphs = text.split('\n');
        
        for (const paragraph of paragraphs) {
            if (paragraph.length <= maxLength) {
                lines.push(paragraph);
            } else {
                const words = paragraph.split(' ');
                let currentLine = '';
                
                for (const word of words) {
                    if (currentLine.length + word.length + 1 <= maxLength) {
                        currentLine += (currentLine ? ' ' : '') + word;
                    } else {
                        if (currentLine) {
                            lines.push(currentLine);
                        }
                        currentLine = word;
                    }
                }
                
                if (currentLine) {
                    lines.push(currentLine);
                }
            }
        }
        
        return lines;
    }

    /**
     * Run comprehensive test suite
     */
    async runComprehensiveTest(task) {
        console.log('🧪 REPLIT PERFORMANCE MODE TEST SUITE');
        console.log('='.repeat(60));
        console.log(`📅 Date: ${new Date().toISOString()}`);
        console.log(`🎯 Task: "${task}"`);
        console.log(`🌐 Base URL: ${this.baseUrl}`);
        
        // Test server health first
        console.log('\n🔍 Testing server health...');
        const health = await this.testHealth();
        
        if (!health.success) {
            console.log('❌ Server health check failed!');
            console.log(`   Error: ${health.error}`);
            console.log(`   Status: ${health.status}`);
            return;
        }
        
        console.log('✅ Server is healthy');
        console.log(`   Status: ${health.data?.status || 'unknown'}`);
        console.log(`   Agent Ready: ${health.data?.agent_ready || 'unknown'}`);
        console.log(`   Performance Mode: ${health.data?.performance_mode || 'unknown'}`);
        
        // Test all modes
        const results = await this.testAllModes(task);
        
        // Display comprehensive results
        this.displayResults(results, task);
        
        return results;
    }
}

// Command line interface
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node test-replit-modes.js <replit-base-url> [test-query]');
        console.log('');
        console.log('Examples:');
        console.log('  node test-replit-modes.js https://your-repl.replit.dev');
        console.log('  node test-replit-modes.js https://your-repl.replit.dev "Tell me about Pikachu"');
        console.log('  node test-replit-modes.js https://your-repl.replit.dev "What are Charizard\'s competitive stats?"');
        process.exit(1);
    }
    
    const baseUrl = args[0];
    const task = args[1] || "Tell me about Pikachu for competitive battling";
    
    try {
        const tester = new ReplitModeTestSuite(baseUrl);
        await tester.runComprehensiveTest(task);
    } catch (error) {
        console.error('🚨 Test suite failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = ReplitModeTestSuite;
