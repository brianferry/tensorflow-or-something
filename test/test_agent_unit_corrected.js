/**
 * Agent Unit Tests (Corrected for actual API)
 * Testing the TensorFlow.js Agent public interface
 */

const TensorFlowAgent = require('../src/agent/tensorflow_agent');
const PokemonTool = require('../src/tools/pokemon_tool');

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
        const pokemonTool = new PokemonTool();
        const agent = new TensorFlowAgent({
            tools: [pokemonTool],
            performanceMode: 'balanced'
        });
        
        // Check if agent initializes correctly
        if (!agent) {
            throw new Error('Agent failed to initialize');
        }
        
        // Check if required properties exist
        if (!agent.performanceMode) {
            throw new Error('Agent missing performanceMode property');
        }
        
        if (!agent.tools || !Array.isArray(agent.tools)) {
            throw new Error('Agent missing tools array');
        }
        
        if (agent.tools.length !== 1) {
            throw new Error(`Expected 1 tool, got ${agent.tools.length}`);
        }
        
        console.log('   ✓ Agent initialized with required properties');
    }
    
    async testAgentInitialize() {
        const pokemonTool = new PokemonTool();
        const agent = new TensorFlowAgent({
            tools: [pokemonTool],
            performanceMode: 'fast'
        });
        
        // Test agent initialization
        await agent.initialize();
        
        if (!agent.isInitialized) {
            throw new Error('Agent not marked as initialized');
        }
        
        console.log('   ✓ Agent initialization method working correctly');
    }
    
    async testPerformanceModes() {
        const pokemonTool = new PokemonTool();
        const modes = ['fast', 'balanced', 'quality'];
        
        for (const mode of modes) {
            const agent = new TensorFlowAgent({
                tools: [pokemonTool],
                performanceMode: mode
            });
            
            if (agent.performanceMode !== mode) {
                throw new Error(`Failed to set performance mode to ${mode}`);
            }
            
            await agent.initialize();
            
            // Test that each mode can process queries
            const testQuery = "Hello there";
            const result = await agent.processTask(testQuery);
            
            if (!result || typeof result !== 'string') {
                throw new Error(`Performance mode ${mode} failed to process query`);
            }
        }
        
        console.log('   ✓ All performance modes working correctly');
    }
    
    async testToolsInfo() {
        const pokemonTool = new PokemonTool();
        const agent = new TensorFlowAgent({
            tools: [pokemonTool]
        });
        
        await agent.initialize();
        
        const toolsInfo = agent.getToolsInfo();
        
        if (!Array.isArray(toolsInfo)) {
            throw new Error('getToolsInfo should return an array');
        }
        
        if (toolsInfo.length !== 1) {
            throw new Error(`Expected 1 tool info, got ${toolsInfo.length}`);
        }
        
        if (!toolsInfo[0].name) {
            throw new Error('Tool info should have a name property');
        }
        
        console.log('   ✓ Tools info retrieval working correctly');
    }
    
    async testAgentStatus() {
        const pokemonTool = new PokemonTool();
        const agent = new TensorFlowAgent({
            tools: [pokemonTool],
            performanceMode: 'balanced'
        });
        
        await agent.initialize();
        
        const status = agent.getStatus();
        
        if (!status || typeof status !== 'object') {
            throw new Error('getStatus should return an object');
        }
        
        const requiredFields = ['initialized', 'performance_mode', 'tools_count'];
        for (const field of requiredFields) {
            if (!(field in status)) {
                throw new Error(`Status missing required field: ${field}`);
            }
        }
        
        if (status.initialized !== true) {
            throw new Error('Agent should be marked as initialized');
        }
        
        if (status.performance_mode !== 'balanced') {
            throw new Error(`Expected balanced mode, got ${status.performance_mode}`);
        }
        
        if (status.tools_count !== 1) {
            throw new Error(`Expected 1 tool, got ${status.tools_count}`);
        }
        
        console.log('   ✓ Agent status reporting working correctly');
    }
    
    async testGeneralTaskProcessing() {
        const pokemonTool = new PokemonTool();
        const agent = new TensorFlowAgent({
            tools: [pokemonTool]
        });
        
        await agent.initialize();
        
        // Test various general queries
        const generalQueries = [
            "Hello, how are you?",
            "What can you do?",
            "Tell me about programming",
            "How does machine learning work?"
        ];
        
        for (const query of generalQueries) {
            const response = await agent.processTask(query);
            
            if (!response || typeof response !== 'string') {
                throw new Error(`Failed to process general query: ${query}`);
            }
            
            if (response.length < 10) {
                throw new Error(`Response too short for query: ${query}`);
            }
        }
        
        console.log('   ✓ General task processing working correctly');
    }
    
    async testPokemonTaskRouting() {
        const pokemonTool = new PokemonTool();
        const agent = new TensorFlowAgent({
            tools: [pokemonTool]
        });
        
        await agent.initialize();
        
        // Test Pokemon queries that should route to the tool
        const pokemonQueries = [
            "Tell me about Pikachu",
            "What is Charizard's type?",
            "Show me Bulbasaur stats"
        ];
        
        for (const query of pokemonQueries) {
            const response = await agent.processTask(query);
            
            if (!response || typeof response !== 'string') {
                throw new Error(`Failed to process Pokemon query: ${query}`);
            }
            
            // Response should be more detailed for Pokemon queries
            if (response.length < 50) {
                throw new Error(`Pokemon response too short for query: ${query}`);
            }
        }
        
        console.log('   ✓ Pokemon task routing working correctly');
    }
    
    async testErrorHandling() {
        const agent = new TensorFlowAgent({
            tools: []
        });
        
        // Test processing without initialization
        try {
            await agent.processTask("test");
            throw new Error('Should have thrown error for uninitialized agent');
        } catch (error) {
            if (!error.message.includes('not initialized')) {
                throw new Error(`Unexpected error message: ${error.message}`);
            }
        }
        
        console.log('   ✓ Error handling working correctly');
    }
    
    async runAllTests() {
        console.log('🧪 TENSORFLOW AGENT UNIT TESTS');
        console.log('===============================');
        
        await this.runTest('Agent Initialization', () => this.testAgentInitialization());
        await this.runTest('Agent Initialize Method', () => this.testAgentInitialize());
        await this.runTest('Performance Modes', () => this.testPerformanceModes());
        await this.runTest('Tools Info', () => this.testToolsInfo());
        await this.runTest('Agent Status', () => this.testAgentStatus());
        await this.runTest('General Task Processing', () => this.testGeneralTaskProcessing());
        await this.runTest('Pokemon Task Routing', () => this.testPokemonTaskRouting());
        await this.runTest('Error Handling', () => this.testErrorHandling());
        
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
