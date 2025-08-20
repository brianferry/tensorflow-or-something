/**
 * MLEngine - Machine Learning functionality for TensorFlow.js Agent
 * 
 * Handles all ML-related operations including model initialization,
 * training, and inference operations.
 */

const tf = require('@tensorflow/tfjs-node');
const logger = require('../../utils/logger');

// Import Universal Sentence Encoder for advanced semantic understanding
let USE;
try {
    USE = require('@tensorflow-models/universal-sentence-encoder');
} catch (error) {
    logger.warn('Universal Sentence Encoder not available - quality mode will use fallback');
}

class MLEngine {
    constructor(performanceMode = 'balanced') {
        this.performanceMode = performanceMode;
        this.model = null;
        this.customModel = null;
        this.universalSentenceEncoder = null;
        this.sentenceEncoder = null;
        this.intentEmbeddings = null;
        this.intentVectors = null;
        this.mlCapabilities = null;
        this.isInitialized = false;
    }

    /**
     * Initialize ML models based on performance mode
     */
    async initialize() {
        if (this.performanceMode !== 'quality') {
            this.isInitialized = true;
            return;
        }

        try {
            logger.info('Initializing ML models...');
            
            // Try to load Universal Sentence Encoder (may fail offline)
            try {
                logger.info('Loading Universal Sentence Encoder...');
                this.sentenceEncoder = await USE.load();
                this.universalSentenceEncoder = this.sentenceEncoder;
                await this._computeIntentEmbeddings();
                
                this.mlCapabilities = {
                    universal_sentence_encoder: true,
                    custom_neural_network: false,
                    semantic_similarity: true
                };
                
                logger.info('Universal Sentence Encoder loaded successfully');
            } catch (useError) {
                logger.warn(`Universal Sentence Encoder failed: ${useError.message}`);
                await this._initializeCustomNeuralNetwork();
            }
            
            logger.info('ML models initialized successfully');
            this.isInitialized = true;
        } catch (error) {
            logger.error(`ML model initialization failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Compute embeddings for different intent categories
     */
    async _computeIntentEmbeddings() {
        if (!this.sentenceEncoder) return;
        
        try {
            // Define representative sentences for each intent
            const intentSamples = {
                pokemon: [
                    "Tell me about a Pokemon character",
                    "What are the stats of this Pokemon",
                    "Pokemon type information and abilities",
                    "Show me Pokemon evolution details",
                    "Pokemon height weight and characteristics"
                ],
                general: [
                    "What is the weather like today",
                    "Tell me about programming languages",
                    "How does machine learning work",
                    "Explain artificial intelligence concepts",
                    "What can you help me with today"
                ],
                greeting: [
                    "Hello how are you doing",
                    "Good morning nice to meet you",
                    "Hi there what's up today",
                    "Hey can you help me",
                    "Greetings and salutations"
                ]
            };
            
            // Compute embeddings for each intent category
            this.intentEmbeddings = {};
            
            for (const [intent, samples] of Object.entries(intentSamples)) {
                const embeddings = await this.sentenceEncoder.embed(samples);
                const embeddingData = await embeddings.data();
                
                // Store mean embedding for each intent
                const embeddingSize = embeddingData.length / samples.length;
                const meanEmbedding = new Array(embeddingSize).fill(0);
                
                for (let i = 0; i < embeddingData.length; i++) {
                    meanEmbedding[i % embeddingSize] += embeddingData[i] / samples.length;
                }
                
                this.intentEmbeddings[intent] = meanEmbedding;
                embeddings.dispose();
            }
            
            logger.info('Intent embeddings computed successfully');
            
        } catch (error) {
            logger.error(`Intent embedding computation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Initialize custom neural network as fallback when USE is unavailable
     */
    async _initializeCustomNeuralNetwork() {
        try {
            logger.info('Initializing custom neural network for intent classification...');
            
            // Create a simple neural network for intent classification
            this.customModel = tf.sequential({
                layers: [
                    tf.layers.dense({ inputShape: [100], units: 64, activation: 'relu' }),
                    tf.layers.dropout({ rate: 0.3 }),
                    tf.layers.dense({ units: 32, activation: 'relu' }),
                    tf.layers.dense({ units: 3, activation: 'softmax' })
                ]
            });
            
            this.customModel.compile({
                optimizer: 'adam',
                loss: 'categoricalCrossentropy',
                metrics: ['accuracy']
            });
            
            // Generate simple word vectors for intent classification
            this.intentVectors = {
                pokemon: this._generateWordVector(['pokemon', 'pikachu', 'charizard', 'bulbasaur', 'type', 'stats', 'abilities']),
                general: this._generateWordVector(['explain', 'tell', 'what', 'how', 'why', 'machine', 'learning']),
                greeting: this._generateWordVector(['hello', 'hi', 'hey', 'good', 'morning', 'evening', 'how', 'are', 'you'])
            };
            
            this.mlCapabilities = {
                universal_sentence_encoder: false,
                custom_neural_network: true,
                semantic_similarity: true
            };
            
            logger.info('Custom neural network initialized successfully');
        } catch (error) {
            logger.error(`Custom neural network initialization failed: ${error.message}`);
            this.mlCapabilities = {
                universal_sentence_encoder: false,
                custom_neural_network: false,
                semantic_similarity: false
            };
        }
    }

    /**
     * Generate simple word vector for fallback semantic similarity
     */
    _generateWordVector(words) {
        // Simple word vector generation (100-dimensional)
        const vector = new Array(100).fill(0);
        words.forEach((word, idx) => {
            for (let i = 0; i < word.length && i < 100; i++) {
                vector[i] += word.charCodeAt(i) * (idx + 1);
            }
        });
        // Normalize
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
    }

    /**
     * ML-enhanced parameter extraction for Pokemon queries
     */
    async mlEnhancedParameterExtraction(query) {
        try {
            logger.info('Performing ML-enhanced parameter extraction for Pokemon query');
            
            const analysis = {
                pokemonNames: [],
                queryIntents: [],
                dataNeeds: [],
                confidence: 0,
                endpoints: [],
                focus: 'general'
            };
            
            // Use ML models to analyze Pokemon query
            await this._mlAnalyzePokemonQuery(query, analysis);
            
            // Fallback to pattern-based analysis if ML fails
            if (analysis.confidence < 0.3) {
                this._fallbackPatternAnalysis(query, analysis);
            }
            
            // Determine optimal endpoints and focus
            analysis.endpoints = this._determineOptimalEndpoints(analysis);
            analysis.focus = this._determinePrimaryFocus(analysis);
            
            logger.info(`ML analysis complete: ${JSON.stringify(analysis)}`);
            return analysis;
            
        } catch (error) {
            logger.error(`ML parameter extraction failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Use ML models to analyze Pokemon query
     */
    async _mlAnalyzePokemonQuery(query, analysis) {
        try {
            if (this.universalSentenceEncoder && this.intentEmbeddings) {
                await this._useAnalyzePokemonQuery(query, analysis);
            } else if (this.customModel && this.intentVectors) {
                await this._customModelAnalyzePokemonQuery(query, analysis);
            } else {
                analysis.confidence = 0.2;
            }
        } catch (error) {
            logger.warn(`ML query analysis failed: ${error.message}`);
            analysis.confidence = 0.1;
        }
    }

    /**
     * USE-based Pokemon query analysis
     */
    async _useAnalyzePokemonQuery(query, analysis) {
        try {
            const embedding = await this.universalSentenceEncoder.embed([query]);
            const embeddingData = await embedding.data();
            
            // Compare with intent embeddings
            let bestMatch = { intent: 'general', confidence: 0 };
            
            for (const [intent, intentEmbedding] of Object.entries(this.intentEmbeddings)) {
                const similarity = this._cosineSimilarity(Array.from(embeddingData), intentEmbedding);
                if (similarity > bestMatch.confidence) {
                    bestMatch = { intent, confidence: similarity };
                }
            }
            
            analysis.confidence = bestMatch.confidence;
            if (bestMatch.intent === 'pokemon') {
                analysis.queryIntents.push('pokemon');
            }
            
            embedding.dispose();
        } catch (error) {
            logger.error(`USE analysis failed: ${error.message}`);
            analysis.confidence = 0.2;
        }
    }

    /**
     * Custom model Pokemon query analysis
     */
    async _customModelAnalyzePokemonQuery(query, analysis) {
        try {
            const vector = this._textToVector(query);
            const prediction = this.customModel.predict(tf.tensor2d([vector]));
            const predictionData = await prediction.data();
            
            const maxConfidence = Math.max(...predictionData);
            const predictedIndex = predictionData.indexOf(maxConfidence);
            
            const intents = ['pokemon', 'general', 'greeting'];
            if (predictedIndex < intents.length) {
                analysis.queryIntents.push(intents[predictedIndex]);
                analysis.confidence = maxConfidence;
            }
            
            prediction.dispose();
        } catch (error) {
            logger.error(`Custom model analysis failed: ${error.message}`);
            analysis.confidence = 0.2;
        }
    }

    /**
     * Convert text to feature vector for custom neural network
     */
    _textToVector(text) {
        // Simple bag-of-words style feature extraction
        const words = text.toLowerCase().split(/\s+/);
        const vector = new Array(100).fill(0);
        
        // Add word-based features
        words.forEach((word, idx) => {
            if (idx < 100) {
                vector[idx] = word.length / 10; // Normalize word length
            }
        });
        
        // Normalize the vector
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
    }

    /**
     * Fallback pattern analysis when ML confidence is low
     */
    _fallbackPatternAnalysis(query, analysis) {
        const lowerQuery = query.toLowerCase();
        
        // Pokemon name detection
        const pokemonNames = lowerQuery.match(/\b(pikachu|charizard|bulbasaur|squirtle|charmander|mew|mewtwo|lucario|garchomp|rayquaza|arceus|dialga|palkia|giratina|kyogre|groudon|latios|latias|deoxys|jirachi|celebi|manaphy|darkrai|shaymin|victini|keldeo|genesect|diancie|hoopa|volcanion|magearna|marshadow|zeraora|meltan|melmetal|zarude|calyrex|glastrier|spectrier|enamorus|koraidon|miraidon|rhyhorn)\b/g);
        if (pokemonNames) {
            analysis.pokemonNames.push(...pokemonNames);
        }
        
        // Intent detection
        if (/\b(stats?|attack|defense|speed|hp|base)\b/i.test(lowerQuery)) {
            analysis.queryIntents.push('stats');
        }
        if (/\b(evolv|evolution|level|grow)\b/i.test(lowerQuery)) {
            analysis.queryIntents.push('evolution');
        }
        if (/\b(competitive|battle|fight|versus|vs|matchup)\b/i.test(lowerQuery)) {
            analysis.queryIntents.push('competitive');
        }
        
        analysis.confidence = Math.max(0.4, analysis.confidence);
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    _cosineSimilarity(vec1, vec2) {
        if (vec1.length !== vec2.length) return 0;
        
        const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
        const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
        const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
        
        return magnitude1 && magnitude2 ? dotProduct / (magnitude1 * magnitude2) : 0;
    }

    /**
     * Determine optimal PokeAPI endpoints to call based on analysis
     */
    _determineOptimalEndpoints(analysis) {
        const endpoints = new Set(['pokemon']); // Always get basic Pokemon data
        
        analysis.dataNeeds.forEach(need => {
            switch (need) {
                case 'evolution_chain':
                    endpoints.add('pokemon-species');
                    endpoints.add('evolution-chain');
                    break;
                case 'breeding_info':
                    endpoints.add('pokemon-species');
                    break;
                case 'habitat_info':
                    endpoints.add('pokemon-species');
                    break;
                case 'competitive_analysis':
                    endpoints.add('pokemon');
                    break;
                default:
                    break;
            }
        });
        
        return Array.from(endpoints);
    }

    /**
     * Determine primary focus based on analysis results
     */
    _determinePrimaryFocus(analysis) {
        // Prioritize specific intents over general
        if (analysis.queryIntents.includes('stats')) return 'stats';
        if (analysis.queryIntents.includes('evolution')) return 'evolution';
        if (analysis.queryIntents.includes('competitive')) return 'competitive';
        if (analysis.queryIntents.includes('types')) return 'types';
        if (analysis.queryIntents.includes('abilities')) return 'abilities';
        if (analysis.queryIntents.includes('breeding')) return 'breeding';
        
        // Fallback to general if no specific intent detected
        return 'general';
    }

    /**
     * Get ML capabilities status
     */
    getCapabilities() {
        return this.mlCapabilities || {
            universal_sentence_encoder: false,
            custom_neural_network: false,
            semantic_similarity: false
        };
    }

    /**
     * Get initialization status
     */
    isReady() {
        return this.isInitialized;
    }
}

module.exports = MLEngine;
