/**
 * Unit Tests for TensorFlow Agent
 * Tests the core agent functionality in isolation
 */

const TensorFlowAgent = require('../src/agent/tensorflow_agent');
const PokemonTool = require('../src/tools/pokemon_tool');

class TensorFlowAgentUnitTests {
    constructor() {
        this.testResults = [];
        this.agent = null;
        this.mockCache = new Map();
    }
    
    async runTest(name, testFn) {
        console.log(`\n🧪 Running unit test: ${name}`);
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
    
    async setupAgent() {
        const pokemonTool = new PokemonTool();
        this.agent = new TensorFlowAgent({
            tools: [pokemonTool],
            performanceMode: 'balanced',
            cache: this.mockCache
        });
        await this.agent.initialize();
    }
    
    async testAgentInitialization() {
        await this.setupAgent();
        
        if (!this.agent.isInitialized) {
            throw new Error('Agent should be initialized');
        }
        
        const status = this.agent.getStatus();
        if (status.tools_count !== 1) {
            throw new Error(`Expected 1 tool, got ${status.tools_count}`);
        }
        
        if (status.performance_mode !== 'balanced') {
            throw new Error(`Expected balanced mode, got ${status.performance_mode}`);
        }
        
        console.log(`   ✓ Agent initialized with ${status.tools_count} tools`);
        console.log(`   ✓ Performance mode: ${status.performance_mode}`);
    }
    
    async testIntentClassification() {
        if (!this.agent) await this.setupAgent();
        
        // Test Pokemon intent classification
        const pokemonQueries = [
            'Tell me about Pikachu',
            'What is Charizard?',
            'Bulbasaur stats',
            'Pokemon Squirtle information'
        ];
        
        for (const query of pokemonQueries) {
            const classification = this.agent._classifyIntent(query);
            if (classification.intent !== 'tool' || classification.tool !== 'pokemon_info') {
                throw new Error(`Pokemon query "${query}" misclassified: ${JSON.stringify(classification)}`);
            }
            console.log(`   ✓ Pokemon query classified correctly: "${query}"`);
        }
        
        // Test general intent classification
        const generalQueries = [
            'What is machine learning?',
            'Hello, how are you?',
            'Tell me about programming',
            'How does AI work?'
        ];
        
        for (const query of generalQueries) {
            const classification = this.agent._classifyIntent(query);
            if (classification.intent !== 'general') {
                throw new Error(`General query "${query}" misclassified: ${JSON.stringify(classification)}`);
            }
            console.log(`   ✓ General query classified correctly: "${query}"`);
        }
    }
    
    async testTextPreprocessing() {
        if (!this.agent) await this.setupAgent();
        
        const testCases = [
            {
                input: 'Tell me about Pikachu!',
                expected: ['tell', 'me', 'about', 'pikachu']
            },
            {
                input: 'What is machine learning?',
                expected: ['what', 'is', 'machin', 'learn']
            },
            {
                input: 'Hello, how are you doing today?',
                expected: ['hello', 'how', 'are', 'you', 'do', 'todai']
            }
        ];
        
        for (const testCase of testCases) {
            const processed = this.agent._preprocessText(testCase.input);
            
            // Check that basic tokenization worked
            if (!Array.isArray(processed)) {
                throw new Error(`Expected array, got ${typeof processed}`);
            }
            
            if (processed.length === 0) {
                throw new Error(`Empty result for input: "${testCase.input}"`);
            }
            
            console.log(`   ✓ Preprocessed "${testCase.input}" → [${processed.join(', ')}]`);
        }
    }
    
    async testToolPatternGeneration() {
        if (!this.agent) await this.setupAgent();
        
        const pokemonTool = this.agent.tools.find(t => t.name === 'pokemon_info');
        const patterns = this.agent._generateToolPatterns(pokemonTool);
        
        if (!Array.isArray(patterns) || patterns.length === 0) {
            throw new Error('Expected non-empty array of patterns');
        }
        
        // Test that patterns work
        const testTexts = [
            'Tell me about Pikachu',
            'What is pokemon?',
            'Charizard stats'
        ];
        
        for (const text of testTexts) {
            let matched = false;
            for (const pattern of patterns) {
                if (pattern.test(text)) {
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                throw new Error(`Pattern matching failed for: "${text}"`);
            }
            console.log(`   ✓ Pattern matched: "${text}"`);
        }
        
        console.log(`   ✓ Generated ${patterns.length} patterns for Pokemon tool`);
    }
    
    async testPerformanceModes() {
        const modes = ['fast', 'balanced', 'quality'];
        
        for (const mode of modes) {
            const pokemonTool = new PokemonTool();
            const agent = new TensorFlowAgent({
                tools: [pokemonTool],
                performanceMode: mode,
                cache: new Map()
            });
            
            await agent.initialize();
            
            const status = agent.getStatus();
            if (status.performance_mode !== mode) {
                throw new Error(`Expected mode ${mode}, got ${status.performance_mode}`);
            }
            
            console.log(`   ✓ ${mode} mode initialized correctly`);
        }
    }
    
    async testGeneralResponseGeneration() {
        if (!this.agent) await this.setupAgent();
        
        const testCases = [
            { input: 'What is programming?', expectedKeywords: ['programming', 'instructions', 'computer'] },
            { input: 'Hello!', expectedKeywords: ['hello', 'ai', 'agent'] },
            { input: 'What is machine learning?', expectedKeywords: ['machine', 'learning', 'tensorflow'] },
            { input: 'How are you?', expectedKeywords: ['well', 'thank', 'ready'] }
        ];
        
        for (const testCase of testCases) {
            const response = this.agent._generateGeneralResponse(testCase.input);
            
            if (typeof response !== 'string' || response.length < 10) {
                throw new Error(`Invalid response for "${testCase.input}": ${response}`);
            }
            
            // Check for expected keywords
            const lowerResponse = response.toLowerCase();
            let keywordFound = false;
            for (const keyword of testCase.expectedKeywords) {
                if (lowerResponse.includes(keyword.toLowerCase())) {
                    keywordFound = true;
                    break;
                }
            }
            
            if (!keywordFound) {
                throw new Error(`Response lacks expected keywords for "${testCase.input}": ${response}`);
            }
            
            console.log(`   ✓ Generated appropriate response for: "${testCase.input}"`);
        }
    }
    
    async testToolsInfo() {
        if (!this.agent) await this.setupAgent();
        
        const toolsInfo = this.agent.getToolsInfo();
        
        if (!Array.isArray(toolsInfo)) {
            throw new Error('getToolsInfo should return an array');
        }
        
        if (toolsInfo.length !== 1) {
            throw new Error(`Expected 1 tool, got ${toolsInfo.length}`);
        }
        
        const pokemonTool = toolsInfo[0];
        if (pokemonTool.name !== 'pokemon_info') {
            throw new Error(`Expected pokemon_info tool, got ${pokemonTool.name}`);
        }
        
        if (!pokemonTool.description || pokemonTool.description.length < 10) {
            throw new Error('Tool should have a meaningful description');
        }
        
        console.log(`   ✓ Tools info contains: ${pokemonTool.name}`);
        console.log(`   ✓ Description length: ${pokemonTool.description.length} characters`);
    }
    
    async testErrorHandling() {
        if (!this.agent) await this.setupAgent();
        
        // Test with invalid tool name
        try {
            await this.agent._executeToolTask('invalid_tool', 'test query');
            throw new Error('Should have thrown error for invalid tool');
        } catch (error) {
            if (!error.message.includes('not found')) {
                throw new Error(`Unexpected error message: ${error.message}`);
            }
            console.log('   ✓ Handles invalid tool names correctly');
        }
        
        // Test empty query handling
        const emptyResult = await this.agent._executeGeneralTask('');
        if (typeof emptyResult !== 'string') {
            throw new Error('Should return string for empty query');
        }
        console.log('   ✓ Handles empty queries gracefully');
    }
    
    async runAllTests() {
        console.log('🚀 Starting TensorFlow Agent Unit Tests\n');
        
        await this.runTest('Agent Initialization', () => this.testAgentInitialization());
        await this.runTest('Intent Classification', () => this.testIntentClassification());
        await this.runTest('Text Preprocessing', () => this.testTextPreprocessing());
        await this.runTest('Tool Pattern Generation', () => this.testToolPatternGeneration());
        await this.runTest('Performance Modes', () => this.testPerformanceModes());
        await this.runTest('General Response Generation', () => this.testGeneralResponseGeneration());
        await this.runTest('Tools Info', () => this.testToolsInfo());
        await this.runTest('Error Handling', () => this.testErrorHandling());
        
        this.printSummary();
    }
    
    printSummary() {
        console.log('\n📊 Unit Test Summary');
        console.log('====================');
        
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        const total = this.testResults.length;
        
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed} ✅`);
        console.log(`Failed: ${failed} ❌`);
        
        if (failed === 0) {
            console.log('\n🎉 All unit tests passed! Agent core functionality is working correctly.');
        } else {
            console.log('\n⚠️  Some unit tests failed. Check the details above.');
        }
        
        const avgDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0) / total;
        console.log(`Average Test Duration: ${Math.round(avgDuration)}ms`);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new TensorFlowAgentUnitTests();
    tester.runAllTests().catch(error => {
        console.error('Unit test suite failed:', error.message);
        process.exit(1);
    });
}

module.exports = TensorFlowAgentUnitTests;
