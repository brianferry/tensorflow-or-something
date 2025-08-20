/**
 * Agent Unit Tests (Jest-free version)
 * Comprehensive testing of the TensorFlow.js Agent core functionality
 */

const TensorFlowAgent = require('../src/agent/tensorflow_agent');

class AgentUnitTests {
    constructor() {
        this.testResults = [];
    }
    
    async runTest(testName, testFunction) {
        console.log(`\n🧪 Running: ${testName}`);
        const startTime = Date.now();
        
        try {
            await testFunction();
            const duration = Date.now() - startTime;
            console.log(`✅ PASSED: ${testName} (${duration}ms)`);
            this.testResults.push({ test: testName, status: 'PASSED', duration });
        } catch (error) {
            const duration = Date.now() - startTime;
            console.log(`❌ FAILED: ${testName} (${duration}ms)`);
            console.log(`   Error: ${error.message}`);
            this.testResults.push({ test: testName, status: 'FAILED', duration, error: error.message });
        }
    }
    
    async testAgentInitialization() {
        const agent = new TensorFlowAgent();
        
        // Check if agent initializes correctly
        if (!agent) {
            throw new Error('Agent failed to initialize');
        }
        
        // Check if required properties exist
        if (!agent.performanceMode) {
            throw new Error('Agent missing performanceMode property');
        }
        
        if (!agent.cache) {
            throw new Error('Agent missing cache property');
        }
        
        console.log('   ✓ Agent initialized with required properties');
    }
    
    async testIntentClassification() {
        const agent = new TensorFlowAgent();
        
        // Test Pokemon-related queries
        const pokemonQueries = [
            "Tell me about Pikachu",
            "What is Charizard's type?",
            "Pokemon Bulbasaur information",
            "Show me stats for Eevee"
        ];
        
        for (const query of pokemonQueries) {
            const intent = agent.classifyIntent(query);
            if (intent !== 'pokemon') {
                throw new Error(`Expected 'pokemon' intent for "${query}", got "${intent}"`);
            }
        }
        
        // Test general queries
        const generalQueries = [
            "Hello, how are you?",
            "What's the weather like?",
            "Tell me a joke",
            "How does machine learning work?"
        ];
        
        for (const query of generalQueries) {
            const intent = agent.classifyIntent(query);
            if (intent !== 'general') {
                throw new Error(`Expected 'general' intent for "${query}", got "${intent}"`);
            }
        }
        
        console.log('   ✓ Intent classification working correctly');
    }
    
    async testTextPreprocessing() {
        const agent = new TensorFlowAgent();
        
        // Test preprocessing
        const testCases = [
            { 
                input: "Hello, WORLD! How are you?", 
                expected: ["hello", "world", "how", "are", "you"]
            },
            { 
                input: "Tell me about Pikachu's stats!", 
                expected: ["tell", "me", "about", "pikachu", "stats"]
            },
            { 
                input: "What's the weather like today?", 
                expected: ["what", "the", "weather", "like", "today"]
            }
        ];
        
        for (const testCase of testCases) {
            const result = agent.preprocessText(testCase.input);
            
            // Check if result contains expected tokens
            for (const expectedToken of testCase.expected) {
                if (!result.includes(expectedToken)) {
                    throw new Error(`Expected token "${expectedToken}" not found in preprocessed text: ${result.join(', ')}`);
                }
            }
        }
        
        console.log('   ✓ Text preprocessing working correctly');
    }
    
    async testToolPatternGeneration() {
        const agent = new TensorFlowAgent();
        
        // Test pattern generation
        const patterns = agent._generateToolPatterns();
        
        if (!patterns || typeof patterns !== 'object') {
            throw new Error('Tool patterns should be an object');
        }
        
        if (!patterns.pokemon) {
            throw new Error('Pokemon patterns not found');
        }
        
        if (!Array.isArray(patterns.pokemon)) {
            throw new Error('Pokemon patterns should be an array');
        }
        
        if (patterns.pokemon.length === 0) {
            throw new Error('Pokemon patterns array is empty');
        }
        
        // Check if patterns contain expected keywords
        const pokemonPatterns = patterns.pokemon.join(' ').toLowerCase();
        const expectedKeywords = ['pokemon', 'pikachu', 'stats', 'type'];
        
        for (const keyword of expectedKeywords) {
            if (!pokemonPatterns.includes(keyword)) {
                throw new Error(`Expected keyword "${keyword}" not found in Pokemon patterns`);
            }
        }
        
        console.log('   ✓ Tool pattern generation working correctly');
    }
    
    async testPerformanceModes() {
        const agent = new TensorFlowAgent();
        
        // Test different performance modes
        const modes = ['fast', 'balanced', 'quality'];
        
        for (const mode of modes) {
            agent.setPerformanceMode(mode);
            
            if (agent.performanceMode !== mode) {
                throw new Error(`Failed to set performance mode to ${mode}`);
            }
            
            // Test that each mode processes queries
            const testQuery = "Tell me about Pikachu";
            const result = await agent.processQuery(testQuery);
            
            if (!result || typeof result !== 'string') {
                throw new Error(`Performance mode ${mode} failed to process query`);
            }
        }
        
        console.log('   ✓ All performance modes working correctly');
    }
    
    async testResponseGeneration() {
        const agent = new TensorFlowAgent();
        
        // Test general response generation
        const generalQueries = [
            "Hello, how are you?",
            "What's the weather?",
            "Tell me a joke"
        ];
        
        for (const query of generalQueries) {
            const response = agent._generateGeneralResponse(query);
            
            if (!response || typeof response !== 'string') {
                throw new Error(`Failed to generate general response for: ${query}`);
            }
            
            if (response.length < 10) {
                throw new Error(`Generated response too short for: ${query}`);
            }
        }
        
        console.log('   ✓ Response generation working correctly');
    }
    
    async testCacheIntegration() {
        const agent = new TensorFlowAgent();
        
        // Test cache operations
        const testKey = 'test_key';
        const testValue = 'test_value';
        
        // Set cache value
        agent.cache.set(testKey, testValue);
        
        // Get cache value
        const cachedValue = agent.cache.get(testKey);
        
        if (cachedValue !== testValue) {
            throw new Error(`Cache get/set failed. Expected: ${testValue}, Got: ${cachedValue}`);
        }
        
        // Test cache stats
        const stats = agent.cache.getStats();
        
        if (!stats || typeof stats !== 'object') {
            throw new Error('Cache stats should be an object');
        }
        
        console.log('   ✓ Cache integration working correctly');
    }
    
    async testToolRouting() {
        const agent = new TensorFlowAgent();
        
        // Test Pokemon tool routing
        const pokemonQuery = "Tell me about Pikachu";
        const intent = agent.classifyIntent(pokemonQuery);
        
        if (intent !== 'pokemon') {
            throw new Error(`Expected pokemon intent, got ${intent}`);
        }
        
        // Test general query routing
        const generalQuery = "Hello there";
        const generalIntent = agent.classifyIntent(generalQuery);
        
        if (generalIntent !== 'general') {
            throw new Error(`Expected general intent, got ${generalIntent}`);
        }
        
        console.log('   ✓ Tool routing working correctly');
    }
    
    async runAllTests() {
        console.log('🧪 TENSORFLOW AGENT UNIT TESTS');
        console.log('===============================');
        
        await this.runTest('Agent Initialization', () => this.testAgentInitialization());
        await this.runTest('Intent Classification', () => this.testIntentClassification());
        await this.runTest('Text Preprocessing', () => this.testTextPreprocessing());
        await this.runTest('Tool Pattern Generation', () => this.testToolPatternGeneration());
        await this.runTest('Performance Modes', () => this.testPerformanceModes());
        await this.runTest('Response Generation', () => this.testResponseGeneration());
        await this.runTest('Cache Integration', () => this.testCacheIntegration());
        await this.runTest('Tool Routing', () => this.testToolRouting());
        
        // Summary
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        const totalTime = this.testResults.reduce((sum, r) => sum + r.duration, 0);
        
        console.log('\n📊 AGENT UNIT TEST SUMMARY:');
        console.log(`✅ Passed: ${passed}/${this.testResults.length}`);
        console.log(`❌ Failed: ${failed}/${this.testResults.length}`);
        console.log(`⏱️  Total Time: ${totalTime}ms`);
        
        if (failed === 0) {
            console.log('🎉 All Agent Unit tests passed!');
        }
        
        return this.testResults;
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new AgentUnitTests();
    tester.runAllTests().catch(console.error);
}

module.exports = AgentUnitTests;
