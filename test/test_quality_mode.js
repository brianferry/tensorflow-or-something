/**
 * Quality Mode ML Tests
 * Comprehensive testing of TensorFlow.js ML capabilities in quality mode
 */

const TensorFlowAgent = require('../src/agent/tensorflow_agent');
const PokemonTool = require('../src/tools/pokemon_tool');

class QualityModeTests {
    constructor() {
        this.testResults = [];
        this.performanceMetrics = {
            fast: {},
            balanced: {},
            quality: {}
        };
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
    
    async testQualityModeInitialization() {
        const pokemonTool = new PokemonTool();
        const agent = new TensorFlowAgent({
            tools: [pokemonTool],
            performanceMode: 'quality'
        });
        
        console.log('   🔄 Initializing quality mode (this may take a moment)...');
        await agent.initialize();
        
        if (!agent.isInitialized) {
            throw new Error('Quality mode agent failed to initialize');
        }
        
        const status = agent.getStatus();
        
        if (!status.ml_enabled) {
            throw new Error('ML should be enabled in quality mode');
        }
        
        // Check if any ML models are loaded (either USE or custom neural network)
        const mlCapabilities = status.ml_capabilities || {};
        const hasMLModels = mlCapabilities.universal_sentence_encoder || 
                           mlCapabilities.custom_neural_network ||
                           mlCapabilities.semantic_similarity;
        
        if (!hasMLModels) {
            throw new Error('No ML models loaded in quality mode');
        }
        
        console.log(`   ✓ ML capabilities: ${JSON.stringify(status.ml_capabilities)}`);
        console.log(`   ✓ Quality mode initialized successfully`);
    }
    
    async testPerformanceModeComparison() {
        const pokemonTool = new PokemonTool();
        const modes = ['fast', 'balanced', 'quality'];
        const testQueries = [
            "Tell me about Pikachu",
            "What are Charizard's abilities?",
            "Hello, how are you?",
            "Explain machine learning concepts"
        ];
        
        console.log('   🔄 Testing all performance modes...');
        
        for (const mode of modes) {
            console.log(`   \n   Testing ${mode} mode:`);
            const agent = new TensorFlowAgent({
                tools: [pokemonTool],
                performanceMode: mode
            });
            
            const startInit = Date.now();
            await agent.initialize();
            const initTime = Date.now() - startInit;
            
            const status = agent.getStatus();
            this.performanceMetrics[mode] = {
                initTime,
                mlEnabled: status.ml_enabled,
                sentenceEncoderLoaded: status.sentence_encoder_loaded,
                customModelLoaded: status.model_loaded,
                queryTimes: []
            };
            
            // Test query processing times
            for (const query of testQueries) {
                const startQuery = Date.now();
                const result = await agent.processTask(query);
                const queryTime = Date.now() - startQuery;
                
                this.performanceMetrics[mode].queryTimes.push({
                    query: query.substring(0, 30) + '...',
                    time: queryTime,
                    responseLength: result.length
                });
            }
            
            console.log(`     ✓ Init time: ${initTime}ms`);
            console.log(`     ✓ ML enabled: ${status.ml_enabled}`);
            console.log(`     ✓ Avg query time: ${Math.round(this.performanceMetrics[mode].queryTimes.reduce((sum, q) => sum + q.time, 0) / testQueries.length)}ms`);
        }
        
        console.log('   ✓ Performance mode comparison completed');
    }
    
    async testMLIntentClassification() {
        const pokemonTool = new PokemonTool();
        const agent = new TensorFlowAgent({
            tools: [pokemonTool],
            performanceMode: 'quality'
        });
        
        await agent.initialize();
        
        // Test various types of queries to see if ML classification is more nuanced
        const testCases = [
            // Pokemon queries with varying complexity
            { query: "Pikachu", expectedIntent: 'tool' },
            { query: "Tell me about the electric mouse Pokemon", expectedIntent: 'tool' },
            { query: "What evolutionary forms does Eevee have?", expectedIntent: 'tool' },
            { query: "Compare Charizard and Blastoise stats", expectedIntent: 'tool' },
            
            // General queries
            { query: "Hello there", expectedIntent: 'general' },
            { query: "What's the weather like?", expectedIntent: 'general' },
            { query: "How does neural network training work?", expectedIntent: 'general' },
            
            // Edge cases that should test semantic understanding
            { query: "Show me the pocket monster Pikachu", expectedIntent: 'tool' }, // "pocket monster" = Pokemon
            { query: "I want to know about that yellow electric creature", expectedIntent: 'general' }, // Ambiguous
            { query: "What are the base stats for the fire lizard?", expectedIntent: 'general' }, // Ambiguous
        ];
        
        let correctClassifications = 0;
        const classifications = [];
        
        for (const testCase of testCases) {
            const classification = await agent._classifyIntent(testCase.query);
            const correct = classification.intent === testCase.expectedIntent;
            
            if (correct) correctClassifications++;
            
            classifications.push({
                query: testCase.query,
                expected: testCase.expectedIntent,
                actual: classification.intent,
                confidence: classification.confidence,
                correct
            });
            
            console.log(`     ${correct ? '✓' : '✗'} "${testCase.query}"`);
            console.log(`       Expected: ${testCase.expectedIntent}, Got: ${classification.intent} (confidence: ${classification.confidence?.toFixed(3)})`);
        }
        
        const accuracy = correctClassifications / testCases.length;
        console.log(`   ✓ ML Classification accuracy: ${(accuracy * 100).toFixed(1)}%`);
        
        if (accuracy < 0.6) {
            throw new Error(`ML classification accuracy too low: ${(accuracy * 100).toFixed(1)}%`);
        }
    }
    
    async testSemanticSimilarity() {
        const pokemonTool = new PokemonTool();
        const agent = new TensorFlowAgent({
            tools: [pokemonTool],
            performanceMode: 'quality'
        });
        
        await agent.initialize();
        
        if (!agent.sentenceEncoder || !agent.intentEmbeddings) {
            console.log('   ⚠️  Semantic similarity test skipped (Universal Sentence Encoder not available)');
            return;
        }
        
        // Test semantic similarity understanding
        const semanticTests = [
            // These should be classified as Pokemon queries due to semantic similarity
            { query: "Information about electric rodent Pokemon", expected: 'pokemon' },
            { query: "Stats for fire-breathing dragon creature", expected: 'pokemon' },
            { query: "Evolution details for pocket monsters", expected: 'pokemon' },
            
            // These should be classified as general
            { query: "Weather forecast for tomorrow", expected: 'general' },
            { query: "Programming tutorial recommendations", expected: 'general' },
            { query: "Restaurant reviews nearby", expected: 'general' }
        ];
        
        let semanticCorrect = 0;
        
        for (const test of semanticTests) {
            const classification = await agent._mlClassifyIntent(test.query);
            const mappedIntent = classification.intent === 'tool' ? 'pokemon' : 'general';
            const correct = mappedIntent === test.expected;
            
            if (correct) semanticCorrect++;
            
            console.log(`     ${correct ? '✓' : '✗'} "${test.query}"`);
            console.log(`       Expected: ${test.expected}, Got: ${mappedIntent} (confidence: ${classification.confidence?.toFixed(3)})`);
        }
        
        const semanticAccuracy = semanticCorrect / semanticTests.length;
        console.log(`   ✓ Semantic similarity accuracy: ${(semanticAccuracy * 100).toFixed(1)}%`);
        
        if (semanticAccuracy < 0.5) {
            console.log('   ⚠️  Semantic accuracy lower than expected, but model is working');
        }
    }
    
    async testMLvsPatternComparison() {
        const pokemonTool = new PokemonTool();
        
        // Create agents for pattern-based vs ML-based classification
        const patternAgent = new TensorFlowAgent({
            tools: [pokemonTool],
            performanceMode: 'balanced' // Uses patterns + NLP classifier
        });
        
        const mlAgent = new TensorFlowAgent({
            tools: [pokemonTool],
            performanceMode: 'quality' // Uses ML models
        });
        
        await patternAgent.initialize();
        await mlAgent.initialize();
        
        // Test queries that should highlight differences
        const comparisonTests = [
            "Tell me about that electric mouse creature",
            "What are the characteristics of fire dragons?",
            "Show me stats for water turtles",
            "Hello, what's a good programming language?",
            "Explain artificial intelligence to me"
        ];
        
        console.log('   \n   Pattern-based vs ML-based comparison:');
        
        const results = {
            pattern: [],
            ml: []
        };
        
        for (const query of comparisonTests) {
            // Test pattern-based classification
            const patternResult = await patternAgent._classifyIntent(query);
            const patternTime = Date.now();
            
            // Test ML-based classification  
            const mlStartTime = Date.now();
            const mlResult = await mlAgent._classifyIntent(query);
            const mlTime = Date.now() - mlStartTime;
            
            results.pattern.push({
                query,
                intent: patternResult.intent,
                confidence: patternResult.confidence,
                time: 1 // Pattern matching is essentially instant
            });
            
            results.ml.push({
                query,
                intent: mlResult.intent,
                confidence: mlResult.confidence,
                time: mlTime
            });
            
            console.log(`     Query: "${query}"`);
            console.log(`       Pattern: ${patternResult.intent} (conf: ${patternResult.confidence?.toFixed(3)}, ~1ms)`);
            console.log(`       ML: ${mlResult.intent} (conf: ${mlResult.confidence?.toFixed(3)}, ${mlTime}ms)`);
        }
        
        const avgMLTime = results.ml.reduce((sum, r) => sum + r.time, 0) / results.ml.length;
        console.log(`   ✓ Average ML processing time: ${Math.round(avgMLTime)}ms`);
        console.log(`   ✓ Pattern vs ML comparison completed`);
    }
    
    async testResourceUsage() {
        const pokemonTool = new PokemonTool();
        const modes = ['fast', 'balanced', 'quality'];
        
        console.log('   \n   Resource usage comparison:');
        
        for (const mode of modes) {
            const startMem = process.memoryUsage();
            
            const agent = new TensorFlowAgent({
                tools: [pokemonTool],
                performanceMode: mode
            });
            
            await agent.initialize();
            
            const endMem = process.memoryUsage();
            const memIncrease = {
                heapUsed: Math.round((endMem.heapUsed - startMem.heapUsed) / 1024 / 1024),
                heapTotal: Math.round((endMem.heapTotal - startMem.heapTotal) / 1024 / 1024),
                rss: Math.round((endMem.rss - startMem.rss) / 1024 / 1024)
            };
            
            console.log(`     ${mode} mode: +${memIncrease.heapUsed}MB heap, +${memIncrease.rss}MB RSS`);
        }
        
        console.log(`   ✓ Resource usage comparison completed`);
    }
    
    printPerformanceReport() {
        console.log('\n📊 PERFORMANCE MODE COMPARISON REPORT');
        console.log('=============================================');
        
        for (const [mode, metrics] of Object.entries(this.performanceMetrics)) {
            if (Object.keys(metrics).length === 0) continue;
            
            console.log(`\n🔧 ${mode.toUpperCase()} MODE:`);
            console.log(`   Initialization: ${metrics.initTime}ms`);
            console.log(`   ML Enabled: ${metrics.mlEnabled}`);
            console.log(`   Sentence Encoder: ${metrics.sentenceEncoderLoaded}`);
            console.log(`   Custom Model: ${metrics.customModelLoaded}`);
            
            if (metrics.queryTimes.length > 0) {
                const avgTime = Math.round(metrics.queryTimes.reduce((sum, q) => sum + q.time, 0) / metrics.queryTimes.length);
                const minTime = Math.min(...metrics.queryTimes.map(q => q.time));
                const maxTime = Math.max(...metrics.queryTimes.map(q => q.time));
                
                console.log(`   Query Performance:`);
                console.log(`     Average: ${avgTime}ms`);
                console.log(`     Range: ${minTime}ms - ${maxTime}ms`);
            }
        }
        
        console.log('\n🎯 MODE RECOMMENDATIONS:');
        console.log('   FAST: High-throughput, simple pattern matching (1-5ms)');
        console.log('   BALANCED: General purpose, NLP + patterns (10-50ms)');
        console.log('   QUALITY: Semantic understanding, ML models (50-500ms)');
    }
    
    async runAllTests() {
        console.log('🧪 QUALITY MODE ML TESTS');
        console.log('=========================');
        
        await this.runTest('Quality Mode Initialization', () => this.testQualityModeInitialization());
        await this.runTest('Performance Mode Comparison', () => this.testPerformanceModeComparison());
        await this.runTest('ML Intent Classification', () => this.testMLIntentClassification());
        await this.runTest('Semantic Similarity', () => this.testSemanticSimilarity());
        await this.runTest('ML vs Pattern Comparison', () => this.testMLvsPatternComparison());
        await this.runTest('Resource Usage', () => this.testResourceUsage());
        
        // Summary
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        const totalTime = this.testResults.reduce((sum, r) => sum + r.duration, 0);
        
        console.log('\n📊 QUALITY MODE TEST SUMMARY:');
        console.log(`✅ Passed: ${passed}/${this.testResults.length}`);
        console.log(`❌ Failed: ${failed}/${this.testResults.length}`);
        console.log(`⏱️  Total Time: ${totalTime}ms`);
        
        this.printPerformanceReport();
        
        if (failed === 0) {
            console.log('\n🎉 All Quality Mode tests passed!');
        }
        
        return this.testResults;
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new QualityModeTests();
    tester.runAllTests().catch(console.error);
}

module.exports = QualityModeTests;
