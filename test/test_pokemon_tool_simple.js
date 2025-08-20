/**
 * Pokemon Tool Unit Tests (Jest-free version)
 * Comprehensive testing of the Pokemon information tool
 */

const axios = require('axios');
const PokemonTool = require('../src/tools/pokemon_tool');

class PokemonToolTests {
    constructor() {
        this.testResults = [];
        this.originalAxios = axios.get;
    }
    
    async setupMocks() {
        // Mock axios responses for testing
        this.mockResponses = {
            pikachu: {
                data: {
                    name: 'pikachu',
                    id: 25,
                    height: 4,
                    weight: 60,
                    types: [
                        { type: { name: 'electric' } }
                    ],
                    abilities: [
                        { ability: { name: 'static' } },
                        { ability: { name: 'lightning-rod' } }
                    ],
                    stats: [
                        { base_stat: 35, stat: { name: 'hp' } },
                        { base_stat: 55, stat: { name: 'attack' } },
                        { base_stat: 40, stat: { name: 'defense' } },
                        { base_stat: 50, stat: { name: 'special-attack' } },
                        { base_stat: 50, stat: { name: 'special-defense' } },
                        { base_stat: 90, stat: { name: 'speed' } }
                    ]
                }
            },
            charizard: {
                data: {
                    name: 'charizard',
                    id: 6,
                    height: 17,
                    weight: 905,
                    types: [
                        { type: { name: 'fire' } },
                        { type: { name: 'flying' } }
                    ],
                    abilities: [
                        { ability: { name: 'blaze' } },
                        { ability: { name: 'solar-power' } }
                    ],
                    stats: [
                        { base_stat: 78, stat: { name: 'hp' } },
                        { base_stat: 84, stat: { name: 'attack' } },
                        { base_stat: 78, stat: { name: 'defense' } },
                        { base_stat: 109, stat: { name: 'special-attack' } },
                        { base_stat: 85, stat: { name: 'special-defense' } },
                        { base_stat: 100, stat: { name: 'speed' } }
                    ]
                }
            }
        };
    }
    
    mockAxiosGet(url) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (url.includes('pikachu')) {
                    resolve(this.mockResponses.pikachu);
                } else if (url.includes('charizard')) {
                    resolve(this.mockResponses.charizard);
                } else if (url.includes('nonexistent')) {
                    reject(new Error('Request failed with status code 404'));
                } else {
                    reject(new Error('Unknown Pokemon'));
                }
            }, 10);
        });
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
    
    async testPokemonNameExtraction() {
        const tool = new PokemonTool();
        
        // Test cases for name extraction
        const testCases = [
            { input: "Tell me about Pikachu", expected: "pikachu" },
            { input: "What is Charizard's type?", expected: "charizard" },
            { input: "pokemon BULBASAUR information", expected: "bulbasaur" },
            { input: "Info on Squirtle please", expected: "squirtle" },
            { input: "Can you tell me about the pokemon Mewtwo?", expected: "mewtwo" },
            { input: "POKEMON: Eevee stats", expected: "eevee" },
            { input: "no pokemon mentioned here", expected: null },
            { input: "", expected: null }
        ];
        
        for (const testCase of testCases) {
            const result = tool.extractPokemonName(testCase.input);
            if (result !== testCase.expected) {
                throw new Error(`Expected '${testCase.expected}' but got '${result}' for input: '${testCase.input}'`);
            }
        }
        
        console.log(`   ✓ Tested ${testCases.length} name extraction scenarios`);
    }
    
    async testPokemonAPICall() {
        // Replace axios.get with our mock
        const originalGet = axios.get;
        axios.get = this.mockAxiosGet.bind(this);
        
        try {
            const tool = new PokemonTool();
            
            // Test successful API call
            const result = await tool.fetchPokemonData('pikachu');
            
            if (!result || result.name !== 'pikachu') {
                throw new Error('Failed to fetch Pikachu data correctly');
            }
            
            if (result.id !== 25) {
                throw new Error(`Expected Pikachu ID to be 25, got ${result.id}`);
            }
            
            console.log('   ✓ Successfully fetched Pokemon data from mock API');
            
        } finally {
            // Restore original axios.get
            axios.get = originalGet;
        }
    }
    
    async testCachingBehavior() {
        const originalGet = axios.get;
        let apiCallCount = 0;
        
        // Mock axios to count calls
        axios.get = (...args) => {
            apiCallCount++;
            return this.mockAxiosGet.bind(this)(...args);
        };
        
        try {
            const tool = new PokemonTool();
            
            // First call should hit the API
            await tool.fetchPokemonData('pikachu');
            const firstCallCount = apiCallCount;
            
            // Second call should use cache
            await tool.fetchPokemonData('pikachu');
            const secondCallCount = apiCallCount;
            
            if (secondCallCount !== firstCallCount) {
                throw new Error('Cache not working - second call hit the API');
            }
            
            console.log('   ✓ Caching mechanism working correctly');
            
        } finally {
            axios.get = originalGet;
        }
    }
    
    async testErrorHandling() {
        const originalGet = axios.get;
        axios.get = this.mockAxiosGet.bind(this);
        
        try {
            const tool = new PokemonTool();
            
            // Test with non-existent Pokemon
            try {
                await tool.fetchPokemonData('nonexistent');
                throw new Error('Should have thrown an error for non-existent Pokemon');
            } catch (error) {
                if (!error.message.includes('404') && !error.message.includes('Unknown Pokemon')) {
                    throw new Error(`Unexpected error message: ${error.message}`);
                }
            }
            
            console.log('   ✓ Error handling working correctly for invalid Pokemon');
            
        } finally {
            axios.get = originalGet;
        }
    }
    
    async testResponseFormatting() {
        const originalGet = axios.get;
        axios.get = this.mockAxiosGet.bind(this);
        
        try {
            const tool = new PokemonTool();
            const query = "Tell me about Pikachu";
            const response = await tool.execute(query);
            
            // Check response structure
            if (!response || typeof response !== 'string') {
                throw new Error('Response should be a string');
            }
            
            // Check if response contains expected information
            if (!response.toLowerCase().includes('pikachu')) {
                throw new Error('Response should contain Pokemon name');
            }
            
            if (!response.toLowerCase().includes('electric')) {
                throw new Error('Response should contain Pokemon type');
            }
            
            console.log('   ✓ Response formatting is correct');
            
        } finally {
            axios.get = originalGet;
        }
    }
    
    async testMultipleTypes() {
        const originalGet = axios.get;
        axios.get = this.mockAxiosGet.bind(this);
        
        try {
            const tool = new PokemonTool();
            const response = await tool.execute("What about Charizard?");
            
            // Charizard should have both Fire and Flying types
            if (!response.toLowerCase().includes('fire')) {
                throw new Error('Response should contain Fire type');
            }
            
            if (!response.toLowerCase().includes('flying')) {
                throw new Error('Response should contain Flying type');
            }
            
            console.log('   ✓ Multiple type handling working correctly');
            
        } finally {
            axios.get = originalGet;
        }
    }
    
    async testStatsFormatting() {
        const originalGet = axios.get;
        axios.get = this.mockAxiosGet.bind(this);
        
        try {
            const tool = new PokemonTool();
            const response = await tool.execute("Show me Pikachu stats");
            
            // Check if stats are included
            const statKeywords = ['hp', 'attack', 'defense', 'speed'];
            let statsFound = 0;
            
            for (const stat of statKeywords) {
                if (response.toLowerCase().includes(stat)) {
                    statsFound++;
                }
            }
            
            if (statsFound < 2) {
                throw new Error(`Expected at least 2 stats in response, found ${statsFound}`);
            }
            
            console.log('   ✓ Stats formatting working correctly');
            
        } finally {
            axios.get = originalGet;
        }
    }
    
    async runAllTests() {
        console.log('🧪 POKEMON TOOL UNIT TESTS');
        console.log('==========================');
        
        await this.setupMocks();
        
        await this.runTest('Pokemon Name Extraction', () => this.testPokemonNameExtraction());
        await this.runTest('Pokemon API Call', () => this.testPokemonAPICall());
        await this.runTest('Caching Behavior', () => this.testCachingBehavior());
        await this.runTest('Error Handling', () => this.testErrorHandling());
        await this.runTest('Response Formatting', () => this.testResponseFormatting());
        await this.runTest('Multiple Types', () => this.testMultipleTypes());
        await this.runTest('Stats Formatting', () => this.testStatsFormatting());
        
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
