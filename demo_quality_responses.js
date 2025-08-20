#!/usr/bin/env node

const TensorFlowAgent = require('./src/agent/tensorflow_agent');
const PokemonTool = require('./src/tools/pokemon_tool');

async function demonstrateQualityResponses() {
    console.log('🎯 QUALITY MODE POKEMON RESPONSES DEMONSTRATION');
    console.log('='.repeat(60));
    
    // Initialize agent in quality mode with tools
    console.log('\n🔄 Initializing agent in Quality Mode (with ML capabilities)...');
    const pokemonTool = new PokemonTool();
    const agent = new TensorFlowAgent({
        tools: [pokemonTool],
        performanceMode: 'quality'
    });
    await agent.initialize();
    
    console.log('✅ Quality Mode initialized with ML capabilities:');
    const status = agent.getStatus();
    console.log(`   - Universal Sentence Encoder: ${status.universalSentenceEncoder}`);
    console.log(`   - Custom Neural Network: ${status.customNeuralNetwork}`);
    console.log(`   - Semantic Similarity: ${status.semanticSimilarity}`);
    console.log(`   - Performance Mode: ${status.performanceMode}`);
    
    console.log('\n🐾 POKEMON QUERY RESPONSES:');
    console.log('=' * 40);
    
    // Test various Pokemon queries
    const queries = [
        "Tell me about Pikachu",
        "What are Charizard's abilities?", 
        "Show me Blastoise stats",
        "Info on the pokemon Eevee",
        "What type is Snorlax?",
        "Mewtwo information please"
    ];
    
    for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        console.log(`\n📝 Query ${i + 1}: "${query}"`);
        console.log('-'.repeat(50));
        
        const startTime = Date.now();
        const result = await agent.processTask(query);
        const endTime = Date.now();
        
        console.log(`🤖 Response (${endTime - startTime}ms):`);
        // Handle both direct result and result object formats
        const response = typeof result === 'string' ? result : (result.result || result.response || JSON.stringify(result, null, 2));
        console.log(response);
        
        if (result && typeof result === 'object') {
            if (result.tool_used) {
                console.log(`🔧 Tool Used: ${result.tool_used}`);
            }
            
            if (result.intent_classification) {
                console.log(`🧠 ML Classification: ${JSON.stringify(result.intent_classification)}`);
            }
        }
    }
    
    console.log('\n🎯 GENERAL QUERY FOR COMPARISON:');
    console.log('=' * 40);
    
    const generalQuery = "How does machine learning work?";
    console.log(`\n📝 Query: "${generalQuery}"`);
    console.log('-'.repeat(50));
    
    const startTime = Date.now();
    const result = await agent.processTask(generalQuery);
    const endTime = Date.now();
    
    console.log(`🤖 Response (${endTime - startTime}ms):`);
    // Handle both direct result and result object formats
    const response = typeof result === 'string' ? result : (result.result || result.response || JSON.stringify(result, null, 2));
    console.log(response);
    
    if (result && typeof result === 'object' && result.intent_classification) {
        console.log(`🧠 ML Classification: ${JSON.stringify(result.intent_classification)}`);
    }
    
    console.log('\n🏆 QUALITY MODE FEATURES DEMONSTRATED:');
    console.log('✅ ML-enhanced intent classification');
    console.log('✅ Neural network-based text understanding');
    console.log('✅ Semantic similarity processing');
    console.log('✅ Advanced Pokemon information retrieval');
    console.log('✅ High-quality response generation');
    console.log('✅ Real-time performance metrics');
    
    console.log('\n🎉 Quality Mode demonstration complete!');
}

// Run the demonstration
demonstrateQualityResponses().catch(console.error);
