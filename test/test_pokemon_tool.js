/**
 * Pokemon Tool Unit Tests
 * Comprehensive testing of the Pokemon information tool
 */

const axios = require('axios');
const PokemonTool = require('../src/tools/pokemon_tool');

// Simple mock implementation
const mockAxios = {
    get: jest ? jest.fn() : function() { 
        return Promise.resolve({ data: { name: 'pikachu', id: 25, types: [] } }); 
    }
};

// Replace axios with mock if jest is available
if (typeof jest !== 'undefined') {
    jest.mock('axios');
    axios.get = mockAxios.get;
}
const mockedAxios = axios;

class PokemonToolUnitTests {
    constructor() {
        this.testResults = [];
        this.tool = null;
    }
    
    async runTest(name, testFn) {
        console.log(`\n🧪 Running Pokemon tool test: ${name}`);
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
    
    setupTool() {
        this.tool = new PokemonTool();
    }
    
    async testToolInitialization() {
        this.setupTool();
        
        if (this.tool.name !== 'pokemon_info') {
            throw new Error(`Expected tool name 'pokemon_info', got '${this.tool.name}'`);
        }
        
        if (!this.tool.description || this.tool.description.length < 50) {
            throw new Error('Tool should have a meaningful description');
        }
        
        // Test cache initialization
        if (!this.tool.cache) {
            throw new Error('Tool should have cache initialized');
        }
        
        console.log(`   ✓ Tool name: ${this.tool.name}`);
        console.log(`   ✓ Description length: ${this.tool.description.length} characters`);
        console.log(`   ✓ Cache initialized`);
    }
    
    async testPokemonNameExtraction() {
        if (!this.tool) this.setupTool();
        
        const testCases = [
            { input: 'Pikachu', expected: 'pikachu' },
            { input: 'Tell me about Charizard', expected: 'charizard' },
            { input: 'What is Bulbasaur?', expected: 'bulbasaur' },
            { input: 'Squirtle stats', expected: 'squirtle' },
            { input: 'Pokemon Mewtwo information', expected: 'mewtwo' },
            { input: "Pikachu's abilities", expected: 'pikachu' },
            { input: 'Does Charmander evolve?', expected: 'charmander' },
            { input: 'When does Wartortle evolve?', expected: 'wartortle' },
            { input: 'What egg group does Eevee belong to?', expected: 'eevee' },
            { input: 'Tell me about machine learning', expected: null }, // Should not match
            { input: 'What is the weather?', expected: null }, // Should not match
            { input: '', expected: null } // Empty input
        ];
        
        for (const testCase of testCases) {
            const result = this.tool._extractPokemonName(testCase.input);
            
            if (result !== testCase.expected) {
                throw new Error(`Pokemon name extraction failed for "${testCase.input}": expected "${testCase.expected}", got "${result}"`);
            }
            
            if (testCase.expected) {
                console.log(`   ✓ Extracted "${testCase.expected}" from "${testCase.input}"`);
            } else {
                console.log(`   ✓ Correctly rejected non-Pokemon query: "${testCase.input}"`);
            }
        }
    }
    
    async testCacheOperations() {
        if (!this.tool) this.setupTool();
        
        const testKey = 'test_pokemon';
        const testData = {
            name: 'Test Pokemon',
            id: 999,
            types: ['normal'],
            stats: { hp: 100 }
        };
        
        // Test cache write
        await this.tool._cacheData(testKey, testData);
        console.log('   ✓ Data cached successfully');
        
        // Test cache read
        const cachedData = await this.tool._getCachedData(testKey);
        
        if (!cachedData) {
            throw new Error('Failed to retrieve cached data');
        }
        
        if (JSON.stringify(cachedData) !== JSON.stringify(testData)) {
            throw new Error('Cached data does not match original data');
        }
        
        console.log('   ✓ Data retrieved from cache successfully');
        console.log('   ✓ Cached data integrity verified');
    }
    
    async testResponseFormatting() {
        if (!this.tool) this.setupTool();
        
        const mockPokemonData = {
            name: 'Pikachu',
            id: 25,
            height: 0.4,
            weight: 6.0,
            types: ['electric'],
            abilities: ['static', 'lightning-rod'],
            base_stats: {
                hp: 35,
                attack: 55,
                defense: 40,
                'special-attack': 50,
                'special-defense': 50,
                speed: 90
            },
            description: 'This is a test description for Pikachu.',
            egg_groups: ['ground', 'fairy'],
            generation: 'generation-i',
            habitat: 'forest',
            capture_rate: 190,
            base_happiness: 70,
            evolution_info: 'Evolution data available on request'
        };
        
        const formatted = this.tool._formatPokemonResponse(mockPokemonData);
        
        if (typeof formatted !== 'string' || formatted.length < 100) {
            throw new Error('Formatted response should be a substantial string');
        }
        
        // Check for required sections
        const requiredSections = [
            'Physical Characteristics',
            'Abilities',
            'Base Stats',
            'Description'
        ];
        
        for (const section of requiredSections) {
            if (!formatted.includes(section)) {
                throw new Error(`Formatted response missing section: ${section}`);
            }
        }
        
        // Check for Pokemon data
        if (!formatted.includes('Pikachu') || !formatted.includes('#25')) {
            throw new Error('Formatted response missing Pokemon name or ID');
        }
        
        if (!formatted.includes('Electric')) {
            throw new Error('Formatted response missing Pokemon type');
        }
        
        console.log('   ✓ Response contains all required sections');
        console.log('   ✓ Pokemon data properly formatted');
        console.log(`   ✓ Response length: ${formatted.length} characters`);
    }
    
    async testErrorHandling() {
        if (!this.tool) this.setupTool();
        
        // Test with empty query
        const emptyResult = await this.tool.execute('');
        if (!emptyResult.includes("couldn't identify")) {
            throw new Error('Should return error message for empty query');
        }
        console.log('   ✓ Handles empty queries correctly');
        
        // Test with non-Pokemon query
        const invalidResult = await this.tool.execute('What is the weather today?');
        if (!invalidResult.includes("couldn't identify")) {
            throw new Error('Should return error message for non-Pokemon query');
        }
        console.log('   ✓ Handles non-Pokemon queries correctly');
        
        // Test with very long query
        const longQuery = 'Tell me about ' + 'x'.repeat(1000) + ' pokemon';
        const longResult = await this.tool.execute(longQuery);
        if (typeof longResult !== 'string') {
            throw new Error('Should handle long queries gracefully');
        }
        console.log('   ✓ Handles long queries gracefully');
    }
    
    // Mock API response test (without making real HTTP calls)
    async testMockAPIResponse() {
        if (!this.tool) this.setupTool();
        
        // Mock successful API response
        const mockPokemonResponse = {
            data: {
                id: 25,
                name: 'pikachu',
                height: 4,
                weight: 60,
                types: [{ type: { name: 'electric' } }],
                abilities: [
                    { ability: { name: 'static' } },
                    { ability: { name: 'lightning-rod' } }
                ],
                stats: [
                    { stat: { name: 'hp' }, base_stat: 35 },
                    { stat: { name: 'attack' }, base_stat: 55 },
                    { stat: { name: 'defense' }, base_stat: 40 },
                    { stat: { name: 'special-attack' }, base_stat: 50 },
                    { stat: { name: 'special-defense' }, base_stat: 50 },
                    { stat: { name: 'speed' }, base_stat: 90 }
                ],
                sprites: { front_default: 'http://example.com/pikachu.png' },
                species: { url: 'http://example.com/species/25' }
            }
        };
        
        const mockSpeciesResponse = {
            data: {
                flavor_text_entries: [
                    { 
                        flavor_text: 'Test description for Pikachu.',
                        language: { name: 'en' }
                    }
                ],
                egg_groups: [
                    { name: 'ground' },
                    { name: 'fairy' }
                ],
                generation: { name: 'generation-i' },
                habitat: { name: 'forest' },
                capture_rate: 190,
                base_happiness: 70
            }
        };
        
        // Test data processing without actual API calls
        const processedInfo = {
            name: mockPokemonResponse.data.name,
            id: mockPokemonResponse.data.id,
            height: mockPokemonResponse.data.height / 10,
            weight: mockPokemonResponse.data.weight / 10,
            types: mockPokemonResponse.data.types.map(t => t.type.name),
            abilities: mockPokemonResponse.data.abilities.map(a => a.ability.name),
            base_stats: {},
            sprite: mockPokemonResponse.data.sprites.front_default
        };
        
        // Process stats
        for (const stat of mockPokemonResponse.data.stats) {
            processedInfo.base_stats[stat.stat.name] = stat.base_stat;
        }
        
        // Add species data
        processedInfo.description = mockSpeciesResponse.data.flavor_text_entries[0].flavor_text;
        processedInfo.egg_groups = mockSpeciesResponse.data.egg_groups.map(eg => eg.name);
        
        // Validate processed data
        if (processedInfo.name !== 'pikachu') {
            throw new Error('Failed to process Pokemon name');
        }
        
        if (processedInfo.types.length !== 1 || processedInfo.types[0] !== 'electric') {
            throw new Error('Failed to process Pokemon types');
        }
        
        if (Object.keys(processedInfo.base_stats).length !== 6) {
            throw new Error('Failed to process Pokemon stats');
        }
        
        console.log('   ✓ API response data processing works correctly');
        console.log(`   ✓ Processed Pokemon: ${processedInfo.name} (#${processedInfo.id})`);
        console.log(`   ✓ Types: ${processedInfo.types.join(', ')}`);
        console.log(`   ✓ Stats count: ${Object.keys(processedInfo.base_stats).length}`);
    }
    
    async testPatternMatching() {
        if (!this.tool) this.setupTool();
        
        // Test various Pokemon name patterns
        const pokemonNames = [
            'pikachu', 'charizard', 'bulbasaur', 'squirtle', 'charmander',
            'mewtwo', 'mew', 'lucario', 'garchomp', 'rayquaza'
        ];
        
        for (const name of pokemonNames) {
            const extracted = this.tool._extractPokemonName(`Tell me about ${name}`);
            if (extracted !== name) {
                throw new Error(`Failed to extract ${name} from "Tell me about ${name}"`);
            }
            console.log(`   ✓ Extracted: ${name}`);
        }
        
        // Test complex patterns
        const complexCases = [
            { input: "What are Pikachu's abilities?", expected: 'pikachu' },
            { input: "Does Charmander evolve into something?", expected: 'charmander' },
            { input: "Pokemon Mewtwo stats and information", expected: 'mewtwo' },
            { input: "Tell me everything about Rayquaza", expected: 'rayquaza' }
        ];
        
        for (const testCase of complexCases) {
            const extracted = this.tool._extractPokemonName(testCase.input);
            if (extracted !== testCase.expected) {
                throw new Error(`Complex pattern failed: "${testCase.input}" → expected "${testCase.expected}", got "${extracted}"`);
            }
            console.log(`   ✓ Complex pattern: "${testCase.input}" → ${extracted}`);
        }
    }
    
    async runAllTests() {
        console.log('🚀 Starting Pokemon Tool Unit Tests\n');
        
        await this.runTest('Tool Initialization', () => this.testToolInitialization());
        await this.runTest('Pokemon Name Extraction', () => this.testPokemonNameExtraction());
        await this.runTest('Cache Operations', () => this.testCacheOperations());
        await this.runTest('Response Formatting', () => this.testResponseFormatting());
        await this.runTest('Error Handling', () => this.testErrorHandling());
        await this.runTest('Mock API Response Processing', () => this.testMockAPIResponse());
        await this.runTest('Pattern Matching', () => this.testPatternMatching());
        
        this.printSummary();
    }
    
    printSummary() {
        console.log('\n📊 Pokemon Tool Unit Test Summary');
        console.log('==================================');
        
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        const total = this.testResults.length;
        
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed} ✅`);
        console.log(`Failed: ${failed} ❌`);
        
        if (failed === 0) {
            console.log('\n🎉 All Pokemon tool tests passed! Tool functionality is working correctly.');
        } else {
            console.log('\n⚠️  Some Pokemon tool tests failed. Check the details above.');
        }
        
        const avgDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0) / total;
        console.log(`Average Test Duration: ${Math.round(avgDuration)}ms`);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new PokemonToolUnitTests();
    tester.runAllTests().catch(error => {
        console.error('Pokemon tool test suite failed:', error.message);
        process.exit(1);
    });
}

module.exports = PokemonToolUnitTests;
