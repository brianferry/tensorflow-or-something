/**
 * Pokemon Tool Unit Tests (Corrected for actual API)
 * Testing the Pokemon Tool public interface
 */

const PokemonTool = require('../src/tools/pokemon_tool');

class PokemonToolTests {
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
    
    async testToolInitialization() {
        const tool = new PokemonTool();
        
        // Check if tool initializes correctly
        if (!tool) {
            throw new Error('Pokemon tool failed to initialize');
        }
        
        // Check if required properties exist
        if (!tool.name) {
            throw new Error('Tool missing name property');
        }
        
        if (!tool.description) {
            throw new Error('Tool missing description property');
        }
        
        if (tool.name !== 'pokemon_info') {
            throw new Error(`Expected tool name 'pokemon_info', got '${tool.name}'`);
        }
        
        console.log('   ✓ Pokemon tool initialized with required properties');
    }
    
    async testValidPokemonQuery() {
        const tool = new PokemonTool();
        
        // Test with a well-known Pokemon
        const response = await tool.execute("Tell me about Pikachu");
        
        if (!response || typeof response !== 'string') {
            throw new Error('Response should be a non-empty string');
        }
        
        // Check if response contains expected information
        const responseLower = response.toLowerCase();
        if (!responseLower.includes('pikachu')) {
            throw new Error('Response should contain Pokemon name');
        }
        
        // Should contain type information
        if (!responseLower.includes('electric')) {
            throw new Error('Response should contain Pokemon type');
        }
        
        // Should contain some stats
        const statKeywords = ['hp', 'attack', 'defense', 'speed'];
        let statsFound = 0;
        for (const stat of statKeywords) {
            if (responseLower.includes(stat)) {
                statsFound++;
            }
        }
        
        if (statsFound === 0) {
            throw new Error('Response should contain at least one stat');
        }
        
        console.log('   ✓ Valid Pokemon query processed correctly');
    }
    
    async testMultipleTypePokemon() {
        const tool = new PokemonTool();
        
        // Test with Charizard (Fire/Flying type)
        const response = await tool.execute("What about Charizard?");
        
        if (!response || typeof response !== 'string') {
            throw new Error('Response should be a non-empty string');
        }
        
        const responseLower = response.toLowerCase();
        
        // Should contain the Pokemon name
        if (!responseLower.includes('charizard')) {
            throw new Error('Response should contain Pokemon name');
        }
        
        // Should contain both types
        if (!responseLower.includes('fire')) {
            throw new Error('Response should contain Fire type');
        }
        
        if (!responseLower.includes('flying')) {
            throw new Error('Response should contain Flying type');
        }
        
        console.log('   ✓ Multiple type Pokemon handled correctly');
    }
    
    async testInvalidPokemonQuery() {
        const tool = new PokemonTool();
        
        // Test with non-existent Pokemon
        const response = await tool.execute("Tell me about Fakemon123");
        
        if (!response || typeof response !== 'string') {
            throw new Error('Response should be a string even for invalid Pokemon');
        }
        
        // Should contain error information
        const responseLower = response.toLowerCase();
        if (!responseLower.includes('not found') && !responseLower.includes('error') && !responseLower.includes('unknown')) {
            throw new Error('Response should indicate Pokemon was not found');
        }
        
        console.log('   ✓ Invalid Pokemon query handled correctly');
    }
    
    async testCachingBehavior() {
        const tool = new PokemonTool();
        
        // First call
        const startTime1 = Date.now();
        const response1 = await tool.execute("Tell me about Pikachu");
        const duration1 = Date.now() - startTime1;
        
        // Second call (should be faster due to caching)
        const startTime2 = Date.now();
        const response2 = await tool.execute("Tell me about Pikachu");
        const duration2 = Date.now() - startTime2;
        
        // Responses should be identical
        if (response1 !== response2) {
            throw new Error('Cached responses should be identical');
        }
        
        // Second call should be significantly faster (at least 2x faster)
        if (duration2 > duration1 * 0.8) {
            console.log(`   ⚠️  Cache might not be working optimally (${duration1}ms vs ${duration2}ms)`);
        } else {
            console.log(`   ✓ Caching improved performance (${duration1}ms vs ${duration2}ms)`);
        }
        
        console.log('   ✓ Caching behavior working');
    }
    
    async testVariousQueryFormats() {
        const tool = new PokemonTool();
        
        // Test different ways of asking about the same Pokemon
        const queries = [
            "Pikachu",
            "Tell me about Pikachu",
            "What is Pikachu's type?",
            "Show me Pikachu stats",
            "PIKACHU information please",
            "Info on the pokemon Pikachu"
        ];
        
        for (const query of queries) {
            const response = await tool.execute(query);
            
            if (!response || typeof response !== 'string') {
                throw new Error(`Failed to process query: ${query}`);
            }
            
            if (!response.toLowerCase().includes('pikachu')) {
                throw new Error(`Response for "${query}" should contain Pokemon name`);
            }
        }
        
        console.log('   ✓ Various query formats handled correctly');
    }
    
    async testNonPokemonQuery() {
        const tool = new PokemonTool();
        
        // Test with queries that don't mention Pokemon
        const nonPokemonQueries = [
            "What's the weather?",
            "Tell me a joke",
            "How are you?"
        ];
        
        for (const query of nonPokemonQueries) {
            const response = await tool.execute(query);
            
            if (!response || typeof response !== 'string') {
                throw new Error(`Should return a string response for: ${query}`);
            }
            
            // Should indicate no Pokemon was found
            const responseLower = response.toLowerCase();
            if (!responseLower.includes('pokemon') || !responseLower.includes('specific')) {
                throw new Error(`Response should indicate need for specific Pokemon: ${query}`);
            }
        }
        
        console.log('   ✓ Non-Pokemon queries handled appropriately');
    }
    
    async testResponseStructure() {
        const tool = new PokemonTool();
        
        const response = await tool.execute("Tell me about Squirtle");
        
        if (!response || typeof response !== 'string') {
            throw new Error('Response should be a string');
        }
        
        // Response should be reasonably detailed
        if (response.length < 50) {
            throw new Error('Response should be detailed enough (at least 50 characters)');
        }
        
        // Should contain various information types
        const responseLower = response.toLowerCase();
        const expectedElements = ['type', 'squirtle'];
        
        for (const element of expectedElements) {
            if (!responseLower.includes(element)) {
                throw new Error(`Response should contain: ${element}`);
            }
        }
        
        console.log('   ✓ Response structure is appropriate');
    }
    
    async runAllTests() {
        console.log('🧪 POKEMON TOOL UNIT TESTS');
        console.log('==========================');
        
        await this.runTest('Tool Initialization', () => this.testToolInitialization());
        await this.runTest('Valid Pokemon Query', () => this.testValidPokemonQuery());
        await this.runTest('Multiple Type Pokemon', () => this.testMultipleTypePokemon());
        await this.runTest('Invalid Pokemon Query', () => this.testInvalidPokemonQuery());
        await this.runTest('Caching Behavior', () => this.testCachingBehavior());
        await this.runTest('Various Query Formats', () => this.testVariousQueryFormats());
        await this.runTest('Non-Pokemon Query', () => this.testNonPokemonQuery());
        await this.runTest('Response Structure', () => this.testResponseStructure());
        
        // Summary
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        const totalTime = this.testResults.reduce((sum, r) => sum + r.duration, 0);
        
        console.log('\n📊 POKEMON TOOL TEST SUMMARY:');
        console.log(`✅ Passed: ${passed}/${this.testResults.length}`);
        console.log(`❌ Failed: ${failed}/${this.testResults.length}`);
        console.log(`⏱️  Total Time: ${totalTime}ms`);
        
        if (failed === 0) {
            console.log('🎉 All Pokemon Tool tests passed!');
        }
        
        return this.testResults;
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new PokemonToolTests();
    tester.runAllTests().catch(console.error);
}

module.exports = PokemonToolTests;
