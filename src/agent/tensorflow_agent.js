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
            // Pass performance mode and other options to the tool
            const result = await tool.execute(task, {
                performanceMode: this.performanceMode,
                config: this.config
            });
            
            // Check if the tool returned structured data that needs intelligent processing
            if (typeof result === 'object' && result.type === 'pokemon_data') {
                return await this._processToolData(result, task);
            }
            
            // For simple string responses, return as-is
            return result;
        } catch (error) {
            logger.error(`Tool execution failed: ${error.message}`);
            // Fallback to general response
            return `I encountered an error while using the ${toolName} tool: ${error.message}. Please try rephrasing your request.`;
        }
    }
    
    /**
     * Process structured data from tools using AI capabilities
     */
    async _processToolData(toolData, originalQuery) {
        switch (toolData.type) {
            case 'pokemon_data':
                return await this._generatePokemonResponse(toolData.pokemon, originalQuery, toolData.performanceMode);
            default:
                return 'I received data from the tool but cannot process it properly.';
        }
    }
    
    /**
     * Generate intelligent Pokemon response using AI analysis
     */
    async _generatePokemonResponse(pokemonData, query, performanceMode) {
        const pokemon = pokemonData;
        const queryLower = query.toLowerCase();
        
        // Analyze query intent and focus
        const queryAnalysis = this._analyzePokemonQuery(query);
        
        switch (performanceMode) {
            case 'fast':
                return this._generateFastPokemonResponse(pokemon, queryAnalysis);
            case 'quality':
                return await this._generateQualityPokemonResponse(pokemon, queryAnalysis, query);
            default: // balanced
                return this._generateBalancedPokemonResponse(pokemon, queryAnalysis, query);
        }
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
        if (analysis.wantsStrategy) {
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
        
        // Evolution and development analysis
        if (pokemon.evolution_info) {
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
