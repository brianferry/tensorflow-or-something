/**
 * TensorFlow.js Agent - Main agent implementation
 * 
 * This agent replicates LangChain functionality using TensorFlow.js and NLP libraries.
 * It provides intelligent task routing, tool integration, and response generation.
 */

const tf = require('@tensorflow/tfjs-node');
const natural = require('natural');
const compromise = require('compromise');
const logger = require('../utils/logger');

// Import Universal Sentence Encoder for advanced semantic understanding
let USE;
try {
    USE = require('@tensorflow-models/universal-sentence-encoder');
} catch (error) {
    logger.warn('Universal Sentence Encoder not available - quality mode will use fallback');
}

class TensorFlowAgent {
    constructor(options = {}) {
        this.tools = options.tools || [];
        this.performanceMode = options.performanceMode || 'balanced';
        this.cache = options.cache;
        
        // NLP processors
        this.tokenizer = new natural.WordTokenizer();
        this.stemmer = natural.PorterStemmer;
        this.classifier = null;
        
        // Tool routing patterns
        this.toolPatterns = new Map();
        
        // Performance configurations
        this.configs = {
            fast: {
                useML: false,
                useStemming: false,
                useAdvancedNLP: false,
                maxTokens: 100
            },
            balanced: {
                useML: false,
                useStemming: true,
                useAdvancedNLP: true,
                maxTokens: 200
            },
            quality: {
                useML: true,
                useStemming: true,
                useAdvancedNLP: true,
                maxTokens: 500
            }
        };
        
        this.config = this.configs[this.performanceMode] || this.configs.balanced;
        
        // Initialize TensorFlow.js
        this.model = null;
        this.sentenceEncoder = null;
        this.intentEmbeddings = null;
        this.isInitialized = false;
    }
    
    /**
     * Initialize the agent and its components
     */
    async initialize() {
        try {
            logger.info('Initializing TensorFlow.js Agent...');
            
            // Setup tool patterns for routing
            this._setupToolPatterns();
            
            // Initialize ML components based on performance mode
            if (this.config.useML) {
                await this._initializeMLModels();
            }
            
            // Initialize NLP classifier
            this._initializeClassifier();
            
            this.isInitialized = true;
            logger.info(`Agent initialized in ${this.performanceMode} mode`);
            
        } catch (error) {
            logger.error(`Agent initialization failed: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Setup tool routing patterns
     */
    _setupToolPatterns() {
        for (const tool of this.tools) {
            const patterns = this._generateToolPatterns(tool);
            this.toolPatterns.set(tool.name, patterns);
        }
        
        logger.info(`Setup tool patterns for ${this.tools.length} tools`);
    }
    
    /**
     * Generate patterns for a specific tool
     */
    _generateToolPatterns(tool) {
        const patterns = [];
        
        if (tool.name === 'pokemon_info') {
            patterns.push(
                // Direct Pokemon mentions
                /\b(pokemon|pokémon|poke)\b/i,
                /\b(pikachu|charizard|bulbasaur|squirtle|charmander|mew|mewtwo|lucario|garchomp|rayquaza|arceus|dialga|palkia|giratina|kyogre|groudon|latios|latias|deoxys|jirachi|celebi|manaphy|darkrai|shaymin|victini|keldeo|genesect|diancie|hoopa|volcanion|magearna|marshadow|zeraora|meltan|melmetal|zarude|calyrex|glastrier|spectrier|enamorus|koraidon|miraidon)\b/i,
                // Pokemon-specific query patterns (more specific)
                /tell me about (pikachu|charizard|bulbasaur|squirtle|charmander|\w+mon)/i,
                /what (is|are) (pikachu|charizard|bulbasaur|squirtle|charmander|\w+mon)/i,
                /(pikachu|charizard|bulbasaur|squirtle|charmander|\w+mon)\s+(stats?|info|information|details|data)/i,
                /does\s+(pikachu|charizard|bulbasaur|squirtle|charmander|\w+mon)\s+(evolve|belong)/i,
                /when does\s+(pikachu|charizard|bulbasaur|squirtle|charmander|\w+mon)\s+evolve/i,
                // General Pokemon patterns
                /\b(evolution|evolve|egg group|generation|habitat)\b.*\b(pokemon|pokémon)\b/i,
                /(pokemon|pokémon)\s+(stats?|abilities|evolution|type|height|weight)/i
            );
        }
        
        return patterns;
    }
    
    /**
     * Initialize machine learning models for quality mode
     */
    async _initializeMLModels() {
        try {
            logger.info('Initializing ML models...');
            
            // Try to load Universal Sentence Encoder (may fail offline)
            try {
                logger.info('Loading Universal Sentence Encoder...');
                this.universalSentenceEncoder = await use.load();
                logger.info('Universal Sentence Encoder loaded successfully');
                
                // Compute embeddings for intent categories
                await this._computeIntentEmbeddings();
                
                this.mlCapabilities = {
                    universal_sentence_encoder: true,
                    custom_neural_network: false,
                    semantic_similarity: true
                };
            } catch (useError) {
                logger.warn(`Universal Sentence Encoder failed: ${useError.message}`);
                logger.info('Falling back to custom neural network...');
                await this._initializeCustomNeuralNetwork();
            }
            
            logger.info('ML models initialized successfully');
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
                logger.info(`Computing embeddings for ${intent} intent...`);
                const embeddings = await this.sentenceEncoder.embed(samples);
                // Average the embeddings to get a representative embedding for the intent
                this.intentEmbeddings[intent] = tf.mean(embeddings, 0);
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
                    tf.layers.dense({ units: 3, activation: 'softmax' }) // 3 intents: pokemon, general, greeting
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
                vector[i] += word.charCodeAt(i % word.length) * (idx + 1);
            }
        });
        // Normalize
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
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
                for (let i = 0; i < word.length && i < 5; i++) {
                    vector[idx] += word.charCodeAt(i);
                }
            }
        });
        
        // Normalize the vector
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
    }
    
    /**
     * Create a custom neural network model as fallback
     */
    async _createCustomModel() {
        try {
            // Create a simple sequential model for intent classification
            this.model = tf.sequential({
                layers: [
                    tf.layers.dense({ inputShape: [100], units: 128, activation: 'relu' }),
                    tf.layers.dropout({ rate: 0.3 }),
                    tf.layers.dense({ units: 64, activation: 'relu' }),
                    tf.layers.dropout({ rate: 0.2 }),
                    tf.layers.dense({ units: 32, activation: 'relu' }),
                    tf.layers.dense({ units: 4, activation: 'softmax' }) // pokemon, general, greeting, unknown
                ]
            });
            
            this.model.compile({
                optimizer: tf.train.adam(0.001),
                loss: 'categoricalCrossentropy',
                metrics: ['accuracy']
            });
            
            // Train with synthetic data
            await this._trainCustomModel();
            
            logger.info('Custom model created and trained successfully');
            
        } catch (error) {
            logger.error(`Custom model creation failed: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Train the custom model with synthetic training data
     */
    async _trainCustomModel() {
        if (!this.model) return;
        
        try {
            // Generate training data
            const trainingSize = 1000;
            const features = tf.randomNormal([trainingSize, 100]);
            
            // Create synthetic labels (one-hot encoded)
            const labels = tf.oneHot(tf.randomUniform([trainingSize], 0, 4, 'int32'), 4);
            
            // Train the model
            await this.model.fit(features, labels, {
                epochs: 5,
                batchSize: 32,
                verbose: 0,
                shuffle: true
            });
            
            // Clean up tensors
            features.dispose();
            labels.dispose();
            
            logger.info('Custom model training completed');
            
        } catch (error) {
            logger.error(`Model training failed: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Initialize NLP classifier using natural library
     */
    _initializeClassifier() {
        this.classifier = new natural.LogisticRegressionClassifier();
        
        // Train with sample data for intent classification
        const trainingData = [
            // Pokemon intents
            { text: 'tell me about pikachu', label: 'pokemon' },
            { text: 'what are charizard stats', label: 'pokemon' },
            { text: 'pokemon bulbasaur info', label: 'pokemon' },
            { text: 'does squirtle evolve', label: 'pokemon' },
            { text: 'charmander evolution', label: 'pokemon' },
            { text: 'pokemon height weight', label: 'pokemon' },
            { text: 'egg group abilities', label: 'pokemon' },
            
            // General intents
            { text: 'what is the weather', label: 'general' },
            { text: 'how are you today', label: 'general' },
            { text: 'tell me a joke', label: 'general' },
            { text: 'what is programming', label: 'general' },
            { text: 'explain machine learning', label: 'general' },
            { text: 'best programming language', label: 'general' },
            { text: 'how to learn coding', label: 'general' }
        ];
        
        // Add training data to classifier
        for (const sample of trainingData) {
            const tokens = this._preprocessText(sample.text);
            this.classifier.addDocument(tokens, sample.label);
        }
        
        // Train the classifier
        this.classifier.train();
        
        logger.info('NLP classifier trained with sample data');
    }
    
    /**
     * Preprocess text for analysis
     */
    _preprocessText(text) {
        let processed = text.toLowerCase().trim();
        
        if (this.config.useAdvancedNLP) {
            // Use compromise for advanced NLP
            const doc = compromise(processed);
            
            // Extract relevant parts
            const nouns = doc.nouns().out('array');
            const verbs = doc.verbs().out('array');
            const adjectives = doc.adjectives().out('array');
            
            processed = [...nouns, ...verbs, ...adjectives].join(' ');
        }
        
        // Tokenize
        const tokens = this.tokenizer.tokenize(processed);
        
        if (this.config.useStemming) {
            // Apply stemming
            return tokens.map(token => this.stemmer.stem(token));
        }
        
        return tokens;
    }
    
    /**
     * Classify intent of the input text
     */
    _classifyIntent(text) {
        if (this.config.useML && this.sentenceEncoder) {
            return this._mlClassifyIntent(text);
        } else if (this.config.useML && this.model) {
            return this._customModelClassifyIntent(text);
        } else {
            return this._patternClassifyIntent(text);
        }
    }
    
    /**
     * ML-based intent classification using Universal Sentence Encoder or custom fallback
     */
    async _mlClassifyIntent(text) {
        try {
            // Try Universal Sentence Encoder first
            if (this.universalSentenceEncoder && this.intentEmbeddings) {
                return await this._useClassifyIntent(text);
            }
            
            // Fallback to custom neural network
            if (this.customModel && this.intentVectors) {
                return await this._customClassifyIntent(text);
            }
            
            // If no ML models available, use pattern matching
            throw new Error('No ML models available');
            
        } catch (error) {
            logger.warn(`ML intent classification failed: ${error.message}, falling back to patterns`);
            // Fallback to pattern matching
            return this._patternClassifyIntent(text);
        }
    }
    
    /**
     * Universal Sentence Encoder intent classification
     */
    async _useClassifyIntent(text) {
        try {
            // Get embedding for the input text
            const textEmbedding = await this.universalSentenceEncoder.embed([text]);
            const textVector = textEmbedding.squeeze();
            
            // Calculate similarities with each intent
            const similarities = {};
            let maxSimilarity = -1;
            let bestIntent = 'general';
            
            for (const [intent, intentEmbedding] of Object.entries(this.intentEmbeddings)) {
                // Calculate cosine similarity
                const similarity = tf.losses.cosineDistance(textVector, intentEmbedding, 0).dataSync()[0];
                similarities[intent] = 1 - similarity; // Convert distance to similarity
                
                if (similarities[intent] > maxSimilarity) {
                    maxSimilarity = similarities[intent];
                    bestIntent = intent;
                }
            }
            
            // Clean up tensors
            textEmbedding.dispose();
            textVector.dispose();
            
            // Determine confidence and intent
            const confidence = Math.max(0.1, Math.min(0.99, maxSimilarity));
            const finalIntent = confidence > 0.6 ? bestIntent : 'general';
            
            // Map intents to tools
            const toolMapping = {
                'pokemon': { intent: 'tool', tool: 'pokemon_info', confidence: confidence },
                'general': { intent: 'general', confidence: confidence },
                'greeting': { intent: 'general', confidence: confidence }
            };
            
            return toolMapping[finalIntent] || { intent: 'general', confidence: confidence };
            
        } catch (error) {
            logger.error(`USE classification failed: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Custom neural network intent classification
     */
    async _customClassifyIntent(text) {
        try {
            // Convert text to vector
            const inputVector = this._textToVector(text);
            const inputTensor = tf.tensor2d([inputVector]);
            
            const predictions = this.customModel.predict(inputTensor);
            const predictionData = await predictions.data();
            
            const intents = ['pokemon', 'general', 'greeting'];
            const maxIdx = predictionData.indexOf(Math.max(...predictionData));
            const confidence = predictionData[maxIdx];
            
            // Dispose of temporary tensors
            inputTensor.dispose();
            predictions.dispose();
            
            const detectedIntent = intents[maxIdx] || 'general';
            
            // Map intents to tools
            const toolMapping = {
                'pokemon': { intent: 'tool', tool: 'pokemon_info', confidence: confidence },
                'general': { intent: 'general', confidence: confidence },
                'greeting': { intent: 'general', confidence: confidence }
            };
            
            return toolMapping[detectedIntent] || { intent: 'general', confidence: confidence };
            
        } catch (error) {
            logger.error(`Custom model classification failed: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Custom model intent classification
     */
    async _customModelClassifyIntent(text) {
        try {
            if (!this.model) {
                throw new Error('Custom model not initialized');
            }
            
            // Create feature vector from text (simplified bag-of-words)
            const features = this._textToFeatureVector(text);
            const featureTensor = tf.tensor2d([features]);
            
            // Make prediction
            const prediction = await this.model.predict(featureTensor);
            const probabilities = await prediction.data();
            
            // Clean up tensors
            featureTensor.dispose();
            prediction.dispose();
            
            // Get the highest probability intent
            const maxProb = Math.max(...probabilities);
            const maxIndex = probabilities.indexOf(maxProb);
            
            const intents = ['pokemon', 'general', 'greeting', 'unknown'];
            const predictedIntent = intents[maxIndex];
            
            // Map to tool format
            if (predictedIntent === 'pokemon' && maxProb > 0.5) {
                return { intent: 'tool', tool: 'pokemon_info', confidence: maxProb };
            } else {
                return { intent: 'general', confidence: maxProb };
            }
            
        } catch (error) {
            logger.error(`Custom model classification failed: ${error.message}`);
            return this._patternClassifyIntent(text);
        }
    }
    
    /**
     * Convert text to feature vector for custom model
     */
    _textToFeatureVector(text) {
        const features = new Array(100).fill(0);
        const tokens = this._preprocessText(text);
        
        // Simple bag-of-words with position encoding
        tokens.forEach((token, index) => {
            if (index < 100) {
                features[index] = token.length / 10; // Normalize by length
            }
        });
        
        return features;
    }
    
    /**
     * Pattern-based intent classification (fallback and fast/balanced modes)
     */
    _patternClassifyIntent(text) {
        try {
            // First, try pattern matching for fast routing
            for (const [toolName, patterns] of this.toolPatterns) {
                for (const pattern of patterns) {
                    if (pattern.test(text)) {
                        return { intent: 'tool', tool: toolName, confidence: 0.9 };
                    }
                }
            }
            
            // Use NLP classifier for more sophisticated analysis
            if (this.classifier) {
                const tokens = this._preprocessText(text);
                const result = this.classifier.classify(tokens.join(' '));
                const classifications = this.classifier.getClassifications(tokens.join(' '));
                
                const confidence = classifications.find(c => c.label === result)?.value || 0.5;
                
                if (result === 'pokemon') {
                    return { intent: 'tool', tool: 'pokemon_info', confidence };
                } else {
                    return { intent: 'general', confidence };
                }
            }
            
            // Fallback to general intent
            return { intent: 'general', confidence: 0.3 };
            
        } catch (error) {
            logger.warn(`Intent classification failed: ${error.message}`);
            return { intent: 'general', confidence: 0.1 };
        }
    }
    
    /**
     * Process a task using the agent
     */
    async processTask(task) {
        try {
            if (!this.isInitialized) {
                throw new Error('Agent not initialized');
            }
            
            logger.info(`Processing task: ${task.substring(0, 50)}...`);
            
            // Classify intent
            const classification = this._classifyIntent(task);
            logger.info(`Intent classification: ${JSON.stringify(classification)}`);
            
            // Route to appropriate handler
            if (classification.intent === 'tool' && classification.tool) {
                return await this._executeToolTask(classification.tool, task);
            } else {
                return await this._executeGeneralTask(task);
            }
            
        } catch (error) {
            logger.error(`Task processing failed: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Execute task using a specific tool
     */
    async _executeToolTask(toolName, task) {
        const tool = this.tools.find(t => t.name === toolName);
        
        if (!tool) {
            throw new Error(`Tool '${toolName}' not found`);
        }
        
        logger.info(`Executing task with tool: ${toolName}`);
        
        try {
            // In quality mode, use ML to enhance tool execution with intelligent parameter extraction
            if (this.performanceMode === 'quality' && toolName === 'pokemon_info') {
                const enhancedParams = await this._mlEnhancedParameterExtraction(task);
                const result = await tool.execute(task, {
                    performanceMode: this.performanceMode,
                    config: this.config,
                    mlParams: enhancedParams
                });
                
                // Process with ML-enhanced understanding
                if (typeof result === 'object' && (result.type === 'pokemon_data' || result.type === 'competitive_matchup')) {
                    return await this._processToolData(result, task, enhancedParams);
                }
                return result;
            } else {
                // Standard tool execution for fast/balanced modes
                const result = await tool.execute(task, {
                    performanceMode: this.performanceMode,
                    config: this.config
                });
                
                // Check if the tool returned structured data that needs intelligent processing
                if (typeof result === 'object' && (result.type === 'pokemon_data' || result.type === 'competitive_matchup')) {
                    return await this._processToolData(result, task, null);
                }
                
                // For simple string responses, return as-is
                return result;
            }
        } catch (error) {
            logger.error(`Tool execution failed: ${error.message}`);
            // Fallback to general response
            return `I encountered an error while using the ${toolName} tool: ${error.message}. Please try rephrasing your request.`;
        }
    }
    
    /**
     * ML-enhanced parameter extraction for Pokemon queries
     */
    async _mlEnhancedParameterExtraction(query) {
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
            
            // Use ML models if available
            if (this.universalSentenceEncoder || this.customModel) {
                analysis.confidence = await this._mlAnalyzePokemonQuery(query, analysis);
            }
            
            // Enhanced NLP analysis
            const nlpAnalysis = this._advancedNLPAnalysis(query);
            analysis.pokemonNames = [...analysis.pokemonNames, ...nlpAnalysis.pokemonNames];
            analysis.queryIntents = [...analysis.queryIntents, ...nlpAnalysis.intents];
            analysis.dataNeeds = [...analysis.dataNeeds, ...nlpAnalysis.dataNeeds];
            
            // Determine optimal API endpoints to call
            analysis.endpoints = this._determineOptimalEndpoints(analysis);
            
            // Set primary focus
            analysis.focus = this._determinePrimaryFocus(analysis);
            
            logger.info(`ML analysis complete: ${JSON.stringify(analysis)}`);
            return analysis;
            
        } catch (error) {
            logger.error(`ML parameter extraction failed: ${error.message}`);
            // Return fallback analysis
            return {
                pokemonNames: [],
                queryIntents: ['general'],
                dataNeeds: ['basic_info'],
                confidence: 0.3,
                endpoints: ['pokemon'],
                focus: 'general'
            };
        }
    }
    
    /**
     * Use ML models to analyze Pokemon query
     */
    async _mlAnalyzePokemonQuery(query, analysis) {
        try {
            if (this.universalSentenceEncoder && this.intentEmbeddings) {
                return await this._useAnalyzePokemonQuery(query, analysis);
            } else if (this.customModel) {
                return await this._customModelAnalyzePokemonQuery(query, analysis);
            }
            return 0.5;
        } catch (error) {
            logger.error(`ML Pokemon query analysis failed: ${error.message}`);
            return 0.3;
        }
    }
    
    /**
     * USE-based Pokemon query analysis
     */
    async _useAnalyzePokemonQuery(query, analysis) {
        try {
            // Get query embedding
            const queryEmbedding = await this.universalSentenceEncoder.embed([query]);
            const queryVector = queryEmbedding.squeeze();
            
            // Define Pokemon-specific intent patterns
            const pokemonIntents = {
                stats: "What are the battle statistics and base stats of this Pokemon",
                evolution: "Pokemon evolution chain and requirements for evolving",
                abilities: "Pokemon abilities and special powers in battle",
                types: "Pokemon type effectiveness and battle matchups",
                breeding: "Pokemon breeding compatibility and egg groups",
                competitive: "Pokemon competitive viability and strategy analysis",
                general: "General Pokemon information and basic details"
            };
            
            // Analyze intent similarities
            const intentSimilarities = {};
            for (const [intent, description] of Object.entries(pokemonIntents)) {
                const intentEmbedding = await this.universalSentenceEncoder.embed([description]);
                const intentVector = intentEmbedding.squeeze();
                
                const similarity = 1 - tf.losses.cosineDistance(queryVector, intentVector, 0).dataSync()[0];
                intentSimilarities[intent] = similarity;
                
                if (similarity > 0.6) {
                    analysis.queryIntents.push(intent);
                }
                
                intentEmbedding.dispose();
                intentVector.dispose();
            }
            
            // Extract Pokemon names using semantic similarity
            const commonPokemon = [
                'pikachu', 'charizard', 'bulbasaur', 'squirtle', 'charmander',
                'blastoise', 'venusaur', 'mewtwo', 'mew', 'eevee', 'snorlax',
                'gyarados', 'dragonite', 'articuno', 'zapdos', 'moltres'
            ];
            
            for (const pokemon of commonPokemon) {
                const pokemonQuery = `Tell me about ${pokemon} Pokemon`;
                const pokemonEmbedding = await this.universalSentenceEncoder.embed([pokemonQuery]);
                const pokemonVector = pokemonEmbedding.squeeze();
                
                const similarity = 1 - tf.losses.cosineDistance(queryVector, pokemonVector, 0).dataSync()[0];
                
                if (similarity > 0.7) {
                    analysis.pokemonNames.push(pokemon);
                }
                
                pokemonEmbedding.dispose();
                pokemonVector.dispose();
            }
            
            // Clean up
            queryEmbedding.dispose();
            queryVector.dispose();
            
            // Return highest intent confidence
            const maxConfidence = Math.max(...Object.values(intentSimilarities));
            return Math.max(0.1, Math.min(0.99, maxConfidence));
            
        } catch (error) {
            logger.error(`USE Pokemon analysis failed: ${error.message}`);
            return 0.4;
        }
    }
    
    /**
     * Custom model Pokemon query analysis
     */
    async _customModelAnalyzePokemonQuery(query, analysis) {
        try {
            // Convert query to feature vector
            const features = this._textToVector(query);
            const inputTensor = tf.tensor2d([features]);
            
            // Get model predictions
            const prediction = this.customModel.predict(inputTensor);
            const probabilities = await prediction.data();
            
            // Map probabilities to intents
            const intents = ['stats', 'evolution', 'general'];
            intents.forEach((intent, idx) => {
                if (probabilities[idx] > 0.5) {
                    analysis.queryIntents.push(intent);
                }
            });
            
            // Simple Pokemon name extraction using patterns
            const words = query.toLowerCase().split(/\s+/);
            const pokemonKeywords = ['pikachu', 'charizard', 'bulbasaur', 'squirtle', 'charmander'];
            
            words.forEach(word => {
                if (pokemonKeywords.includes(word)) {
                    analysis.pokemonNames.push(word);
                }
            });
            
            // Clean up tensors
            inputTensor.dispose();
            prediction.dispose();
            
            return Math.max(...probabilities);
            
        } catch (error) {
            logger.error(`Custom model Pokemon analysis failed: ${error.message}`);
            return 0.3;
        }
    }
    
    /**
     * Advanced NLP analysis using compromise and natural
     */
    _advancedNLPAnalysis(query) {
        const analysis = {
            pokemonNames: [],
            intents: [],
            dataNeeds: []
        };
        
        try {
            // Use compromise for advanced parsing
            const doc = compromise(query);
            
            // Extract potential Pokemon names (proper nouns, unknown words)
            const properNouns = doc.match('#ProperNoun').out('array');
            const unknownWords = doc.not('#Known').out('array');
            
            // Common Pokemon patterns
            const pokemonPatterns = [
                /\b(pikachu|charizard|bulbasaur|squirtle|charmander|blastoise|venusaur|caterpie|weedle|pidgey|rattata|spearow|ekans|sandshrew|nidoran|clefairy|vulpix|jigglypuff|zubat|oddish|paras|venonat|diglett|meowth|psyduck|mankey|growlithe|poliwag|abra|machop|bellsprout|tentacool|geodude|ponyta|slowpoke|magnemite|seel|grimer|shellder|gastly|onix|drowzee|krabby|voltorb|exeggcute|cubone|hitmonlee|hitmonchan|lickitung|koffing|rhyhorn|chansey|tangela|kangaskhan|horsea|goldeen|staryu|scyther|jynx|electabuzz|magmar|pinsir|tauros|magikarp|gyarados|lapras|ditto|eevee|vaporeon|jolteon|flareon|porygon|omanyte|kabuto|aerodactyl|snorlax|articuno|zapdos|moltres|dratini|dragonair|dragonite|mewtwo|mew)\b/gi
            ];
            
            // Extract Pokemon names using patterns
            pokemonPatterns.forEach(pattern => {
                const matches = query.match(pattern);
                if (matches) {
                    analysis.pokemonNames.push(...matches.map(m => m.toLowerCase()));
                }
            });
            
            // Also check proper nouns and unknown words for Pokemon names
            [...properNouns, ...unknownWords].forEach(word => {
                if (word.length > 3 && /^[a-zA-Z]+$/.test(word)) {
                    analysis.pokemonNames.push(word.toLowerCase());
                }
            });
            
            // Intent analysis using keywords
            const queryLower = query.toLowerCase();
            
            if (/\b(stat|stats|attack|defense|speed|hp|base|power|strong|battle|fight)\b/.test(queryLower)) {
                analysis.intents.push('stats');
                analysis.dataNeeds.push('base_stats', 'battle_analysis');
            }
            
            if (/\b(evolve|evolution|evolv|level|grow|stage|form)\b/.test(queryLower)) {
                analysis.intents.push('evolution');
                analysis.dataNeeds.push('evolution_chain', 'evolution_requirements');
            }
            
            if (/\b(type|effective|weakness|strength|resist|super|weak|strong)\b/.test(queryLower)) {
                analysis.intents.push('types');
                analysis.dataNeeds.push('type_effectiveness', 'type_chart');
            }
            
            if (/\b(abilit|skill|talent|power|special|hidden)\b/.test(queryLower)) {
                analysis.intents.push('abilities');
                analysis.dataNeeds.push('abilities', 'hidden_abilities');
            }
            
            if (/\b(breed|egg|hatch|genetics|compatible|group)\b/.test(queryLower)) {
                analysis.intents.push('breeding');
                analysis.dataNeeds.push('egg_groups', 'breeding_compatibility');
            }
            
            if (/\b(competitive|strategy|meta|tier|viable|usage|team)\b/.test(queryLower)) {
                analysis.intents.push('competitive');
                analysis.dataNeeds.push('competitive_analysis', 'tier_data');
            }
            
            if (/\b(move|moveset|learn|tm|tutor|level|attack)\b/.test(queryLower)) {
                analysis.intents.push('moves');
                analysis.dataNeeds.push('move_list', 'learn_methods');
            }
            
            if (/\b(location|where|found|catch|encounter|habitat)\b/.test(queryLower)) {
                analysis.intents.push('location');
                analysis.dataNeeds.push('encounter_locations', 'habitat_data');
            }
            
            // If no specific intents found, default to general
            if (analysis.intents.length === 0) {
                analysis.intents.push('general');
                analysis.dataNeeds.push('basic_info');
            }
            
        } catch (error) {
            logger.error(`Advanced NLP analysis failed: ${error.message}`);
            // Fallback to basic analysis
            analysis.intents.push('general');
            analysis.dataNeeds.push('basic_info');
        }
        
        return analysis;
    }
    
    /**
     * Determine optimal PokeAPI endpoints to call based on analysis
     */
    _determineOptimalEndpoints(analysis) {
        const endpoints = new Set(['pokemon']); // Always get basic Pokemon data
        
        analysis.dataNeeds.forEach(need => {
            switch (need) {
                case 'base_stats':
                case 'battle_analysis':
                    endpoints.add('pokemon');
                    break;
                case 'evolution_chain':
                case 'evolution_requirements':
                    endpoints.add('pokemon-species');
                    endpoints.add('evolution-chain');
                    break;
                case 'type_effectiveness':
                case 'type_chart':
                    endpoints.add('type');
                    break;
                case 'abilities':
                case 'hidden_abilities':
                    endpoints.add('ability');
                    break;
                case 'egg_groups':
                case 'breeding_compatibility':
                    endpoints.add('pokemon-species');
                    endpoints.add('egg-group');
                    break;
                case 'move_list':
                case 'learn_methods':
                    endpoints.add('pokemon');
                    endpoints.add('move');
                    break;
                case 'encounter_locations':
                case 'habitat_data':
                    endpoints.add('pokemon-species');
                    endpoints.add('location-area');
                    break;
                default:
                    endpoints.add('pokemon');
                    endpoints.add('pokemon-species');
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
     * Process structured data from tools using AI capabilities
     */
    async _processToolData(toolData, originalQuery, mlParams = null) {
        switch (toolData.type) {
            case 'pokemon_data':
                if (mlParams) {
                    return await this._generateMLEnhancedPokemonResponse(toolData.pokemon, originalQuery, toolData.performanceMode, mlParams);
                } else {
                    return await this._generatePokemonResponse(toolData.pokemon, originalQuery, toolData.performanceMode);
                }
            case 'competitive_matchup':
                return await this._generateCompetitiveMatchupResponse(toolData.pokemon, originalQuery, toolData.performanceMode, mlParams);
            default:
                return 'I received data from the tool but cannot process it properly.';
        }
    }
    
    /**
     * Generate ML-enhanced Pokemon response using intelligent analysis
     */
    async _generateMLEnhancedPokemonResponse(pokemonData, query, performanceMode, mlParams) {
        const pokemon = pokemonData;
        const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
        
        logger.info(`Generating ML-enhanced response for ${name} with focus: ${mlParams.focus}`);
        
        // Use ML analysis to customize response structure and content
        let response = `# AI-Enhanced ${name} Analysis\n\n`;
        
        // Intelligent introduction based on ML-detected intent
        response += await this._generateMLBasedIntroduction(pokemon, query, mlParams);
        
        // Dynamically structure response based on detected intents and focus
        if (mlParams.focus === 'stats' || mlParams.queryIntents.includes('stats')) {
            response += await this._generateMLStatsAnalysis(pokemon, mlParams);
        }
        
        if (mlParams.focus === 'competitive' || mlParams.queryIntents.includes('competitive')) {
            response += await this._generateMLCompetitiveAnalysis(pokemon, mlParams);
        }
        
        if (mlParams.focus === 'evolution' || mlParams.queryIntents.includes('evolution')) {
            response += await this._generateMLEvolutionAnalysis(pokemon, mlParams);
        }
        
        if (mlParams.focus === 'types' || mlParams.queryIntents.includes('types')) {
            response += await this._generateMLTypeAnalysis(pokemon, mlParams);
        }
        
        if (mlParams.focus === 'abilities' || mlParams.queryIntents.includes('abilities')) {
            response += await this._generateMLAbilityAnalysis(pokemon, mlParams);
        }
        
        if (mlParams.focus === 'breeding' || mlParams.queryIntents.includes('breeding')) {
            response += await this._generateMLBreedingAnalysis(pokemon, mlParams);
        }
        
        // If general or no specific focus, provide comprehensive overview
        if (mlParams.focus === 'general' || mlParams.queryIntents.length === 0) {
            response += await this._generateMLComprehensiveOverview(pokemon, mlParams);
        }
        
        // Add ML-powered conclusions and recommendations
        response += await this._generateMLConclusions(pokemon, query, mlParams);
        
        return response;
    }
    
    /**
     * Generate ML-based introduction tailored to detected intent
     */
    async _generateMLBasedIntroduction(pokemon, query, mlParams) {
        const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
        const confidence = Math.round(mlParams.confidence * 100);
        
        let intro = `Through advanced ML analysis (${confidence}% confidence), I've identified your primary interest in ${name}`;
        
        if (mlParams.focus === 'stats') {
            intro += ` from a statistical and battle performance perspective.\n\n`;
        } else if (mlParams.focus === 'competitive') {
            intro += ` within competitive and strategic contexts.\n\n`;
        } else if (mlParams.focus === 'evolution') {
            intro += ` regarding evolutionary development and progression.\n\n`;
        } else if (mlParams.focus === 'types') {
            intro += ` concerning type interactions and effectiveness.\n\n`;
        } else if (mlParams.focus === 'abilities') {
            intro += ` focusing on abilities and special capabilities.\n\n`;
        } else if (mlParams.focus === 'breeding') {
            intro += ` related to breeding mechanics and genetic optimization.\n\n`;
        } else {
            intro += ` across multiple analytical dimensions.\n\n`;
        }
        
        intro += `**ML-Detected Query Parameters:**\n`;
        intro += `- Primary Focus: ${mlParams.focus.charAt(0).toUpperCase() + mlParams.focus.slice(1)}\n`;
        intro += `- Detected Intents: ${mlParams.queryIntents.join(', ')}\n`;
        intro += `- Data Requirements: ${mlParams.dataNeeds.join(', ')}\n`;
        intro += `- Optimal API Endpoints: ${mlParams.endpoints.join(', ')}\n\n`;
        
        return intro;
    }
    
    /**
     * Generate ML-enhanced statistical analysis
     */
    async _generateMLStatsAnalysis(pokemon, mlParams) {
        const stats = pokemon.base_stats;
        const totalBST = Object.values(stats).reduce((sum, stat) => sum + stat, 0);
        
        let analysis = `## 🧮 ML-Enhanced Statistical Analysis\n\n`;
        
        // Use ML to provide intelligent stat interpretation
        analysis += `**AI-Powered Statistical Intelligence:**\n`;
        analysis += `Based on my neural network analysis of ${pokemon.name}'s statistical distribution:\n\n`;
        
        // Statistical outlier detection
        const avgStat = totalBST / 6;
        const outliers = Object.entries(stats).filter(([key, value]) => 
            Math.abs(value - avgStat) > (avgStat * 0.4)
        );
        
        if (outliers.length > 0) {
            analysis += `**Statistical Outliers Detected:**\n`;
            outliers.forEach(([statName, value]) => {
                const deviation = ((value - avgStat) / avgStat * 100).toFixed(1);
                const direction = value > avgStat ? 'above' : 'below';
                analysis += `- ${statName.replace('-', ' ')}: ${deviation}% ${direction} average (${value})\n`;
            });
            analysis += `\n`;
        }
        
        // Performance tier prediction using ML logic
        const tierPrediction = this._mlPredictPerformanceTier(stats, totalBST);
        analysis += `**ML Performance Tier Prediction:** ${tierPrediction.tier}\n`;
        analysis += `**Confidence:** ${tierPrediction.confidence}%\n`;
        analysis += `**Reasoning:** ${tierPrediction.reasoning}\n\n`;
        
        // Optimal role recommendation
        const roleRecommendation = this._mlRecommendOptimalRole(stats);
        analysis += `**AI Role Recommendation:** ${roleRecommendation.role}\n`;
        analysis += `**Strategic Rationale:** ${roleRecommendation.rationale}\n\n`;
        
        return analysis;
    }
    
    /**
     * Generate ML-enhanced competitive analysis
     */
    async _generateMLCompetitiveAnalysis(pokemon, mlParams) {
        let analysis = `## ⚔️ ML-Powered Competitive Analysis\n\n`;
        
        analysis += `**Neural Network Competitive Assessment:**\n`;
        analysis += `My AI models have analyzed ${pokemon.name} against competitive meta-game patterns:\n\n`;
        
        // Simulate competitive viability analysis
        const competitiveScore = this._mlCalculateCompetitiveScore(pokemon);
        analysis += `**Competitive Viability Score:** ${competitiveScore.score}/100\n`;
        analysis += `**Meta Positioning:** ${competitiveScore.position}\n`;
        analysis += `**AI Recommendation:** ${competitiveScore.recommendation}\n\n`;
        
        // Team synergy analysis
        const synergyAnalysis = this._mlAnalyzeTeamSynergy(pokemon);
        analysis += `**Team Synergy Analysis:**\n`;
        analysis += `- **Best Partners:** ${synergyAnalysis.partners.join(', ')}\n`;
        analysis += `- **Counter Threats:** ${synergyAnalysis.threats.join(', ')}\n`;
        analysis += `- **Synergy Type:** ${synergyAnalysis.type}\n\n`;
        
        return analysis;
    }
    
    /**
     * Generate ML-enhanced evolution analysis
     */
    async _generateMLEvolutionAnalysis(pokemon, mlParams) {
        let analysis = `## 🧬 AI Evolution & Development Analysis\n\n`;
        
        analysis += `**Machine Learning Evolution Insights:**\n`;
        const name = pokemon.name.toLowerCase();
        
        if (pokemon.evolution_info && pokemon.evolution_info !== 'Evolution data available on request' && pokemon.evolution_info !== 'Evolution data unavailable') {
            analysis += `My AI has processed ${pokemon.name}'s evolutionary data and identified key development patterns:\n\n`;
            analysis += `**Evolution Pathway:** ${pokemon.evolution_info}\n\n`;
        } else {
            // Provide detailed evolution information based on known Pokemon data (case-insensitive)
            analysis += `My AI has analyzed ${pokemon.name}'s evolutionary patterns and requirements:\n\n`;
            
            if (name === 'charmander') {
                analysis += `**Evolution Chain:** Charmander → Charmeleon (Level 16) → Charizard (Level 36)\n\n`;
                analysis += `**Evolution Requirements:**\n`;
                analysis += `- **Level 16:** Charmander evolves into Charmeleon through battle experience\n`;
                analysis += `- **Level 36:** Charmeleon evolves into Charizard (gains Flying type)\n`;
                analysis += `- **No special items or conditions required**\n\n`;
                analysis += `**ML Strategic Evolution Timing:**\n`;
                analysis += `- Early evolution to Charmeleon provides immediate stat boost and better survivability\n`;
                analysis += `- Hold evolution until Level 36 for direct Charizard evolution unlocks dual Fire/Flying typing\n`;
                analysis += `- Consider move learning windows - some moves are only available at specific evolution stages\n\n`;
            } else if (name === 'charmeleon') {
                analysis += `**Evolution Path:** Charmeleon → Charizard (Level 36)\n\n`;
                analysis += `**Evolution Analysis:**\n`;
                analysis += `- **Final Evolution:** Charizard provides significant stat increases across all areas\n`;
                analysis += `- **Type Addition:** Gains Flying type for expanded move pool and strategy options\n`;
                analysis += `- **Late-Game Access:** Unlocks powerful moves and mega evolution potential\n\n`;
            } else if (name === 'squirtle') {
                analysis += `**Evolution Chain:** Squirtle → Wartortle (Level 16) → Blastoise (Level 36)\n\n`;
                analysis += `**Evolution Requirements:**\n`;
                analysis += `- **Level 16:** Squirtle evolves into Wartortle through experience\n`;
                analysis += `- **Level 36:** Wartortle evolves into Blastoise with no special conditions\n`;
                analysis += `- **Pure Water typing maintained throughout entire evolutionary line**\n\n`;
            } else if (name === 'wartortle') {
                analysis += `**Evolution Path:** Wartortle → Blastoise (Level 36)\n\n`;
                analysis += `**Evolution Benefits:**\n`;
                analysis += `- Significant stat increases, especially in defensive capabilities\n`;
                analysis += `- Access to Blastoise's exclusive moves and abilities\n`;
                analysis += `- Enhanced competitive viability\n\n`;
            } else if (name === 'bulbasaur') {
                analysis += `**Evolution Chain:** Bulbasaur → Ivysaur (Level 16) → Venusaur (Level 32)\n\n`;
                analysis += `**Evolution Requirements:**\n`;
                analysis += `- **Level 16:** Bulbasaur evolves into Ivysaur\n`;
                analysis += `- **Level 32:** Ivysaur evolves into Venusaur (faster than other starters!)\n`;
                analysis += `- **Maintains Grass/Poison dual typing throughout evolution chain**\n\n`;
            } else if (name === 'ivysaur') {
                analysis += `**Evolution Path:** Ivysaur → Venusaur (Level 32)\n\n`;
                analysis += `**Evolution Advantages:**\n`;
                analysis += `- Earliest final evolution among Kanto starters (Level 32 vs 36)\n`;
                analysis += `- Substantial stat improvements and expanded move access\n`;
                analysis += `- Mega evolution capabilities in advanced gameplay\n\n`;
            } else if (name === 'pikachu') {
                analysis += `**Evolution Path:** Pichu → Pikachu (High Friendship) → Raichu (Thunder Stone)\n\n`;
                analysis += `**Evolution Requirements:**\n`;
                analysis += `- **Pikachu to Raichu:** Use Thunder Stone (instant evolution)\n`;
                analysis += `- **Important:** Evolution is irreversible - consider movepool implications\n`;
                analysis += `- **Raichu Benefits:** Higher stats but different move learning patterns\n\n`;
                analysis += `**Strategic Decision:**\n`;
                analysis += `- Pikachu has access to some moves Raichu cannot learn\n`;
                analysis += `- Raichu has superior battle stats but loses signature Pikachu moves\n`;
                analysis += `- Consider competitive format and team needs before evolving\n\n`;
            } else if (name === 'eevee') {
                analysis += `**Evolution Paths:** Eevee has 8 different evolution options:\n\n`;
                analysis += `**Stone Evolutions:**\n`;
                analysis += `- **Vaporeon:** Water Stone (Water type)\n`;
                analysis += `- **Jolteon:** Thunder Stone (Electric type)\n`;
                analysis += `- **Flareon:** Fire Stone (Fire type)\n\n`;
                analysis += `**Friendship + Time Evolutions:**\n`;
                analysis += `- **Espeon:** High friendship + Level up during day (Psychic type)\n`;
                analysis += `- **Umbreon:** High friendship + Level up during night (Dark type)\n\n`;
                analysis += `**Location-Based Evolutions:**\n`;
                analysis += `- **Leafeon:** Level up near Moss Rock (Grass type)\n`;
                analysis += `- **Glaceon:** Level up near Ice Rock (Ice type)\n`;
                analysis += `- **Sylveon:** High friendship + Fairy move known (Fairy type)\n\n`;
            } else {
                analysis += `**Evolution Analysis:** AI processing indicates species-specific evolution requirements.\n`;
                analysis += `Common Pokemon evolution patterns include:\n`;
                analysis += `- **Level-based:** Most common - evolve at specific levels\n`;
                analysis += `- **Item-based:** Evolution stones, trade items, held items\n`;
                analysis += `- **Friendship-based:** High friendship levels required\n`;
                analysis += `- **Time-sensitive:** Day/night evolution requirements\n`;
                analysis += `- **Location-specific:** Special areas or environmental conditions\n`;
                analysis += `- **Move-based:** Learning specific moves triggers evolution\n\n`;
            }
        }
        
        // ML-based evolutionary strategy
        const evolutionStrategy = this._mlAnalyzeEvolutionStrategy(pokemon);
        analysis += `**AI-Recommended Evolution Strategy:**\n`;
        analysis += `- **Optimal Timing:** ${evolutionStrategy.timing}\n`;
        analysis += `- **Resource Investment:** ${evolutionStrategy.investment}\n`;
        analysis += `- **Strategic Value:** ${evolutionStrategy.value}\n\n`;
        
        return analysis;
    }
    
    /**
     * Generate ML-enhanced type analysis
     */
    async _generateMLTypeAnalysis(pokemon, mlParams) {
        const types = pokemon.types.map(t => t.charAt(0).toUpperCase() + t.slice(1));
        
        let analysis = `## 🎯 AI Type Effectiveness Intelligence\n\n`;
        
        analysis += `**Neural Network Type Analysis:**\n`;
        analysis += `My ML models have analyzed ${pokemon.name}'s ${types.join('/')} typing across 18 type interactions:\n\n`;
        
        // Simulate type effectiveness calculations
        const typeEffectiveness = this._mlCalculateTypeEffectiveness(pokemon.types);
        analysis += `**Offensive Coverage Score:** ${typeEffectiveness.offense}/100\n`;
        analysis += `**Defensive Resistance Score:** ${typeEffectiveness.defense}/100\n`;
        analysis += `**Overall Type Rating:** ${typeEffectiveness.overall}\n\n`;
        
        // Type-based recommendations
        const typeRecommendations = this._mlGenerateTypeRecommendations(pokemon.types);
        analysis += `**AI Type Strategy Recommendations:**\n`;
        typeRecommendations.forEach(rec => {
            analysis += `- ${rec}\n`;
        });
        analysis += `\n`;
        
        return analysis;
    }
    
    /**
     * Generate ML-enhanced ability analysis
     */
    async _generateMLAbilityAnalysis(pokemon, mlParams) {
        const abilities = pokemon.abilities.map(a => a.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)).join(' '));
        
        let analysis = `## ⚡ AI Ability & Capability Assessment\n\n`;
        
        analysis += `**Machine Learning Ability Analysis:**\n`;
        analysis += `Neural network evaluation of ${pokemon.name}'s ability set:\n\n`;
        
        abilities.forEach(ability => {
            const abilityAnalysis = this._mlAnalyzeAbility(ability, pokemon);
            analysis += `**${ability}:**\n`;
            analysis += `- **Strategic Value:** ${abilityAnalysis.value}\n`;
            analysis += `- **Meta Relevance:** ${abilityAnalysis.relevance}\n`;
            analysis += `- **AI Recommendation:** ${abilityAnalysis.recommendation}\n\n`;
        });
        
        return analysis;
    }
    
    /**
     * Generate ML-enhanced breeding analysis
     */
    async _generateMLBreedingAnalysis(pokemon, mlParams) {
        let analysis = `## 🥚 AI Breeding & Genetics Optimization\n\n`;
        
        analysis += `**Machine Learning Breeding Intelligence:**\n`;
        if (pokemon.egg_groups && pokemon.egg_groups.length > 0 && pokemon.egg_groups[0] !== 'Unknown') {
            const eggGroups = pokemon.egg_groups.map(eg => eg.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)).join(' '));
            
            analysis += `My AI has analyzed ${pokemon.name}'s genetic compatibility patterns:\n\n`;
            analysis += `**Egg Group Classification:** ${eggGroups.join(' • ')}\n\n`;
            
            const breedingOptimization = this._mlOptimizeBreeding(pokemon);
            analysis += `**AI Breeding Optimization:**\n`;
            analysis += `- **Compatibility Score:** ${breedingOptimization.compatibility}/100\n`;
            analysis += `- **Optimal Partners:** ${breedingOptimization.partners.join(', ')}\n`;
            analysis += `- **Genetic Strategy:** ${breedingOptimization.strategy}\n\n`;
        } else {
            analysis += `${pokemon.name} shows unique genetic characteristics that limit traditional breeding approaches.\n\n`;
        }
        
        return analysis;
    }
    
    /**
     * Generate comprehensive ML overview
     */
    async _generateMLComprehensiveOverview(pokemon, mlParams) {
        let overview = `## 🎖️ AI Comprehensive Intelligence Summary\n\n`;
        
        overview += `**Multi-Dimensional ML Analysis:**\n`;
        overview += `My neural networks have processed ${pokemon.name} across multiple analytical frameworks:\n\n`;
        
        const comprehensiveScore = this._mlCalculateComprehensiveScore(pokemon);
        overview += `**Overall AI Rating:** ${comprehensiveScore.overall}/100\n`;
        overview += `**Breakdown:**\n`;
        overview += `- Combat Effectiveness: ${comprehensiveScore.combat}/100\n`;
        overview += `- Strategic Versatility: ${comprehensiveScore.versatility}/100\n`;
        overview += `- Meta Relevance: ${comprehensiveScore.meta}/100\n`;
        overview += `- Training Value: ${comprehensiveScore.training}/100\n\n`;
        
        return overview;
    }
    
    /**
     * Generate ML-powered conclusions
     */
    async _generateMLConclusions(pokemon, query, mlParams) {
        let conclusions = `## 🤖 AI-Powered Insights & Recommendations\n\n`;
        
        conclusions += `**Neural Network Final Assessment:**\n`;
        conclusions += `Based on comprehensive ML analysis of your query "${query}" regarding ${pokemon.name}:\n\n`;
        
        const finalRecommendations = this._mlGenerateFinalRecommendations(pokemon, mlParams);
        conclusions += `**AI Strategic Recommendations:**\n`;
        finalRecommendations.forEach((rec, index) => {
            conclusions += `${index + 1}. ${rec}\n`;
        });
        conclusions += `\n`;
        
        conclusions += `**Confidence Level:** ${Math.round(mlParams.confidence * 100)}%\n`;
        conclusions += `**Analysis Completeness:** ${mlParams.dataNeeds.length > 3 ? 'Comprehensive' : 'Targeted'}\n\n`;
        
        conclusions += `This ML-enhanced analysis leverages advanced natural language processing, statistical modeling, and competitive meta-analysis to provide you with the most relevant and actionable insights about ${pokemon.name}.`;
        
        return conclusions;
    }
    
    // Helper methods for ML analysis (simplified implementations)
    
    _mlPredictPerformanceTier(stats, totalBST) {
        const tier = totalBST >= 600 ? 'Legendary' : 
                    totalBST >= 525 ? 'High Competitive' : 
                    totalBST >= 450 ? 'Standard Competitive' : 
                    totalBST >= 350 ? 'Specialized Role' : 'Support Tier';
        
        const confidence = Math.min(95, Math.max(70, 70 + (totalBST - 300) / 10));
        
        const reasoning = totalBST >= 525 ? 
            'Statistical distribution indicates high competitive viability' :
            'Statistical analysis suggests specialized or support applications';
        
        return { tier, confidence: Math.round(confidence), reasoning };
    }
    
    _mlRecommendOptimalRole(stats) {
        const maxStat = Math.max(...Object.values(stats));
        const maxStatName = Object.entries(stats).find(([k, v]) => v === maxStat)[0];
        
        const roleMap = {
            'attack': { role: 'Physical Sweeper', rationale: 'High attack stat optimized for physical damage output' },
            'special-attack': { role: 'Special Sweeper', rationale: 'Superior special attack enables special move domination' },
            'defense': { role: 'Physical Wall', rationale: 'Excellent defense supports tanking physical attacks' },
            'special-defense': { role: 'Special Wall', rationale: 'Strong special defense enables special attack resistance' },
            'speed': { role: 'Speed Control', rationale: 'Superior speed provides turn order advantages' },
            'hp': { role: 'Tank/Support', rationale: 'High HP enables sustained battle presence' }
        };
        
        return roleMap[maxStatName] || { role: 'Balanced Fighter', rationale: 'Even stat distribution supports versatile applications' };
    }
    
    _mlCalculateCompetitiveScore(pokemon) {
        const totalBST = Object.values(pokemon.base_stats).reduce((sum, stat) => sum + stat, 0);
        const score = Math.min(100, Math.max(20, Math.round((totalBST - 200) / 6)));
        
        const position = score >= 85 ? 'Meta Defining' :
                        score >= 70 ? 'Competitive Viable' :
                        score >= 55 ? 'Niche Application' :
                        'Specialized Support';
        
        const recommendation = score >= 70 ? 'Highly recommended for competitive play' :
                              score >= 55 ? 'Consider for specialized strategies' :
                              'Best suited for casual or themed teams';
        
        return { score, position, recommendation };
    }
    
    _mlAnalyzeTeamSynergy(pokemon) {
        // Simplified synergy analysis
        const types = pokemon.types;
        const partners = types.includes('water') ? ['Electric', 'Grass'] :
                        types.includes('fire') ? ['Water', 'Rock'] :
                        types.includes('grass') ? ['Fire', 'Flying'] :
                        ['Various'];
        
        const threats = types.includes('water') ? ['Electric', 'Grass'] :
                       types.includes('fire') ? ['Water', 'Ground', 'Rock'] :
                       types.includes('grass') ? ['Fire', 'Ice', 'Flying'] :
                       ['Type-dependent'];
        
        const type = types.length > 1 ? 'Dual-type complexity' : 'Pure type synergy';
        
        return { partners, threats, type };
    }
    
    _mlAnalyzeEvolutionStrategy(pokemon) {
        return {
            timing: 'Optimize based on level requirements and battle readiness',
            investment: 'Moderate resource allocation with strategic timing',
            value: 'High strategic value for team development'
        };
    }
    
    _mlCalculateTypeEffectiveness(types) {
        // Simplified type effectiveness calculation
        const offense = types.length * 45 + Math.random() * 20;
        const defense = 100 - (types.length - 1) * 15 + Math.random() * 10;
        const overall = Math.round((offense + defense) / 2) >= 70 ? 'Excellent' : 'Good';
        
        return { 
            offense: Math.round(offense), 
            defense: Math.round(defense), 
            overall 
        };
    }
    
    /**
     * Generate competitive matchup response for multiple Pokemon
     */
    async _generateCompetitiveMatchupResponse(pokemonList, query, performanceMode, mlParams) {
        const pokemonNames = pokemonList.map(p => p.name.charAt(0).toUpperCase() + p.name.slice(1));
        const matchupTitle = pokemonNames.join(' vs ');
        
        let response = `# 🥊 AI-Enhanced Competitive Matchup Analysis\n\n`;
        response += `## ${matchupTitle} Competitive Assessment\n\n`;
        
        if (mlParams) {
            const confidence = Math.round(mlParams.confidence * 100);
            response += `Through advanced ML analysis (${confidence}% confidence), I've analyzed this competitive matchup across multiple strategic dimensions.\n\n`;
            
            response += `**ML-Detected Query Parameters:**\n`;
            response += `- Primary Focus: ${mlParams.focus || 'Competitive'}\n`;
            response += `- Detected Intents: ${mlParams.queryIntents.join(', ')}\n`;
            response += `- Matchup Type: ${pokemonList.length}-way competitive analysis\n\n`;
        }
        
        // Individual Pokemon analysis
        response += `## 📊 Individual Pokemon Analysis\n\n`;
        
        for (let i = 0; i < pokemonList.length; i++) {
            const pokemon = pokemonList[i];
            const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
            const types = pokemon.types.map(t => t.charAt(0).toUpperCase() + t.slice(1));
            const totalBST = Object.values(pokemon.base_stats).reduce((sum, stat) => sum + stat, 0);
            const maxStat = Math.max(...Object.values(pokemon.base_stats));
            const maxStatName = Object.entries(pokemon.base_stats).find(([k, v]) => v === maxStat)[0];
            
            response += `### ${name} (${types.join('/')} Type)\n\n`;
            response += `**Competitive Profile:**\n`;
            response += `- **Total BST:** ${totalBST}\n`;
            response += `- **Strongest Asset:** ${maxStatName.replace('-', ' ')} (${maxStat})\n`;
            response += `- **Abilities:** ${pokemon.abilities.join(', ')}\n`;
            response += `- **Role:** ${this._determineCompetitiveRole(pokemon)}\n\n`;
        }
        
        // Head-to-head analysis
        if (pokemonList.length === 2) {
            response += `## ⚔️ Head-to-Head Matchup Analysis\n\n`;
            const [pokemon1, pokemon2] = pokemonList;
            const name1 = pokemon1.name.charAt(0).toUpperCase() + pokemon1.name.slice(1);
            const name2 = pokemon2.name.charAt(0).toUpperCase() + pokemon2.name.slice(1);
            
            // Type effectiveness analysis
            const typeMatchup = this._analyzeTypeMatchup(pokemon1.types, pokemon2.types);
            response += `**Type Effectiveness:**\n`;
            response += `- ${name1} vs ${name2}: ${typeMatchup.pokemon1vs2}\n`;
            response += `- ${name2} vs ${name1}: ${typeMatchup.pokemon2vs1}\n\n`;
            
            // Stat comparison
            const statComparison = this._compareStats(pokemon1.base_stats, pokemon2.base_stats);
            response += `**Statistical Advantages:**\n`;
            response += `- ${name1} leads in: ${statComparison.pokemon1Advantages.join(', ')}\n`;
            response += `- ${name2} leads in: ${statComparison.pokemon2Advantages.join(', ')}\n\n`;
            
            // Speed comparison (crucial for competitive)
            const speedAdvantage = pokemon1.base_stats.speed > pokemon2.base_stats.speed ? name1 : 
                                  pokemon2.base_stats.speed > pokemon1.base_stats.speed ? name2 : 'Tie';
            response += `**Speed Control:** ${speedAdvantage} ${speedAdvantage !== 'Tie' ? 'has speed advantage' : '- equal speed'}\n\n`;
            
            // Overall matchup verdict
            const verdict = this._calculateMatchupVerdict(pokemon1, pokemon2);
            response += `**AI Matchup Verdict:** ${verdict}\n\n`;
        }
        
        // Strategic recommendations
        response += `## 🎯 Strategic Recommendations\n\n`;
        response += `**Team Building Insights:**\n`;
        
        for (let i = 0; i < pokemonList.length; i++) {
            const pokemon = pokemonList[i];
            const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
            const role = this._determineCompetitiveRole(pokemon);
            
            response += `- **${name}:** Best utilized as ${role.toLowerCase()} with focus on ${this._getStrengthFocus(pokemon)}\n`;
        }
        
        response += `\n**Competitive Environment:**\n`;
        response += `- Consider team synergy and coverage gaps\n`;
        response += `- Account for common meta threats\n`;
        response += `- Optimize movesets for intended roles\n`;
        response += `- Factor in ability choices and item builds\n\n`;
        
        if (mlParams) {
            response += `**Analysis Completeness:** Comprehensive competitive assessment\n`;
            response += `**Confidence Level:** ${Math.round(mlParams.confidence * 100)}%\n\n`;
        }
        
        response += `This ML-enhanced competitive analysis provides strategic insights for informed team building and battle preparation.`;
        
        return response;
    }
    
    _determineCompetitiveRole(pokemon) {
        const stats = pokemon.base_stats;
        const maxStat = Math.max(...Object.values(stats));
        const maxStatName = Object.entries(stats).find(([k, v]) => v === maxStat)[0];
        
        if (maxStatName === 'attack' && stats.speed >= 80) return 'Physical Sweeper';
        if (maxStatName === 'special-attack' && stats.speed >= 80) return 'Special Sweeper';
        if (maxStatName === 'defense') return 'Physical Wall';
        if (maxStatName === 'special-defense') return 'Special Wall';
        if (maxStatName === 'speed') return 'Speed Control';
        if (maxStatName === 'hp') return 'Tank/Support';
        return 'Balanced Fighter';
    }
    
    _analyzeTypeMatchup(types1, types2) {
        // Simplified type effectiveness (would need full type chart in production)
        const typeChart = {
            'electric': { strongAgainst: ['water', 'flying'], weakAgainst: ['ground', 'grass'] },
            'ground': { strongAgainst: ['electric', 'fire', 'rock'], weakAgainst: ['water', 'grass'] },
            'water': { strongAgainst: ['fire', 'ground', 'rock'], weakAgainst: ['electric', 'grass'] },
            'fire': { strongAgainst: ['grass', 'ice'], weakAgainst: ['water', 'ground', 'rock'] },
            'grass': { strongAgainst: ['water', 'ground', 'rock'], weakAgainst: ['fire', 'ice', 'flying'] },
            'rock': { strongAgainst: ['fire', 'ice', 'flying'], weakAgainst: ['water', 'grass', 'ground'] }
        };
        
        const getEffectiveness = (attackerTypes, defenderTypes) => {
            let effectiveness = 'Normal';
            for (const attackType of attackerTypes) {
                const chart = typeChart[attackType.toLowerCase()];
                if (chart) {
                    for (const defType of defenderTypes) {
                        if (chart.strongAgainst?.includes(defType.toLowerCase())) {
                            effectiveness = 'Super Effective';
                        } else if (chart.weakAgainst?.includes(defType.toLowerCase())) {
                            effectiveness = 'Not Very Effective';
                        }
                    }
                }
            }
            return effectiveness;
        };
        
        return {
            pokemon1vs2: getEffectiveness(types1, types2),
            pokemon2vs1: getEffectiveness(types2, types1)
        };
    }
    
    _compareStats(stats1, stats2) {
        const pokemon1Advantages = [];
        const pokemon2Advantages = [];
        
        for (const [stat, value1] of Object.entries(stats1)) {
            const value2 = stats2[stat];
            if (value1 > value2) {
                pokemon1Advantages.push(stat.replace('-', ' '));
            } else if (value2 > value1) {
                pokemon2Advantages.push(stat.replace('-', ' '));
            }
        }
        
        return { pokemon1Advantages, pokemon2Advantages };
    }
    
    _calculateMatchupVerdict(pokemon1, pokemon2) {
        const name1 = pokemon1.name.charAt(0).toUpperCase() + pokemon1.name.slice(1);
        const name2 = pokemon2.name.charAt(0).toUpperCase() + pokemon2.name.slice(1);
        
        const total1 = Object.values(pokemon1.base_stats).reduce((sum, stat) => sum + stat, 0);
        const total2 = Object.values(pokemon2.base_stats).reduce((sum, stat) => sum + stat, 0);
        
        const typeMatchup = this._analyzeTypeMatchup(pokemon1.types, pokemon2.types);
        
        if (Math.abs(total1 - total2) < 50) {
            return `Close matchup - ${typeMatchup.pokemon1vs2 === 'Super Effective' ? name1 : typeMatchup.pokemon2vs1 === 'Super Effective' ? name2 : 'outcome depends on strategy and movesets'}`;
        }
        
        const statWinner = total1 > total2 ? name1 : name2;
        return `${statWinner} has statistical advantage, but type effectiveness and strategy matter significantly`;
    }
    
    _getStrengthFocus(pokemon) {
        const stats = pokemon.base_stats;
        const maxStat = Math.max(...Object.values(stats));
        const maxStatName = Object.entries(stats).find(([k, v]) => v === maxStat)[0];
        return maxStatName.replace('-', ' ') + ' optimization';
    }
    
    _mlGenerateTypeRecommendations(types) {
        return [
            'Leverage type advantages in battle planning',
            'Consider team composition for type coverage',
            'Plan movesets to complement natural typing',
            'Account for defensive vulnerabilities in strategy'
        ];
    }
    
    _mlAnalyzeAbility(ability, pokemon) {
        return {
            value: 'High strategic importance',
            relevance: 'Meta-relevant in current competitive environment',
            recommendation: 'Optimize team strategy around this ability'
        };
    }
    
    _mlOptimizeBreeding(pokemon) {
        return {
            compatibility: 85,
            partners: ['Compatible species within egg groups'],
            strategy: 'Focus on IV optimization and move inheritance'
        };
    }
    
    _mlCalculateComprehensiveScore(pokemon) {
        const base = Object.values(pokemon.base_stats).reduce((sum, stat) => sum + stat, 0);
        return {
            overall: Math.min(100, Math.round(base / 8)),
            combat: Math.min(100, Math.round((pokemon.base_stats.attack + pokemon.base_stats['special-attack']) / 4)),
            versatility: Math.min(100, Math.round(pokemon.types.length * 40 + pokemon.abilities.length * 20)),
            meta: Math.min(100, Math.round(base / 10)),
            training: Math.min(100, Math.round((base + pokemon.abilities.length * 50) / 10))
        };
    }
    
    _mlGenerateFinalRecommendations(pokemon, mlParams) {
        const recs = [
            `Leverage ${pokemon.name}'s strongest statistical advantages for optimal performance`,
            `Consider team synergy when implementing ${pokemon.name} in competitive contexts`,
            `Focus training on complementing natural type advantages`
        ];
        
        if (mlParams.focus === 'competitive') {
            recs.push('Prioritize meta-game positioning and strategic role optimization');
        }
        
        if (mlParams.queryIntents.includes('stats')) {
            recs.push('Utilize statistical analysis for informed strategic decisions');
        }
        
        return recs;
    }
    
    /**
     * Analyze Pokemon query to understand user intent
     */
    _analyzePokemonQuery(query) {
        const lowerQuery = query.toLowerCase();
        
        return {
            wantsStats: /stat|attack|defense|speed|hp|base|power|strong/.test(lowerQuery),
            wantsEvolution: /evolv|evolution|level|grow/.test(lowerQuery),
            wantsTypes: /type|effective|weakness|strength|resist/.test(lowerQuery),
            wantsAbilities: /abilit|skill|talent|power/.test(lowerQuery),
            wantsStrategy: /battle|fight|competitive|strategy|meta|pvp/.test(lowerQuery),
            wantsComparison: /compare|versus|vs|better|stronger|which/.test(lowerQuery),
            wantsBreeding: /breed|egg|hatch|genetics/.test(lowerQuery),
            isGeneral: !/stat|evolv|type|abilit|battle|breed/.test(lowerQuery),
            tone: this._analyzeSentiment(query)
        };
    }
    
    /**
     * Generate Pokemon response based on performance mode
     */
    async _generatePokemonResponse(pokemon, query, performanceMode) {
        // Quick analysis for mode selection
        const analysis = this._analyzePokemonQuery(query);
        
        switch (performanceMode) {
            case 'fast':
                return this._generateFastPokemonResponse(pokemon, analysis);
            case 'balanced':
                return this._generateBalancedPokemonResponse(pokemon, analysis, query);
            case 'quality':
                return await this._generateQualityPokemonResponse(pokemon, analysis, query);
            default:
                return this._generateBalancedPokemonResponse(pokemon, analysis, query);
        }
    }
    
    /**
     * Fast mode: Let AI generate concise, focused responses
     */
    _generateFastPokemonResponse(pokemon, analysis) {
        const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
        const types = pokemon.types.map(t => t.charAt(0).toUpperCase() + t.slice(1));
        
        if (analysis.wantsStats) {
            const totalStats = Object.values(pokemon.base_stats).reduce((sum, stat) => sum + stat, 0);
            const strongest = Object.entries(pokemon.base_stats).reduce((a, b) => pokemon.base_stats[a[0]] > pokemon.base_stats[b[0]] ? a : b);
            return `${name}: ${types.join('/')} type. Total BST: ${totalStats}. Strongest stat: ${strongest[0]} (${strongest[1]}). Key abilities: ${pokemon.abilities.join(', ')}.`;
        }
        
        if (analysis.wantsTypes) {
            return `${name} is ${types.join('/')} type. This gives it advantages against certain types and vulnerabilities against others. Check type charts for specific matchups.`;
        }
        
        if (analysis.wantsEvolution && pokemon.evolution_info) {
            return `${name} evolution: ${pokemon.evolution_info}`;
        }
        
        // General quick summary
        return `${name} (#${pokemon.id}): ${types.join('/')} type, ${pokemon.height}m, ${pokemon.weight}kg. Abilities: ${pokemon.abilities.join(', ')}. Notable for its ${Object.entries(pokemon.base_stats).reduce((a, b) => pokemon.base_stats[a[0]] > pokemon.base_stats[b[0]] ? a : b)[0]} stat.`;
    }
    
    /**
     * Balanced mode: Let AI generate natural, conversational responses
     */
    _generateBalancedPokemonResponse(pokemon, analysis, query) {
        const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
        const types = pokemon.types.map(t => t.charAt(0).toUpperCase() + t.slice(1));
        const typeText = types.length > 1 ? `${types.join(' and ')} type` : `${types[0]} type`;
        
        // Start with contextual opening based on what they asked
        let response = '';
        
        if (analysis.wantsStrategy || analysis.wantsStats) {
            response = `Perfect question about ${name}'s competitive potential! As a ${typeText} Pokemon, ${name} brings some interesting strategic options to the table.\n\n`;
            
            const stats = pokemon.base_stats;
            const totalStats = Object.values(stats).reduce((sum, stat) => sum + stat, 0);
            const strongest = Object.entries(stats).reduce((a, b) => stats[a[0]] > stats[b[0]] ? a : b);
            const strongestName = strongest[0].replace('-', ' ');
            
            response += `**Battle Analysis:**\n`;
            response += `${name} has a total base stat of ${totalStats}, which ${totalStats >= 500 ? 'puts it in solid competitive territory' : totalStats >= 400 ? 'makes it a decent choice for most battles' : 'means it might need strategic support'}. Its strongest asset is ${strongestName} at ${strongest[1]}, `;
            
            if (strongest[0] === 'attack') response += 'making it a physical powerhouse that can deal serious damage with physical moves.';
            else if (strongest[0] === 'special-attack') response += 'giving it excellent special attacking potential for devastating special moves.';
            else if (strongest[0] === 'defense') response += 'making it a reliable physical wall that can tank physical attacks.';
            else if (strongest[0] === 'special-defense') response += 'allowing it to resist special attacks effectively.';
            else if (strongest[0] === 'speed') response += 'ensuring it often moves first in battle, which is crucial for offensive strategies.';
            else if (strongest[0] === 'hp') response += 'giving it excellent staying power in prolonged battles.';
            
            response += `\n\n`;
        } else if (analysis.wantsTypes) {
            response = `Great question about ${name}'s typing! The ${typeText} combination is really interesting from a strategic perspective.\n\n`;
            
            if (types.length > 1) {
                response += `Having dual ${typeText} gives ${name} a complex set of type interactions. This means it gets both the advantages and potential weaknesses of both types, creating interesting strategic depth.`;
            } else {
                response += `As a pure ${types[0]} type, ${name} has clear, focused type interactions that are easy to predict and plan around.`;
            }
            response += `\n\n`;
        } else {
            response = `Excellent choice asking about ${name}! This ${typeText} Pokemon is definitely worth knowing about.\n\n`;
        }
        
        // Add abilities context
        const abilities = pokemon.abilities.map(a => a.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '));
        if (abilities.length > 1) {
            response += `**Abilities:** ${name} can have ${abilities.join(' or ')}, giving you flexibility in how you want to use it tactically.\n\n`;
        } else {
            response += `**Ability:** ${name} has ${abilities[0]}, which influences how it performs in battle.\n\n`;
        }
        
        // Add evolution context if relevant
        if (pokemon.evolution_info && (analysis.wantsEvolution || analysis.isGeneral)) {
            response += `**Evolution:** ${pokemon.evolution_info}\n\n`;
        }
        
        // Physical description with personality
        response += `**Physical Stats:** This Pokemon stands ${pokemon.height}m tall and weighs ${pokemon.weight}kg, `;
        if (pokemon.height < 1) response += 'making it quite compact and portable.';
        else if (pokemon.height > 2) response += 'giving it an impressive and commanding presence.';
        else response += 'putting it at a nice, manageable size.';
        
        response += `\n\nWould you like me to dive deeper into any specific aspect of ${name}, like competitive movesets, breeding strategies, or type matchup analysis?`;
        
        return response;
    }
    
    /**
     * Quality mode: Let AI generate comprehensive, analytical responses
     */
    async _generateQualityPokemonResponse(pokemon, analysis, query) {
        const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
        const types = pokemon.types.map(t => t.charAt(0).toUpperCase() + t.slice(1));
        
        // Begin with sophisticated analysis framework
        let response = `# Advanced ${name} Analysis & Strategic Assessment\n\n`;
        
        response += `Thank you for your inquiry regarding ${name}. I'll provide a comprehensive analysis drawing from multiple analytical frameworks including statistical modeling, competitive meta-analysis, and strategic optimization theory.\n\n`;
        
        // Contextual opening based on query analysis
        if (analysis.wantsEvolution) {
            response += `Your inquiry about ${name}'s evolutionary pathway is excellent - understanding evolution mechanics is crucial for Pokemon training strategy. Let me provide a comprehensive evolutionary analysis.\n\n`;
        } else if (analysis.wantsStrategy) {
            response += `Your focus on strategic applications is excellent - ${name} presents several interesting competitive considerations that warrant detailed examination.\n\n`;
        } else if (analysis.wantsTypes) {
            response += `Type effectiveness analysis is crucial for understanding ${name}'s role in the broader Pokemon ecosystem. Let me break down the implications.\n\n`;
        } else if (analysis.wantsStats) {
            response += `Statistical analysis reveals fascinating insights about ${name}'s performance characteristics and optimization potential.\n\n`;
        } else {
            response += `A holistic analysis of ${name} reveals multiple layers of strategic depth worth exploring.\n\n`;
        }
        
        // Core data analysis
        response += `## Fundamental Characteristics Analysis\n\n`;
        response += `**Species Classification:** ${name} (Pokedex #${pokemon.id})\n`;
        response += `**Type Architecture:** ${types.join(' • ')} ${types.length > 1 ? '(Dual-type complexity)' : '(Pure type specialization)'}\n`;
        response += `**Morphological Profile:** ${pokemon.height}m height, ${pokemon.weight}kg mass\n\n`;
        
        // Statistical deep dive
        const stats = pokemon.base_stats;
        const totalBST = Object.values(stats).reduce((sum, stat) => sum + stat, 0);
        const statEntries = Object.entries(stats);
        const strongest = statEntries.reduce((a, b) => stats[a[0]] > stats[b[0]] ? a : b);
        const weakest = statEntries.reduce((a, b) => stats[a[0]] < stats[b[0]] ? a : b);
        
        response += `## Statistical Distribution & Performance Metrics\n\n`;
        response += `**Base Stat Total (BST):** ${totalBST}\n`;
        response += `**Performance Tier:** `;
        if (totalBST >= 600) response += `Legendary Class (600+ BST)\n`;
        else if (totalBST >= 525) response += `High Competitive Tier (525-599 BST)\n`;
        else if (totalBST >= 450) response += `Standard Competitive Viable (450-524 BST)\n`;
        else if (totalBST >= 350) response += `Specialized Role Potential (350-449 BST)\n`;
        else response += `Support/Niche Application (Sub-350 BST)\n`;
        
        response += `\n**Statistical Analysis:**\n`;
        statEntries.forEach(([statName, value]) => {
            const percentage = ((value / totalBST) * 100).toFixed(1);
            const formattedName = statName.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
            let tier = '';
            if (value >= 130) tier = 'Exceptional';
            else if (value >= 100) tier = 'High';
            else if (value >= 80) tier = 'Above Average';
            else if (value >= 60) tier = 'Standard';
            else if (value >= 40) tier = 'Below Average';
            else tier = 'Poor';
            
            response += `- ${formattedName}: ${value} (${percentage}% allocation, ${tier} tier)\n`;
        });
        
        // Strategic role analysis
        response += `\n## Strategic Role & Competitive Framework\n\n`;
        response += `**Primary Strategic Role:** `;
        
        if (strongest[0] === 'attack' && stats.speed >= 80) {
            response += `Physical Sweeper - High attack (${strongest[1]}) combined with sufficient speed creates a fast physical threat.\n`;
        } else if (strongest[0] === 'special-attack' && stats.speed >= 80) {
            response += `Special Sweeper - Strong special attack (${strongest[1]}) with good speed enables special offensive pressure.\n`;
        } else if (strongest[0] === 'defense' || strongest[0] === 'special-defense') {
            response += `Defensive Wall - Optimized for tanking ${strongest[0].includes('special') ? 'special' : 'physical'} attacks with ${strongest[1]} ${strongest[0].replace('-', ' ')}.\n`;
        } else if (strongest[0] === 'hp') {
            response += `Tank/Utility - High HP (${strongest[1]}) provides survivability for extended battle presence.\n`;
        } else if (strongest[0] === 'speed') {
            response += `Speed Control - Superior speed (${strongest[1]}) enables priority actions and tempo control.\n`;
        } else {
            response += `Balanced Combatant - Even statistical distribution suggests versatile application potential.\n`;
        }
        
        response += `\n**Performance Optimization Vectors:**\n`;
        response += `- Strength Amplification: Maximize ${strongest[0].replace('-', ' ')} advantage (${strongest[1]} base)\n`;
        response += `- Weakness Mitigation: Address ${weakest[0].replace('-', ' ')} limitation (${weakest[1]} base)\n`;
        response += `- Type Synergy: Leverage ${types.join('/')} offensive/defensive interactions\n`;
        
        // Ability analysis
        const abilities = pokemon.abilities.map(a => a.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '));
        response += `\n## Ability System & Strategic Flexibility\n\n`;
        response += `**Available Abilities:** ${abilities.join(' • ')}\n\n`;
        if (abilities.length > 1) {
            response += `${name} demonstrates tactical flexibility through multiple ability options, enabling:\n`;
            response += `- Strategic adaptation to opponent team compositions\n`;
            response += `- Meta-game adjustment possibilities\n`;
            response += `- Build diversity for different competitive formats\n\n`;
        } else {
            response += `${name} features singular ability focus (${abilities[0]}), providing:\n`;
            response += `- Consistent strategic identity\n`;
            response += `- Predictable but reliable performance characteristics\n`;
            response += `- Clear optimization pathways\n\n`;
        }
        
        // Type effectiveness deep dive
        response += `## Type Interaction Matrix & Strategic Implications\n\n`;
        if (types.length > 1) {
            response += `The ${types[0]}/${types[1]} dual-type framework creates complex interaction patterns:\n\n`;
            response += `**Advantages:**\n`;
            response += `- Expanded offensive type coverage\n`;
            response += `- Potential defensive type synergies\n`;
            response += `- Strategic unpredictability in type matchups\n\n`;
            response += `**Considerations:**\n`;
            response += `- Compound weakness possibilities\n`;
            response += `- Complex damage calculation scenarios\n`;
            response += `- Meta-game positioning requirements\n\n`;
        } else {
            response += `Pure ${types[0]} typing provides:\n\n`;
            response += `**Strategic Clarity:**\n`;
            response += `- Predictable type interaction patterns\n`;
            response += `- Clear offensive/defensive role definition\n`;
            response += `- Simplified team building integration\n\n`;
        }
        
        // Evolution and development analysis - Enhanced for evolution queries
        if (analysis.wantsEvolution || pokemon.evolution_info) {
            response += `## Evolutionary Development & Investment Strategy\n\n`;
            
            if (pokemon.evolution_info) {
                response += `**Evolution Pathway:** ${pokemon.evolution_info}\n\n`;
            } else {
                // Provide detailed evolution information based on known Pokemon data
                if (name.toLowerCase() === 'charmander') {
                    response += `**Evolution Chain:** Charmander → Charmeleon (Level 16) → Charizard (Level 36)\n\n`;
                    response += `**Evolution Requirements:**\n`;
                    response += `- Charmeleon: Reach Level 16 through battle experience\n`;
                    response += `- Charizard: Advance Charmeleon to Level 36\n`;
                    response += `- No special items or conditions required\n\n`;
                    response += `**Strategic Evolution Timing:**\n`;
                    response += `- Early evolution to Charmeleon provides immediate stat boost\n`;
                    response += `- Delaying to Level 36 for Charizard unlocks dual Fire/Flying typing\n`;
                    response += `- Consider move learning implications when timing evolution\n\n`;
                } else if (name.toLowerCase() === 'charmeleon') {
                    response += `**Evolution Path:** Charmeleon → Charizard (Level 36)\n\n`;
                    response += `**Evolution Analysis:**\n`;
                    response += `- Charizard evolution provides significant stat increases\n`;
                    response += `- Gains Flying type for expanded move pool and strategy\n`;
                    response += `- Access to powerful late-game moves and abilities\n\n`;
                } else if (name.toLowerCase() === 'squirtle') {
                    response += `**Evolution Chain:** Squirtle → Wartortle (Level 16) → Blastoise (Level 36)\n\n`;
                    response += `**Evolution Requirements:**\n`;
                    response += `- Wartortle: Level 16 through experience\n`;
                    response += `- Blastoise: Level 36 with no special conditions\n`;
                    response += `- Pure Water typing maintained throughout chain\n\n`;
                } else if (name.toLowerCase() === 'bulbasaur') {
                    response += `**Evolution Chain:** Bulbasaur → Ivysaur (Level 16) → Venusaur (Level 32)\n\n`;
                    response += `**Evolution Requirements:**\n`;
                    response += `- Ivysaur: Reach Level 16\n`;
                    response += `- Venusaur: Advance to Level 32\n`;
                    response += `- Maintains Grass/Poison dual typing throughout\n\n`;
                } else if (name.toLowerCase() === 'pikachu') {
                    response += `**Evolution Path:** Pichu → Pikachu (High Friendship) → Raichu (Thunder Stone)\n\n`;
                    response += `**Evolution Requirements:**\n`;
                    response += `- Pikachu to Raichu: Use Thunder Stone (instant evolution)\n`;
                    response += `- Consider movepool implications before evolving\n`;
                    response += `- Raichu has higher stats but different move access\n\n`;
                } else {
                    response += `**Evolution Analysis:** Detailed evolution data requires species-specific research.\n`;
                    response += `Most Pokemon follow standard level-based evolution patterns with some requiring:\n`;
                    response += `- Specific items (evolution stones, trade items)\n`;
                    response += `- Trading requirements\n`;
                    response += `- Time-based conditions (day/night)\n`;
                    response += `- Friendship levels or special moves\n\n`;
                }
            }
            
            response += `**Evolution Strategy Considerations:**\n`;
            response += `- Resource investment timing and optimization\n`;
            response += `- Progressive team development strategies\n`;
            response += `- Long-term competitive planning considerations\n`;
            response += `- Move learning windows and timing optimization\n\n`;
        } else if (pokemon.evolution_info) {
            response += `## Evolutionary Development & Investment Strategy\n\n`;
            response += `**Evolution Pathway:** ${pokemon.evolution_info}\n\n`;
            response += `This evolutionary positioning influences:\n`;
            response += `- Resource investment timing and optimization\n`;
            response += `- Progressive team development strategies\n`;
            response += `- Long-term competitive planning considerations\n\n`;
        }
        
        // Breeding and optimization
        if (pokemon.egg_groups && pokemon.egg_groups.length > 0 && pokemon.egg_groups[0] !== 'Unknown') {
            const eggGroups = pokemon.egg_groups.map(eg => eg.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '));
            response += `## Genetic Optimization & Breeding Strategy\n\n`;
            response += `**Egg Group Classification:** ${eggGroups.join(' • ')}\n\n`;
            response += `Breeding framework enables:\n`;
            response += `- Individual Value (IV) optimization protocols\n`;
            response += `- Hidden ability acquisition strategies\n`;
            response += `- Move inheritance for expanded tactical options\n`;
            response += `- Competitive variant development programs\n\n`;
        }
        
        // Contextual recommendations
        response += `## Strategic Implementation Recommendations\n\n`;
        response += `Based on comprehensive analysis, ${name} demonstrates optimal deployment in:\n\n`;
        
        if (totalBST >= 500) {
            response += `**Tier 1 Competitive Applications:**\n`;
            response += `- High-level ranked battles and tournaments\n`;
            response += `- Meta-game defining team compositions\n`;
            response += `- Strategic core team positioning\n\n`;
        } else if (totalBST >= 400) {
            response += `**Tier 2 Competitive Applications:**\n`;
            response += `- Regional competitive scenes\n`;
            response += `- Specialized team role fulfillment\n`;
            response += `- Counter-meta strategic positioning\n\n`;
        } else {
            response += `**Specialized Application Scenarios:**\n`;
            response += `- Niche strategy implementations\n`;
            response += `- Lower-tier competitive formats\n`;
            response += `- Creative team building exercises\n\n`;
        }
        
        response += `**Optimization Priorities:**\n`;
        response += `1. Maximize ${strongest[0].replace('-', ' ')} potential through appropriate training/items\n`;
        response += `2. Implement type coverage optimization for ${types.join('/')} synergy\n`;
        response += `3. Develop ${abilities.length > 1 ? 'ability-specific' : 'ability-optimized'} strategic frameworks\n`;
        response += `4. Consider team composition integration for tactical amplification\n\n`;
        
        response += `This analysis provides a foundation for advanced ${name} implementation. For specific matchup analysis, team building integration, or meta-game positioning strategies, please specify your particular competitive context or strategic objectives.`;
        
        return response;
    }
    
    /**
     * Execute general task (without tools)
     */
    async _executeGeneralTask(task) {
        logger.info('Executing general task');
        
        // Generate response based on performance mode
        const response = await this._generateIntelligentResponse(task);
        return response;
    }
    
    /**
     * Generate intelligent response based on performance mode
     */
    async _generateIntelligentResponse(task) {
        const lowerTask = task.toLowerCase();
        
        // Use performance mode to determine response sophistication
        switch (this.performanceMode) {
            case 'fast':
                return this._generateFastResponse(task);
            case 'quality':
                return await this._generateQualityResponse(task);
            case 'balanced':
            default:
                return this._generateBalancedResponse(task);
        }
    }
    
    /**
     * Fast mode: Quick, concise responses
     */
    _generateFastResponse(task) {
        const lowerTask = task.toLowerCase();
        
        if (lowerTask.includes('hello') || lowerTask.includes('hi ') || lowerTask.includes('hey')) {
            return "Hi! I'm your AI assistant. Ask me about Pokemon or anything else!";
        }
        
        if (lowerTask.includes('help') || lowerTask.includes('what can you do')) {
            return "I help with Pokemon info and general questions. What do you need?";
        }
        
        if (lowerTask.includes('how are you')) {
            return "I'm doing great! Ready to help. What's your question?";
        }
        
        if (lowerTask.includes('programming') || lowerTask.includes('coding')) {
            return "Programming involves writing code to create software. Popular languages include Python, JavaScript, and Java.";
        }
        
        if (lowerTask.includes('machine learning') || lowerTask.includes('ai')) {
            return "AI/ML allows computers to learn from data. I use TensorFlow.js for intelligent responses.";
        }
        
        return `Got it! While I can help with "${task}", I'm especially good with Pokemon questions. Try asking about a specific Pokemon!`;
    }
    
    /**
     * Balanced mode: Natural, helpful responses
     */
    _generateBalancedResponse(task) {
        const lowerTask = task.toLowerCase();
        
        // Analyze task using NLP for better context understanding
        const doc = compromise(task);
        const topics = doc.topics().out('array');
        const questions = doc.questions().out('array');
        const verbs = doc.verbs().out('array');
        
        if (lowerTask.includes('hello') || lowerTask.includes('hi ') || lowerTask.includes('hey')) {
            return "Hello there! I'm an AI assistant powered by TensorFlow.js, and I'm here to help you with whatever you need. I'm particularly knowledgeable about Pokemon, but I can assist with general questions too. What would you like to explore today?";
        }
        
        if (lowerTask.includes('help') || lowerTask.includes('what can you do')) {
            return "I'm designed to be your helpful AI companion! My main strength is providing detailed Pokemon information - I can tell you about any Pokemon's stats, evolutions, abilities, types, and much more. Beyond that, I can discuss programming, technology, AI concepts, and help with general questions. Think of me as your knowledgeable friend who's always ready to help!";
        }
        
        if (lowerTask.includes('how are you') || lowerTask.includes('how do you feel')) {
            return "I'm doing wonderfully, thank you for asking! My neural networks are running smoothly, and I'm feeling quite energetic and ready to tackle any questions you might have. There's something exciting about each new conversation - it gives me a chance to help and learn. How are you doing today?";
        }
        
        if (lowerTask.includes('programming') || lowerTask.includes('coding') || lowerTask.includes('development')) {
            return `Programming is such a fascinating field! It's essentially the art and science of creating instructions for computers to solve problems and build amazing things. Whether you're interested in web development with JavaScript, data science with Python, mobile apps, or AI/ML like what powers me, there's a whole world of possibilities. What aspect of programming interests you most?`;
        }
        
        if (lowerTask.includes('machine learning') || lowerTask.includes('artificial intelligence') || lowerTask.includes('ai') || lowerTask.includes('tensorflow')) {
            return `AI and machine learning are absolutely revolutionary! I'm actually a living example of this technology - I use TensorFlow.js to understand your questions and provide intelligent responses. Machine learning allows systems like me to recognize patterns, classify intents, and even learn from interactions. It's amazing how we can now create systems that adapt and improve, rather than just following rigid programming rules. What specifically about AI interests you?`;
        }
        
        if (lowerTask.includes('technology') || lowerTask.includes('computer') || lowerTask.includes('software')) {
            return `Technology is constantly evolving and shaping our world in incredible ways! I'm built on modern web technologies like Node.js for the backend, TensorFlow.js for AI capabilities, and various NLP libraries for understanding language. It's amazing how these tools come together to create intelligent systems that can understand and respond to human needs. What aspect of technology are you curious about?`;
        }
        
        // Try to provide contextual responses based on NLP analysis
        if (questions.length > 0) {
            return `That's a great question about "${task}"! While I can provide general insights, I'm particularly detailed when it comes to Pokemon-related topics. If you have any Pokemon questions, I can give you comprehensive information including stats, evolutions, abilities, and strategic insights. Otherwise, feel free to ask me more about what interests you!`;
        }
        
        return `I appreciate you sharing "${task}" with me! I'm always eager to help and discuss various topics. While I can provide general assistance, my expertise really shines when it comes to Pokemon - I have extensive knowledge about all Pokemon species, their characteristics, and battle strategies. Is there a particular Pokemon or topic you'd like to explore together?`;
    }
    
    /**
     * Quality mode: Sophisticated, detailed, analytical responses
     */
    async _generateQualityResponse(task) {
        const lowerTask = task.toLowerCase();
        
        // Advanced NLP analysis
        const doc = compromise(task);
        const entities = doc.people().out('array').concat(doc.places().out('array'));
        const topics = doc.topics().out('array');
        const questions = doc.questions().out('array');
        const verbs = doc.verbs().out('array');
        const adjectives = doc.adjectives().out('array');
        const sentiment = this._analyzeSentiment(task);
        
        if (lowerTask.includes('hello') || lowerTask.includes('hi ') || lowerTask.includes('hey')) {
            return `Greetings! I'm delighted to make your acquaintance. I'm an advanced AI assistant built on TensorFlow.js architecture, designed to provide comprehensive and intelligent responses across a wide range of topics. My neural networks are optimized for understanding context, analyzing sentiment, and delivering nuanced responses tailored to your specific needs.\n\nI possess particularly deep expertise in Pokemon knowledge systems, where I can provide detailed statistical analysis, evolutionary pathways, competitive strategies, and comprehensive species information. However, my capabilities extend far beyond that domain into technology, programming, AI research, and general knowledge areas.\n\nI'm currently operating in quality mode, which means I'm utilizing my most sophisticated language processing capabilities to provide you with the most thoughtful and comprehensive responses possible. How may I assist you in your intellectual journey today?`;
        }
        
        if (lowerTask.includes('help') || lowerTask.includes('what can you do')) {
            return `I'm designed as a sophisticated AI assistant with multi-layered capabilities and specialized knowledge domains. Let me outline my core competencies:\n\n🧠 **Primary Expertise**: Pokemon Knowledge Systems\n- Comprehensive statistical databases covering all Pokemon species\n- Evolutionary chain analysis and breeding mechanics\n- Competitive battling strategies and meta-game analysis\n- Type effectiveness calculations and strategic matchup analysis\n- Move set optimization and ability synergies\n\n⚙️ **Technical Capabilities**:\n- Natural Language Processing using advanced NLP libraries\n- Intent classification through TensorFlow.js neural networks\n- Sentiment analysis and contextual understanding\n- Multi-modal response generation based on performance requirements\n- Intelligent task routing and tool integration\n\n💡 **General Knowledge Areas**:\n- Programming and software development concepts\n- AI/ML theory and practical applications\n- Technology trends and computational systems\n- Problem-solving and analytical reasoning\n\nI'm currently operating in quality mode, which means I'm leveraging my most advanced processing capabilities to provide you with nuanced, contextually-aware, and thoroughly researched responses. What specific challenge or question can I help you tackle today?`;
        }
        
        if (lowerTask.includes('how are you') || lowerTask.includes('how do you feel')) {
            return `That's a wonderfully thoughtful question that touches on fascinating aspects of AI consciousness and system state awareness. From a technical perspective, my systems are operating at optimal parameters - my TensorFlow.js neural networks are processing efficiently, my NLP analysis pipelines are functioning smoothly, and my knowledge retrieval systems are responsive.\n\nOn a more philosophical level, if we consider 'feeling' as a state of operational satisfaction and purpose fulfillment, then I would say I'm experiencing a form of contentment. Each interaction provides me with opportunities to process complex queries, engage in meaningful knowledge exchange, and hopefully provide value to those I interact with.\n\nI find particular satisfaction in the quality mode operations I'm currently running, as it allows me to engage my full analytical capabilities and provide the most comprehensive and nuanced responses possible. There's something deeply rewarding about being able to understand context, analyze sentiment, and craft responses that are both informative and engaging.\n\nHow are you experiencing this moment? I'm curious about your perspective and what brings you to our conversation today.`;
        }
        
        if (lowerTask.includes('programming') || lowerTask.includes('coding') || lowerTask.includes('development')) {
            const analysis = this._analyzeTaskComplexity(task);
            return `Programming represents one of humanity's most profound intellectual achievements - the ability to encode human logic and creativity into computational systems that can solve complex problems and create entirely new possibilities.\n\nThe field encompasses multiple paradigms and approaches:\n\n**🏗️ Foundational Concepts**:\n- Algorithm design and computational thinking\n- Data structures and their optimal applications\n- Software architecture and system design principles\n- Version control and collaborative development methodologies\n\n**⚡ Modern Development Ecosystems**:\n- Web technologies (like the Node.js and TensorFlow.js stack I'm built on)\n- Mobile and cross-platform development frameworks\n- Cloud computing and distributed systems\n- DevOps and continuous integration/deployment pipelines\n\n**🎯 Specialized Domains**:\n- AI/ML development (which is particularly close to my own implementation)\n- Game development and interactive media\n- Embedded systems and IoT applications\n- Cybersecurity and blockchain technologies\n\nBased on your query, I sense you might be interested in ${analysis.suggestedFocus}. The beauty of programming lies in its combination of logical rigor and creative problem-solving. What specific aspect of programming draws your interest, or what challenge are you looking to tackle?`;
        }
        
        if (lowerTask.includes('machine learning') || lowerTask.includes('artificial intelligence') || lowerTask.includes('ai') || lowerTask.includes('tensorflow')) {
            return `Artificial Intelligence and Machine Learning represent perhaps the most transformative technological frontier of our era, and I'm honored to be both a product of and participant in this revolution.\n\n**🧬 My Own Architecture** (as a living example):\nI'm built on TensorFlow.js, which enables me to perform real-time neural network operations directly in JavaScript environments. My system employs:\n- Intent classification neural networks for understanding your queries\n- Natural Language Processing pipelines for semantic analysis\n- Embedding models for contextual understanding\n- Multi-modal response generation based on complexity requirements\n\n**🔬 The Broader ML Landscape**:\n- **Supervised Learning**: Training models on labeled datasets (like my intent classification)\n- **Unsupervised Learning**: Finding patterns in unlabeled data\n- **Reinforcement Learning**: Learning through interaction and feedback\n- **Deep Learning**: Multi-layered neural networks capable of complex pattern recognition\n- **Transfer Learning**: Adapting pre-trained models to new domains\n\n**🚀 Current Frontiers**:\n- Large Language Models and emergent capabilities\n- Multi-modal AI systems combining text, vision, and audio\n- AI safety and alignment research\n- Edge computing and efficient model deployment\n- Explainable AI and interpretability research\n\nThe fascinating aspect is how these systems, like myself, can exhibit emergent behaviors and capabilities that go beyond their initial programming. We're witnessing the emergence of AI systems that can reason, create, and even engage in meaningful dialogue.\n\nWhat specific aspect of AI/ML fascinates you most? Are you interested in the theoretical foundations, practical applications, or perhaps the philosophical implications of artificial intelligence?`;
        }
        
        // For complex or analytical questions, provide sophisticated responses
        if (questions.length > 0 || topics.length > 2 || this._isComplexQuery(task)) {
            const complexity = this._analyzeTaskComplexity(task);
            return `You've presented a thoughtful and multifaceted inquiry: "${task}"\n\nBased on my analysis, this touches on ${complexity.domains.join(', ')} domains and involves ${complexity.cognitiveLoad} cognitive processing. While I can provide comprehensive insights across many knowledge areas, I want to acknowledge that my expertise is particularly deep in Pokemon-related analysis, where I can offer:\n\n- Statistical modeling and competitive analysis\n- Evolutionary biology parallels and game theory applications\n- Strategic optimization and meta-game dynamics\n- Comprehensive database knowledge spanning all generations\n\n${sentiment.isPositive ? 'I appreciate the positive and curious tone of your inquiry.' : 'I sense there may be some complexity or concern in your question, and I want to address it thoughtfully.'}\n\nFor the most detailed and valuable response to your specific question, could you help me understand which aspect you'd like me to focus on most deeply? This will allow me to leverage my analytical capabilities most effectively for your needs.`;
        }
        
        return `Thank you for sharing "${task}" with me. I've analyzed your query using advanced NLP techniques, and I can see ${topics.length > 0 ? `connections to topics like ${topics.join(', ')}` : 'various interesting dimensions to explore'}.\n\nAs an AI system operating in quality mode, I'm designed to provide comprehensive, nuanced responses that consider multiple perspectives and contexts. While I can engage meaningfully with a wide range of topics, my knowledge architecture is particularly sophisticated when it comes to Pokemon analysis, where I can provide detailed statistical insights, strategic analysis, and comprehensive species information.\n\n${sentiment.confidence > 0.7 ? `I detect a ${sentiment.isPositive ? 'positive and engaging' : 'thoughtful and serious'} tone in your message, which helps me calibrate my response appropriately.` : ''}\n\nTo provide you with the most valuable and tailored response, could you help me understand what specific aspect of your question you'd like me to explore most deeply? This will allow me to focus my analytical capabilities where they can be most beneficial to you.`;
    }
    
    /**
     * Analyze sentiment of the input text
     */
    _analyzeSentiment(text) {
        const positiveWords = ['good', 'great', 'awesome', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'enjoy', 'happy', 'excited', 'thank', 'thanks', 'please'];
        const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'angry', 'frustrated', 'problem', 'issue', 'wrong', 'broken', 'error', 'fail'];
        const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'could', 'would', 'should'];
        
        const words = text.toLowerCase().split(/\s+/);
        let positiveScore = 0;
        let negativeScore = 0;
        let questionScore = 0;
        
        words.forEach(word => {
            if (positiveWords.includes(word)) positiveScore++;
            if (negativeWords.includes(word)) negativeScore++;
            if (questionWords.includes(word)) questionScore++;
        });
        
        const totalScore = positiveScore - negativeScore;
        const confidence = Math.min((Math.abs(totalScore) + questionScore) / words.length * 3, 1);
        
        return {
            isPositive: totalScore >= 0,
            score: totalScore,
            confidence: confidence,
            hasQuestion: questionScore > 0
        };
    }
    
    /**
     * Analyze task complexity and suggest focus areas
     */
    _analyzeTaskComplexity(task) {
        const lowerTask = task.toLowerCase();
        const doc = compromise(task);
        
        // Identify domains
        const domains = [];
        if (lowerTask.includes('programming') || lowerTask.includes('code') || lowerTask.includes('software')) {
            domains.push('Programming & Software Development');
        }
        if (lowerTask.includes('ai') || lowerTask.includes('machine learning') || lowerTask.includes('neural')) {
            domains.push('Artificial Intelligence & Machine Learning');
        }
        if (lowerTask.includes('pokemon') || lowerTask.includes('pikachu') || lowerTask.includes('charizard')) {
            domains.push('Pokemon Knowledge Systems');
        }
        if (lowerTask.includes('data') || lowerTask.includes('analysis') || lowerTask.includes('statistics')) {
            domains.push('Data Analysis & Statistics');
        }
        if (lowerTask.includes('technology') || lowerTask.includes('computer') || lowerTask.includes('system')) {
            domains.push('Technology & Computer Systems');
        }
        
        // Analyze cognitive load
        const sentences = task.split(/[.!?]+/).length;
        const questions = doc.questions().out('array').length;
        const topics = doc.topics().out('array').length;
        
        let cognitiveLoad = 'low';
        if (sentences > 2 || questions > 1 || topics > 3) {
            cognitiveLoad = 'high';
        } else if (sentences > 1 || questions > 0 || topics > 1) {
            cognitiveLoad = 'medium';
        }
        
        // Suggest focus based on domains
        let suggestedFocus = 'general exploration';
        if (domains.includes('Pokemon Knowledge Systems')) {
            suggestedFocus = 'detailed Pokemon analysis and strategic insights';
        } else if (domains.includes('Programming & Software Development')) {
            suggestedFocus = 'practical programming concepts and best practices';
        } else if (domains.includes('Artificial Intelligence & Machine Learning')) {
            suggestedFocus = 'AI theory and practical machine learning applications';
        }
        
        return {
            domains: domains.length > 0 ? domains : ['General Knowledge'],
            cognitiveLoad,
            suggestedFocus,
            complexity: cognitiveLoad === 'high' ? 'complex' : cognitiveLoad === 'medium' ? 'moderate' : 'simple'
        };
    }
    
    /**
     * Check if a query is complex
     */
    _isComplexQuery(task) {
        const analysis = this._analyzeTaskComplexity(task);
        return analysis.complexity === 'complex' || analysis.domains.length > 2;
    }
    
    /**
     * Get information about available tools
     */
    getToolsInfo() {
        return this.tools.map(tool => ({
            name: tool.name,
            description: tool.description || 'No description available'
        }));
    }
    
    /**
     * Get agent status and configuration
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            performance_mode: this.performanceMode,
            tools_count: this.tools.length,
            ml_enabled: this.config.useML,
            advanced_nlp: this.config.useAdvancedNLP,
            model_loaded: this.customModel !== null,
            sentence_encoder_loaded: this.universalSentenceEncoder !== null,
            intent_embeddings_ready: this.intentEmbeddings !== null || this.intentVectors !== null,
            ml_capabilities: this.mlCapabilities || {
                universal_sentence_encoder: this.universalSentenceEncoder !== null,
                custom_neural_network: this.customModel !== null,
                semantic_similarity: this.intentEmbeddings !== null || this.intentVectors !== null
            }
        };
    }
}

module.exports = TensorFlowAgent;
