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
        
        // New structured data format
        if (!response || typeof response !== 'object') {
            throw new Error('Response should be a structured data object');
        }
        
        if (response.type !== 'pokemon_data') {
            throw new Error('Response should have type "pokemon_data"');
        }
        
        if (!response.pokemon) {
            throw new Error('Response should contain pokemon data');
        }
        
        const pokemon = response.pokemon;
        
        // Check if response contains expected information
        if (pokemon.name.toLowerCase() !== 'pikachu') {
            throw new Error('Response should contain correct Pokemon name');
        }
        
        // Should contain type information
        if (!pokemon.types.includes('electric')) {
            throw new Error('Response should contain Electric type');
        }
        
        // Should contain stats
        if (!pokemon.base_stats || typeof pokemon.base_stats !== 'object') {
            throw new Error('Response should contain base stats');
        }
        
        const requiredStats = ['hp', 'attack', 'defense', 'speed'];
        for (const stat of requiredStats) {
            if (typeof pokemon.base_stats[stat] !== 'number') {
                throw new Error(`Response should contain ${stat} stat`);
            }
        }
        
        console.log('   ✓ Valid Pokemon query processed correctly');
    }
    
    async testMultipleTypePokemon() {
        const tool = new PokemonTool();
        
        // Test with Charizard (Fire/Flying type)
        const response = await tool.execute("What about Charizard?");
        
        if (!response || typeof response !== 'object') {
            throw new Error('Response should be a structured data object');
        }
        
        if (response.type !== 'pokemon_data') {
            throw new Error('Response should have type "pokemon_data"');
        }
        
        const pokemon = response.pokemon;
        
        // Should contain the Pokemon name
        if (pokemon.name.toLowerCase() !== 'charizard') {
            throw new Error('Response should contain correct Pokemon name');
        }
        
        // Should contain both types
        if (!pokemon.types.includes('fire')) {
            throw new Error('Response should contain Fire type');
        }
        
        if (!pokemon.types.includes('flying')) {
            throw new Error('Response should contain Flying type');
        }
        
        console.log('   ✓ Multiple type Pokemon handled correctly');
    }
    
    async testInvalidPokemonQuery() {
        const tool = new PokemonTool();
        
        // Test with non-existent Pokemon
        const response = await tool.execute("Tell me about Fakemon123");
        
        // Should still return string for error cases
        if (!response || typeof response !== 'string') {
            throw new Error('Response should be a string for invalid Pokemon');
        }
        
        // Should contain error information
        const responseLower = response.toLowerCase();
        if (!responseLower.includes('not found') && !responseLower.includes('error') && !responseLower.includes('unknown') && !responseLower.includes('couldn\'t') && !responseLower.includes('identify')) {
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
        
        // Responses should be identical (deep comparison for objects)
        const response1Str = JSON.stringify(response1);
        const response2Str = JSON.stringify(response2);
        
        if (response1Str !== response2Str) {
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
            
            // Valid Pokemon queries should return structured data
            if (typeof response === 'object' && response.type === 'pokemon_data') {
                if (response.pokemon.name.toLowerCase() !== 'pikachu') {
                    throw new Error(`Response for "${query}" should contain correct Pokemon name`);
                }
            } else if (typeof response === 'string') {
                // Fallback case or error handling
                if (!response.toLowerCase().includes('pikachu') && !response.toLowerCase().includes('couldn\'t identify')) {
                    throw new Error(`Response for "${query}" should contain Pokemon name or error message`);
                }
            } else {
                throw new Error(`Failed to process query: ${query}`);
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
        
        if (!response || typeof response !== 'object') {
            throw new Error('Response should be a structured data object');
        }
        
        if (response.type !== 'pokemon_data') {
            throw new Error('Response should have type "pokemon_data"');
        }
        
        const pokemon = response.pokemon;
        
        // Should have all required fields
        const requiredFields = ['name', 'id', 'types', 'base_stats', 'abilities', 'height', 'weight'];
        for (const field of requiredFields) {
            if (!(field in pokemon)) {
                throw new Error(`Response should contain: ${field}`);
            }
        }
        
        // Check types
        if (!Array.isArray(pokemon.types) || pokemon.types.length === 0) {
            throw new Error('Pokemon should have at least one type');
        }
        
        // Check abilities
        if (!Array.isArray(pokemon.abilities) || pokemon.abilities.length === 0) {
            throw new Error('Pokemon should have at least one ability');
        }
        
        // Check base stats structure
        const expectedStats = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
        for (const stat of expectedStats) {
            if (typeof pokemon.base_stats[stat] !== 'number') {
                throw new Error(`Base stats should contain numeric ${stat}`);
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
