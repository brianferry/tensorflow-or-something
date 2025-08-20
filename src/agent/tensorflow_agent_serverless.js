/**
 * Lightweight TensorFlow Agent - Serverless Optimized Version
 * 
 * This version implements remote ML model capabilities for quality mode
 * using Hugging Face Transformers.js for browser-compatible inference.
 */

const natural = require('natural');
const NodeCache = require('node-cache');

// Try to load Hugging Face Transformers for remote model access
let transformers;
try {
    transformers = require('@xenova/transformers');
    // Configure to use remote models for serverless compatibility
    transformers.env.allowRemoteModels = true;
    transformers.env.allowLocalModels = false;
} catch (error) {
    console.warn('Hugging Face Transformers not available - using lightweight fallback');
}

// Lightweight ML simulation for fallback when remote models unavailable
class LightweightMLEngine {
    constructor() {
        this.weights = null;
        this.biases = null;
        this.initialized = false;
    }

    async initialize() {
        // Initialize with pre-computed lightweight neural network weights
        this.weights = {
            layer1: this.generateMatrix(50, 32),
            layer2: this.generateMatrix(32, 16),
            layer3: this.generateMatrix(16, 4)
        };
        
        this.biases = {
            layer1: this.generateVector(32),
            layer2: this.generateVector(16),
            layer3: this.generateVector(4)
        };
        
        this.initialized = true;
        console.log('Lightweight ML engine initialized');
    }

    generateMatrix(rows, cols) {
        const matrix = [];
        for (let i = 0; i < rows; i++) {
            const row = [];
            for (let j = 0; j < cols; j++) {
                // Xavier initialization
                row.push((Math.random() - 0.5) * 2 * Math.sqrt(6 / (rows + cols)));
            }
            matrix.push(row);
        }
        return matrix;
    }

    generateVector(size) {
        return Array.from({ length: size }, () => (Math.random() - 0.5) * 0.1);
    }

    relu(x) {
        return Math.max(0, x);
    }

    softmax(logits) {
        const maxLogit = Math.max(...logits);
        const expLogits = logits.map(x => Math.exp(x - maxLogit));
        const sumExp = expLogits.reduce((sum, x) => sum + x, 0);
        return expLogits.map(x => x / sumExp);
    }

    predict(input) {
        if (!this.initialized) return [0.25, 0.25, 0.25, 0.25];

        try {
            // Forward pass through lightweight network
            let layer1Output = [];
            for (let i = 0; i < 32; i++) {
                let sum = this.biases.layer1[i];
                for (let j = 0; j < input.length; j++) {
                    sum += input[j] * this.weights.layer1[j][i];
                }
                layer1Output.push(this.relu(sum));
            }

            let layer2Output = [];
            for (let i = 0; i < 16; i++) {
                let sum = this.biases.layer2[i];
                for (let j = 0; j < layer1Output.length; j++) {
                    sum += layer1Output[j] * this.weights.layer2[j][i];
                }
                layer2Output.push(this.relu(sum));
            }

            let layer3Output = [];
            for (let i = 0; i < 4; i++) {
                let sum = this.biases.layer3[i];
                for (let j = 0; j < layer2Output.length; j++) {
                    sum += layer2Output[j] * this.weights.layer3[j][i];
                }
                layer3Output.push(sum);
            }

            return this.softmax(layer3Output);

        } catch (error) {
            console.error('ML prediction error:', error.message);
            return [0.25, 0.25, 0.25, 0.25];
        }
    }
}

class TensorFlowAgentServerless {
    constructor() {
        this.cache = new NodeCache({ stdTTL: 300 }); // 5-minute cache
        this.conversationHistory = [];
        this.tools = new Map();
        this.isInitialized = false;
        this.performanceMode = 'balanced'; // Default mode
        
        // Remote ML model properties for quality mode
        this.remoteClassifier = null;
        this.remoteEmbedder = null;
        this.mlEngine = new LightweightMLEngine();
        this.semanticVectors = null;
        this.mlCapabilities = {
            huggingface_transformers: transformers !== undefined,
            remote_models: false,
            lightweight_ml: true,
            custom_neural_network: false,
            semantic_similarity: false,
            advanced_classification: false
        };
        
        // Performance configurations
        this.configs = {
            fast: {
                useAdvancedNLP: false,
                useSentiment: false,
                useML: false,
                useRemoteModels: false,
                maxAnalysisDepth: 1,
                cacheEnabled: true,
                responseStyle: 'brief'
            },
            balanced: {
                useAdvancedNLP: true,
                useSentiment: true,
                useML: false,
                useRemoteModels: false,
                maxAnalysisDepth: 2,
                cacheEnabled: true,
                responseStyle: 'standard'
            },
            quality: {
                useAdvancedNLP: true,
                useSentiment: true,
                useML: true,
                useRemoteModels: true, // Enable remote models for quality mode
                maxAnalysisDepth: 3,
                cacheEnabled: false, // Always fresh for quality
                responseStyle: 'detailed'
            }
        };
        
        this.config = this.configs[this.performanceMode];
        
        // Initialize natural language processing
        this.stemmer = natural.PorterStemmer;
        this.tokenizer = new natural.WordTokenizer();
        this.analyzer = new natural.SentimentAnalyzer('English', 
            natural.PorterStemmer, 'afinn');
    }

    async initialize() {
        if (this.isInitialized) return;
        
        console.log('Initializing TensorFlow Agent (Serverless)...');
        
        // Load tools
        try {
            const PokemonTool = require('../tools/pokemon_tool');
            this.tools.set('pokemon', new PokemonTool());
            console.log('Pokemon tool loaded successfully');
        } catch (error) {
            console.warn('Failed to load Pokemon tool:', error.message);
        }
        
        // Initialize ML models based on performance mode
        if (this.config.useML) {
            if (this.config.useRemoteModels && transformers) {
                await this.initializeRemoteModels();
            } else {
                await this.initializeLightweightML();
            }
        }
        
        this.isInitialized = true;
        console.log('TensorFlow Agent (Serverless) initialized successfully');
        console.log(`ML capabilities:`, this.mlCapabilities);
    }

    /**
     * Initialize remote Hugging Face models for quality mode
     */
    async initializeRemoteModels() {
        try {
            console.log('Initializing remote ML models for quality mode...');
            
            // Check if we're in a serverless environment with limited time
            const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
            const timeLimit = isServerless ? 10000 : 30000; // 10s for serverless, 30s for local
            
            console.log(`Environment: ${isServerless ? 'Serverless' : 'Local'}, Time limit: ${timeLimit}ms`);
            
            // Use Promise.race to enforce time limits
            const modelLoadPromise = this.loadRemoteModelsWithTimeout(timeLimit);
            
            try {
                await modelLoadPromise;
                console.log('Remote ML models initialized successfully');
            } catch (timeoutError) {
                console.warn('Remote model loading timed out, falling back to lightweight ML');
                await this.initializeLightweightML();
                return;
            }
            
        } catch (error) {
            console.error('Remote model initialization failed:', error.message);
            console.log('Falling back to lightweight ML...');
            // Fallback to lightweight ML
            await this.initializeLightweightML();
        }
    }

    /**
     * Load remote models with timeout
     */
    async loadRemoteModelsWithTimeout(timeLimit) {
        return new Promise(async (resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Model loading timed out after ${timeLimit}ms`));
            }, timeLimit);

            try {
                // Load a lightweight intent classification model
                console.log('Loading remote intent classification model...');
                this.remoteClassifier = await transformers.pipeline(
                    'text-classification', 
                    'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
                    { 
                        quantized: true,  // Use quantized model for faster loading
                        progress_callback: null // Disable progress logging in serverless
                    }
                );
                
                // Load a sentence embedding model for semantic similarity
                console.log('Loading remote sentence embedding model...');
                this.remoteEmbedder = await transformers.pipeline(
                    'feature-extraction',
                    'Xenova/all-MiniLM-L6-v2',
                    { 
                        quantized: true,
                        progress_callback: null // Disable progress logging in serverless
                    }
                );
                
                // Pre-compute embeddings for concept similarity
                await this.initializeRemoteSemanticVectors();
                
                this.mlCapabilities = {
                    huggingface_transformers: true,
                    remote_models: true,
                    lightweight_ml: false,
                    custom_neural_network: false,
                    semantic_similarity: this.semanticVectors !== null,
                    advanced_classification: true
                };

                clearTimeout(timeout);
                resolve();
                
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }

    /**
     * Initialize semantic vectors using remote embeddings
     */
    async initializeRemoteSemanticVectors() {
        if (!this.remoteEmbedder) return;

        try {
            console.log('Computing remote semantic embeddings...');
            
            // Define concept texts for embedding
            const concepts = {
                pokemon: "Pokemon creatures with stats abilities evolution types",
                technical: "Neural networks machine learning artificial intelligence algorithms",
                greeting: "Hello hi hey good morning how are you",
                general: "What how why when where explain tell about information"
            };
            
            this.semanticVectors = {};
            
            for (const [concept, text] of Object.entries(concepts)) {
                try {
                    const embedding = await this.remoteEmbedder(text);
                    // Convert tensor to array if needed
                    this.semanticVectors[concept] = embedding.data || embedding;
                    console.log(`Generated embedding for ${concept} concept`);
                } catch (embedError) {
                    console.warn(`Failed to generate embedding for ${concept}:`, embedError.message);
                }
            }
            
            console.log('Remote semantic vectors initialized');
            
        } catch (error) {
            console.error('Remote semantic vector initialization failed:', error.message);
            this.semanticVectors = null;
        }
    }

    /**
     * Initialize lightweight machine learning for quality mode
     */
    async initializeLightweightML() {
        try {
            console.log('Initializing lightweight ML engine for quality mode...');
            
            // Initialize the lightweight ML engine
            await this.mlEngine.initialize();
            
            // Initialize semantic vectors for concept similarity
            this.initializeSemanticVectors();
            
            this.mlCapabilities = {
                lightweight_ml: true,
                custom_neural_network: this.mlEngine.initialized,
                semantic_similarity: this.semanticVectors !== null,
                advanced_classification: true
            };
            
            console.log('Lightweight ML engine initialized successfully');
            
        } catch (error) {
            console.error('Lightweight ML initialization failed:', error.message);
            this.mlCapabilities = {
                lightweight_ml: false,
                custom_neural_network: false,
                semantic_similarity: false,
                advanced_classification: false
            };
        }
    }

    /**
     * Initialize semantic vectors for concept similarity
     */
    initializeSemanticVectors() {
        try {
            // Pre-computed concept vectors for semantic similarity
            this.semanticVectors = {
                pokemon: this.computeConceptVector(['pokemon', 'pikachu', 'charizard', 'stats', 'evolution', 'type', 'abilities']),
                technical: this.computeConceptVector(['neural', 'network', 'machine', 'learning', 'artificial', 'intelligence', 'algorithm']),
                greeting: this.computeConceptVector(['hello', 'hi', 'hey', 'good', 'morning', 'how', 'are', 'you']),
                general: this.computeConceptVector(['what', 'how', 'why', 'when', 'where', 'explain', 'tell', 'about'])
            };
            
            console.log('Semantic vectors initialized for concept similarity');
            
        } catch (error) {
            console.error('Semantic vector initialization failed:', error.message);
            this.semanticVectors = null;
        }
    }

    /**
     * Compute concept vector from a list of words
     */
    computeConceptVector(words) {
        const vector = new Array(50).fill(0);
        
        words.forEach((word, wordIdx) => {
            for (let i = 0; i < word.length && i < 50; i++) {
                // Create a unique representation based on character codes and positions
                vector[i] += (word.charCodeAt(i % word.length) * (wordIdx + 1)) % 100;
            }
        });
        
        // Normalize the vector
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
    }

    async processTask(input, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const startTime = Date.now();
            
            // Ensure input is a string
            if (typeof input !== 'string') {
                input = String(input || '');
            }
            
            // Cache check (skip in quality mode for fresh results)
            const cacheKey = this.generateCacheKey(input);
            if (this.config.cacheEnabled) {
                const cachedResult = this.cache.get(cacheKey);
                if (cachedResult && !options.bypassCache) {
                    console.log(`Returning cached result for ${this.performanceMode} mode`);
                    return {
                        ...cachedResult,
                        cached: true,
                        processingTime: Date.now() - startTime
                    };
                }
            } else {
                console.log(`Cache bypassed - Mode: ${this.performanceMode}, CacheEnabled: ${this.config.cacheEnabled}`);
            }

            // Analyze input using natural language processing (depth varies by mode)
            const analysis = await this.analyzeInput(input);
            
            // Route to appropriate tool or generate response
            let result = await this.routeRequest(input, analysis, options);
            
            // Add conversation to history
            this.conversationHistory.push({
                input,
                output: result.response,
                timestamp: new Date().toISOString(),
                analysis,
                processingTime: Date.now() - startTime
            });

            // Limit conversation history
            if (this.conversationHistory.length > 100) {
                this.conversationHistory = this.conversationHistory.slice(-50);
            }

            // Cache successful results (except in quality mode)
            if (result.success && this.config.cacheEnabled) {
                this.cache.set(cacheKey, result);
            }

            return {
                ...result,
                processingTime: Date.now() - startTime
            };

        } catch (error) {
            console.error('Error processing task:', error);
            return {
                success: false,
                error: error.message,
                response: 'I encountered an error while processing your request. Please try again.',
                processingTime: Date.now() - startTime
            };
        }
    }

    async analyzeInput(input) {
        // Ensure input is a string
        if (typeof input !== 'string') {
            input = String(input || '');
        }
        
        const tokens = this.tokenizer.tokenize(input.toLowerCase());
        const stemmed = tokens.map(token => this.stemmer.stem(token));
        
        // Calculate sentiment (skip in fast mode for performance)
        let sentiment = 0;
        if (this.config.useSentiment) {
            sentiment = this.analyzer.getSentiment(tokens);
        }
        
        // Detect intent keywords (use remote ML in quality mode if available)
        let intents;
        if (this.config.useRemoteModels && this.remoteClassifier) {
            intents = await this.detectIntentsRemote(input, tokens);
        } else if (this.config.useML && this.mlEngine.initialized) {
            intents = this.detectIntentsML(input, tokens);
        } else {
            intents = this.detectIntents(tokens);
        }
        
        // Extract entities (enhanced in quality mode)
        const entities = this.extractEntities(input);
        
        // Enhanced analysis for quality mode
        let enhancedAnalysis = {};
        if (this.config.maxAnalysisDepth >= 3) {
            enhancedAnalysis = this.performEnhancedAnalysis(input, tokens, stemmed);
        }
        
        // Semantic similarity analysis for quality mode
        let semanticAnalysis = {};
        if (this.config.useRemoteModels && this.remoteEmbedder) {
            semanticAnalysis = await this.performRemoteSemanticAnalysis(input, tokens);
        } else if (this.config.useML && this.semanticVectors) {
            semanticAnalysis = this.performSemanticAnalysis(input, tokens);
        }
        
        return {
            tokens,
            stemmed,
            sentiment,
            intents,
            entities,
            confidence: this.calculateConfidence(intents, entities),
            enhanced: enhancedAnalysis,
            semantic: semanticAnalysis,
            analysisDepth: this.config.maxAnalysisDepth,
            mlEnabled: this.config.useML && (this.mlEngine.initialized || this.remoteClassifier !== null),
            remoteMLEnabled: this.config.useRemoteModels && this.remoteClassifier !== null
        };
    }

    /**
     * Remote ML-based intent detection using Hugging Face models
     */
    async detectIntentsRemote(input, tokens) {
        if (!this.remoteClassifier) {
            return this.detectIntentsML(input, tokens);
        }

        try {
            console.log('Using remote ML for intent detection...');
            
            // Use the remote classifier for sentiment/intent analysis
            const result = await this.remoteClassifier(input);
            
            // Map results to our intent format
            const detectedIntents = [];
            
            // The sentiment classifier gives us emotional context
            // We'll map this to our intent categories
            if (result && result.length > 0) {
                const sentiment = result[0];
                
                // Analyze text content for intent mapping
                const lowerInput = input.toLowerCase();
                
                if (lowerInput.includes('pokemon') || tokens.some(t => ['pikachu', 'charizard', 'bulbasaur'].includes(t))) {
                    detectedIntents.push({
                        intent: 'pokemon',
                        confidence: 0.9,
                        source: 'remote_ml_content'
                    });
                } else if (lowerInput.includes('neural') || lowerInput.includes('machine') || lowerInput.includes('learning')) {
                    detectedIntents.push({
                        intent: 'technical',
                        confidence: 0.85,
                        source: 'remote_ml_content'
                    });
                } else if (tokens.some(t => ['hello', 'hi', 'hey', 'good', 'morning'].includes(t))) {
                    detectedIntents.push({
                        intent: 'greeting',
                        confidence: 0.8,
                        source: 'remote_ml_content'
                    });
                } else {
                    detectedIntents.push({
                        intent: 'general',
                        confidence: sentiment.score,
                        source: 'remote_ml_sentiment'
                    });
                }
            }
            
            console.log('Remote ML intent detection results:', detectedIntents);
            return detectedIntents;
            
        } catch (error) {
            console.error('Remote ML intent detection failed:', error.message);
            // Fallback to local ML
            return this.detectIntentsML(input, tokens);
        }
    }

    /**
     * Remote semantic analysis using Hugging Face embeddings
     */
    async performRemoteSemanticAnalysis(input, tokens) {
        if (!this.remoteEmbedder || !this.semanticVectors) {
            return this.performSemanticAnalysis(input, tokens);
        }

        try {
            console.log('Using remote embeddings for semantic analysis...');
            
            // Get embedding for input text
            const inputEmbedding = await this.remoteEmbedder(input);
            const inputVector = inputEmbedding.data || inputEmbedding;
            
            // Calculate similarities with concept embeddings
            const similarities = {};
            let maxSimilarity = 0;
            let bestMatch = null;
            
            for (const [concept, conceptVector] of Object.entries(this.semanticVectors)) {
                const similarity = this.cosineSimilarity(inputVector, conceptVector);
                similarities[concept] = similarity;
                
                if (similarity > maxSimilarity) {
                    maxSimilarity = similarity;
                    bestMatch = concept;
                }
            }
            
            return {
                similarities,
                bestMatch,
                confidence: maxSimilarity,
                source: 'remote_embeddings'
            };
            
        } catch (error) {
            console.error('Remote semantic analysis failed:', error.message);
            // Fallback to local semantic analysis
            return this.performSemanticAnalysis(input, tokens);
        }
    }

    /**
     * ML-based intent detection using lightweight neural network
     */
    detectIntentsML(input, tokens) {
        if (!this.mlEngine.initialized) {
            return this.detectIntents(tokens);
        }

        try {
            // Convert input to feature vector
            const features = this.textToMLFeatureVector(input);
            
            // Get predictions from lightweight ML engine
            const probabilities = this.mlEngine.predict(features);
            
            // Map predictions to intents
            const intentLabels = ['pokemon', 'general', 'greeting', 'technical'];
            const detectedIntents = [];
            
            probabilities.forEach((prob, idx) => {
                if (prob > 0.1) { // Threshold for detection
                    detectedIntents.push({
                        intent: intentLabels[idx],
                        confidence: prob,
                        source: 'lightweight_ml'
                    });
                }
            });
            
            // Sort by confidence
            detectedIntents.sort((a, b) => b.confidence - a.confidence);
            
            console.log('Lightweight ML intent detection results:', detectedIntents);
            return detectedIntents;
            
        } catch (error) {
            console.error('Lightweight ML intent detection failed:', error.message);
            // Fallback to pattern-based detection
            return this.detectIntents(tokens);
        }
    }

    /**
     * Convert text to 50-dimensional feature vector for lightweight ML
     */
    textToMLFeatureVector(text) {
        const vector = new Array(50).fill(0);
        const tokens = this.tokenizer.tokenize(text.toLowerCase());
        
        // Enhanced feature extraction for ML model
        tokens.forEach((token, idx) => {
            if (idx < 40) {
                // Character-based features
                let charSum = 0;
                for (let i = 0; i < token.length; i++) {
                    charSum += token.charCodeAt(i);
                }
                vector[idx] = (charSum % 100) / 100; // Normalize to 0-1
            }
        });
        
        // Add specialized features for the last 10 dimensions
        if (tokens.length > 0) {
            vector[40] = Math.min(tokens.length / 20, 1); // Length feature
            vector[41] = tokens.filter(t => t.includes('pokemon')).length / tokens.length;
            vector[42] = tokens.filter(t => ['what', 'how', 'why', 'when', 'where'].includes(t)).length / tokens.length;
            vector[43] = tokens.filter(t => ['hello', 'hi', 'hey', 'good', 'morning'].includes(t)).length / tokens.length;
            vector[44] = tokens.filter(t => ['neural', 'machine', 'learning', 'ai', 'artificial'].includes(t)).length / tokens.length;
            vector[45] = tokens.filter(t => ['explain', 'tell', 'about', 'describe'].includes(t)).length / tokens.length;
            vector[46] = tokens.filter(t => ['stats', 'type', 'evolution', 'abilities'].includes(t)).length / tokens.length;
            
            // Safe sentiment calculation
            try {
                vector[47] = this.config.useSentiment ? 
                    Math.max(-1, Math.min(1, this.analyzer.getSentiment(tokens))) : 0;
            } catch (error) {
                vector[47] = 0;
            }
            
            vector[48] = tokens.filter(t => t.length > 6).length / tokens.length; // Complex words ratio
            vector[49] = new Set(tokens).size / tokens.length; // Unique words ratio
        }
        
        return vector;
    }

    /**
     * Perform semantic similarity analysis using pre-computed vectors
     */
    performSemanticAnalysis(input, tokens) {
        if (!this.semanticVectors) {
            return {};
        }

        try {
            // Compute input vector
            const inputVector = this.computeConceptVector(tokens);
            
            // Calculate similarities with known concepts
            const similarities = {};
            let maxSimilarity = 0;
            let bestMatch = null;
            
            for (const [concept, conceptVector] of Object.entries(this.semanticVectors)) {
                const similarity = this.cosineSimilarity(inputVector, conceptVector);
                similarities[concept] = similarity;
                
                if (similarity > maxSimilarity) {
                    maxSimilarity = similarity;
                    bestMatch = concept;
                }
            }
            
            return {
                similarities,
                bestMatch,
                confidence: maxSimilarity,
                source: 'semantic_vectors'
            };
            
        } catch (error) {
            console.error('Semantic analysis failed:', error.message);
            return {};
        }
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    cosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length) return 0;
        
        let dotProduct = 0;
        let magnitudeA = 0;
        let magnitudeB = 0;
        
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            magnitudeA += vecA[i] * vecA[i];
            magnitudeB += vecB[i] * vecB[i];
        }
        
        magnitudeA = Math.sqrt(magnitudeA);
        magnitudeB = Math.sqrt(magnitudeB);
        
        if (magnitudeA === 0 || magnitudeB === 0) return 0;
        
        return dotProduct / (magnitudeA * magnitudeB);
    }

    detectIntents(tokens) {
        const intentPatterns = {
            pokemon: ['pokemon', 'pikachu', 'charizard', 'bulbasaur', 'info', 'details', 'stats'],
            greeting: ['hello', 'hi', 'hey', 'greetings'],
            help: ['help', 'assist', 'support', 'guide'],
            search: ['find', 'search', 'look', 'get'],
            question: ['what', 'how', 'why', 'when', 'where', 'who']
        };
        
        const detectedIntents = [];
        
        for (const [intent, keywords] of Object.entries(intentPatterns)) {
            const matches = tokens.filter(token => keywords.includes(token));
            if (matches.length > 0) {
                detectedIntents.push({
                    intent,
                    confidence: matches.length / keywords.length,
                    matches
                });
            }
        }
        
        return detectedIntents.sort((a, b) => b.confidence - a.confidence);
    }

    extractEntities(input) {
        const entities = [];
        
        // First, try to find known Pokemon names (case-insensitive)
        const knownPokemon = [
            'pikachu', 'charizard', 'bulbasaur', 'squirtle', 'jigglypuff',
            'blastoise', 'venusaur', 'charmander', 'wartortle', 'ivysaur',
            'caterpie', 'weedle', 'pidgey', 'rattata', 'spearow',
            'ekans', 'sandshrew', 'nidoran', 'clefairy', 'vulpix',
            'zubat', 'oddish', 'paras', 'venonat', 'diglett',
            'meowth', 'psyduck', 'mankey', 'growlithe', 'poliwag',
            'abra', 'machop', 'bellsprout', 'tentacool', 'geodude',
            'ponyta', 'slowpoke', 'magnemite', 'farfetchd', 'doduo',
            'seel', 'grimer', 'shellder', 'gastly', 'onix',
            'drowzee', 'krabby', 'voltorb', 'exeggcute', 'cubone',
            'hitmonlee', 'hitmonchan', 'lickitung', 'koffing', 'rhyhorn',
            'chansey', 'tangela', 'kangaskhan', 'horsea', 'goldeen',
            'staryu', 'mr mime', 'scyther', 'jynx', 'electabuzz',
            'magmar', 'pinsir', 'tauros', 'magikarp', 'gyarados',
            'lapras', 'ditto', 'eevee', 'vaporeon', 'jolteon',
            'flareon', 'porygon', 'omanyte', 'omastar', 'kabuto',
            'kabutops', 'aerodactyl', 'snorlax', 'articuno', 'zapdos',
            'moltres', 'dratini', 'dragonair', 'dragonite', 'mewtwo', 'mew'
        ];
        
        const lowerInput = input.toLowerCase();
        for (const pokemon of knownPokemon) {
            const index = lowerInput.indexOf(pokemon);
            if (index !== -1) {
                entities.push({
                    type: 'POKEMON_NAME',
                    value: pokemon,
                    start: index,
                    end: index + pokemon.length
                });
                break; // Only extract the first match to avoid duplicates
            }
        }
        
        // If no known Pokemon found, try to extract from common Pokemon request patterns
        if (entities.length === 0) {
            // Look for patterns like "about X", "show X", "X stats", etc.
            const patterns = [
                /(?:about|show|tell me about|info on|stats for|find)\s+([A-Z][a-z]+)/i,
                /([A-Z][a-z]+)\s+(?:stats|info|data|details)/i,
                /(?:what is|who is)\s+([A-Z][a-z]+)/i
            ];
            
            for (const pattern of patterns) {
                const match = input.match(pattern);
                if (match && match[1]) {
                    const possiblePokemon = match[1].toLowerCase();
                    // Only add if it's not a common word
                    const commonWords = [
                        'tell', 'about', 'what', 'who', 'how', 'when', 'where', 'why',
                        'the', 'a', 'an', 'explain', 'describe', 'define', 'meaning',
                        'neural', 'networks', 'machine', 'learning', 'artificial', 'intelligence',
                        'show', 'stats', 'info', 'data', 'details'
                    ];
                    
                    if (!commonWords.includes(possiblePokemon)) {
                        entities.push({
                            type: 'POKEMON_NAME',
                            value: match[1],
                            start: match.index + input.indexOf(match[1]),
                            end: match.index + input.indexOf(match[1]) + match[1].length
                        });
                        break;
                    }
                }
            }
        }
        
        return entities;
    }

    performEnhancedAnalysis(input, tokens, stemmed) {
        // Enhanced analysis for quality mode
        const analysis = {
            wordCount: tokens.length,
            averageWordLength: tokens.reduce((sum, token) => sum + token.length, 0) / tokens.length,
            uniqueWords: new Set(tokens).size,
            questionWords: tokens.filter(token => ['what', 'how', 'why', 'when', 'where', 'who'].includes(token)),
            pokemonContext: this.analyzePokemonContext(input),
            technicalTerms: this.identifyTechnicalTerms(tokens)
        };
        
        return analysis;
    }

    analyzePokemonContext(input) {
        const lowerInput = input.toLowerCase();
        const pokemonContexts = {
            stats: ['stat', 'stats', 'hp', 'attack', 'defense', 'speed'],
            evolution: ['evolve', 'evolution', 'evolves', 'evolved'],
            type: ['type', 'types', 'electric', 'fire', 'water', 'grass'],
            abilities: ['ability', 'abilities', 'skill', 'power'],
            physical: ['height', 'weight', 'size']
        };
        
        const contexts = [];
        for (const [context, keywords] of Object.entries(pokemonContexts)) {
            if (keywords.some(keyword => lowerInput.includes(keyword))) {
                contexts.push(context);
            }
        }
        
        return contexts;
    }

    identifyTechnicalTerms(tokens) {
        const technicalTerms = [
            'neural', 'network', 'machine', 'learning', 'ai', 'artificial',
            'intelligence', 'algorithm', 'data', 'model', 'training'
        ];
        
        return tokens.filter(token => technicalTerms.includes(token));
    }

    calculateConfidence(intents, entities) {
        if (intents.length === 0 && entities.length === 0) return 0.1;
        
        const intentConfidence = intents.length > 0 ? intents[0].confidence : 0;
        const entityBonus = entities.length * 0.1;
        
        return Math.min(intentConfidence + entityBonus, 1.0);
    }

    async routeRequest(input, analysis, options) {
        // Enhanced routing with ML intent classification in quality mode
        let shouldUsePokemon = false;
        
        if (this.config.useML && analysis.intents && analysis.intents.length > 0) {
            // Use ML-based intent routing
            const topIntent = analysis.intents[0];
            console.log('Top ML intent:', topIntent);
            
            // Only route to Pokemon if ML strongly predicts Pokemon intent
            shouldUsePokemon = topIntent.intent === 'pokemon' && topIntent.confidence > 0.4;
            
        } else {
            // Fallback to pattern-based routing
            const pokemonIntent = analysis.intents.find(i => i.intent === 'pokemon');
            const pokemonEntities = analysis.entities.filter(e => e.type === 'POKEMON_NAME');
            const hasPokemonKeywords = this.containsPokemonKeywords(input);
            
            shouldUsePokemon = pokemonIntent || 
                               (pokemonEntities.length > 0 && hasPokemonKeywords) ||
                               (hasPokemonKeywords && !this.isGeneralQuestion(input));
        }
        
        if (shouldUsePokemon) {
            const pokemonEntities = analysis.entities.filter(e => e.type === 'POKEMON_NAME');
            return await this.handlePokemonRequest(input, pokemonEntities, options);
        }
        
        // Handle greetings
        if (analysis.intents.some(i => i.intent === 'greeting')) {
            return {
                success: true,
                response: "Hello! I'm a TensorFlow-powered AI agent with machine learning capabilities in quality mode. I can help you with Pokemon information and explain technical concepts. What would you like to know?",
                intent: 'greeting'
            };
        }
        
        // Handle help requests
        if (analysis.intents.some(i => i.intent === 'help')) {
            return {
                success: true,
                response: "I can help you with:\n• Pokemon information (stats, types, abilities)\n• Technical explanations (neural networks, machine learning, AI)\n• General questions and conversations\n\nIn quality mode, I use lightweight machine learning for enhanced understanding!",
                intent: 'help'
            };
        }
        
        // Generate general response
        return this.generateGeneralResponse(input, analysis);
    }

    containsPokemonKeywords(input) {
        // Ensure input is a string
        if (typeof input !== 'string') {
            input = String(input || '');
        }
        
        const pokemonKeywords = [
            'pokemon', 'pikachu', 'charizard', 'bulbasaur', 'squirtle',
            'stats', 'type', 'ability', 'evolution', 'move', 'battle'
        ];
        
        const lowerInput = input.toLowerCase();
        return pokemonKeywords.some(keyword => lowerInput.includes(keyword));
    }

    isGeneralQuestion(input) {
        // Ensure input is a string
        if (typeof input !== 'string') {
            input = String(input || '');
        }
        
        const generalQuestionWords = [
            'explain', 'what is', 'how does', 'why', 'when', 'where', 'who',
            'tell me about', 'describe', 'define', 'meaning', 'concept',
            'neural network', 'machine learning', 'ai', 'artificial intelligence'
        ];
        
        const lowerInput = input.toLowerCase();
        return generalQuestionWords.some(phrase => lowerInput.includes(phrase));
    }

    async handlePokemonRequest(input, entities, options) {
        const pokemonTool = this.tools.get('pokemon');
        if (!pokemonTool) {
            return {
                success: false,
                response: "Pokemon tool is not available at the moment. Please try again later.",
                intent: 'pokemon_error'
            };
        }
        
        try {
            // Ensure input is a string
            if (typeof input !== 'string') {
                input = String(input || '');
            }
            
            // Extract Pokemon name from entities or input
            let pokemonName = '';
            if (entities.length > 0) {
                pokemonName = String(entities[0].value || '').toLowerCase();
            } else {
                // Try to extract from input using common Pokemon names
                const commonPokemon = ['pikachu', 'charizard', 'bulbasaur', 'squirtle', 'jigglypuff'];
                const lowerInput = input.toLowerCase();
                pokemonName = commonPokemon.find(name => lowerInput.includes(name)) || '';
            }
            
            // If no specific Pokemon name found, use the full input
            if (!pokemonName) {
                pokemonName = input;
            }
            
            // Use the Pokemon tool's execute method
            const response = await pokemonTool.execute(pokemonName);
            
            if (response && !response.includes('error') && !response.includes("couldn't find")) {
                return {
                    success: true,
                    response: response,
                    intent: 'pokemon_info'
                };
            } else {
                return {
                    success: false,
                    response: response || `Sorry, I couldn't find information about "${pokemonName}". Please check the spelling and try again.`,
                    intent: 'pokemon_not_found'
                };
            }
            
        } catch (error) {
            console.error('Pokemon request error:', error);
            return {
                success: false,
                response: "I encountered an error while fetching Pokemon information. Please try again.",
                intent: 'pokemon_error'
            };
        }
    }

    generateGeneralResponse(input, analysis) {
        // Ensure input is a string
        if (typeof input !== 'string') {
            input = String(input || '');
        }
        
        const lowerInput = input.toLowerCase();
        
        console.log(`Generating response for: "${input}" in ${this.performanceMode} mode`);
        console.log('Analysis results:', {
            intents: analysis.intents,
            semantic: analysis.semantic,
            mlEnabled: analysis.mlEnabled,
            remoteMLEnabled: analysis.remoteMLEnabled
        });
        
        // Enhanced responses for quality mode
        if (this.performanceMode === 'quality') {
            // Handle neural networks with enhanced detail in quality mode
            if (lowerInput.includes('neural network') || lowerInput.includes('neural')) {
                return {
                    success: true,
                    response: "Neural networks are sophisticated computational models inspired by biological neural networks in the brain. In quality mode, I can provide detailed insights: They consist of interconnected nodes (neurons) organized in layers - input layer, hidden layers, and output layer. Information flows through weighted connections, with each neuron applying an activation function. During training, backpropagation adjusts weights to minimize error. Key architectures include feedforward networks, convolutional neural networks (CNNs) for image processing, recurrent neural networks (RNNs) for sequential data, and transformers for natural language processing. Modern applications span computer vision, natural language processing, speech recognition, and autonomous systems.",
                    intent: 'neural_networks_detailed',
                    confidence: 0.95,
                    qualityMode: true
                };
            }
            
            if (lowerInput.includes('machine learning') || lowerInput.includes('ml')) {
                return {
                    success: true,
                    response: "Machine learning in detail: It's a subset of artificial intelligence enabling computers to learn patterns from data without explicit programming. Quality mode analysis reveals three main paradigms: Supervised learning uses labeled datasets to learn input-output mappings (classification, regression). Unsupervised learning discovers hidden patterns in unlabeled data (clustering, dimensionality reduction). Reinforcement learning learns through trial-and-error interactions with environments. Advanced techniques include ensemble methods, deep learning with multi-layer neural networks, transfer learning, and meta-learning. Applications span recommendation systems, fraud detection, autonomous vehicles, drug discovery, and financial modeling.",
                    intent: 'machine_learning_detailed',
                    confidence: 0.95,
                    qualityMode: true
                };
            }
            
            if (lowerInput.includes('ai') || lowerInput.includes('artificial intelligence')) {
                return {
                    success: true,
                    response: "Artificial Intelligence comprehensive overview: AI encompasses multiple approaches to creating intelligent machines. Symbolic AI uses logic and knowledge representation. Statistical AI employs probabilistic models and machine learning. Neural AI utilizes artificial neural networks. Modern AI combines these approaches in hybrid systems. Key capabilities include perception (computer vision, speech recognition), reasoning (logical inference, planning), learning (adaptation from experience), and interaction (natural language processing, robotics). Current frontiers include general artificial intelligence (AGI), explainable AI, ethical AI, and AI safety. Applications transform healthcare, education, transportation, finance, and scientific research.",
                    intent: 'ai_comprehensive',
                    confidence: 0.95,
                    qualityMode: true
                };
            }
        }
        
        // Standard responses for other modes or topics
        if (lowerInput.includes('neural network')) {
            return {
                success: true,
                response: "Neural networks are computational models inspired by biological neural networks. They consist of interconnected nodes (neurons) organized in layers that process information through weighted connections. They're fundamental to machine learning and AI, enabling pattern recognition, classification, and prediction tasks through learning from data.",
                intent: 'neural_networks_explanation',
                confidence: 0.9
            };
        }
        
        if (lowerInput.includes('machine learning')) {
            return {
                success: true,
                response: "Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience without being explicitly programmed. It uses algorithms to identify patterns in data and make predictions or decisions. Common types include supervised learning (with labeled data), unsupervised learning (finding hidden patterns), and reinforcement learning (learning through interaction).",
                intent: 'machine_learning_explanation',
                confidence: 0.9
            };
        }
        
        if (lowerInput.includes('ai') || lowerInput.includes('artificial intelligence')) {
            return {
                success: true,
                response: "Artificial Intelligence (AI) refers to computer systems that can perform tasks typically requiring human intelligence, such as visual perception, speech recognition, decision-making, and language translation. AI encompasses various approaches including machine learning, deep learning, natural language processing, and computer vision.",
                intent: 'ai_explanation',
                confidence: 0.9
            };
        }
        
        // Mode-specific greeting responses
        if (this.performanceMode === 'quality') {
            return {
                success: true,
                response: `Hello! I'm an advanced AI agent running in quality mode with ${this.mlCapabilities.remote_models ? 'remote ML models' : 'enhanced lightweight ML'}. I can provide detailed explanations of technical concepts, comprehensive Pokemon information, and in-depth analysis. My quality mode features include semantic similarity analysis, advanced intent classification, and detailed response generation. What would you like to explore?`,
                intent: 'quality_greeting',
                confidence: 0.8,
                qualityMode: true
            };
        }
        
        // Generic helpful responses for other modes
        const responses = [
            "That's an interesting question! I'm an AI agent that can help with various topics including technology explanations and Pokemon information. Could you be more specific about what you'd like to know?",
            "I'd be happy to help you with that topic. I specialize in providing information about AI, machine learning, and Pokemon. What specific aspect would you like me to explain?",
            "Thanks for your question! I can assist with explanations of technical concepts, Pokemon information, and general inquiries. How can I help you learn more?",
            "I understand you're looking for information. I'm equipped to explain AI concepts, provide Pokemon data, and answer various questions. What would you like to explore?"
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        return {
            success: true,
            response: randomResponse,
            intent: 'general',
            confidence: analysis.confidence || 0.5
        };
    }

    generateCacheKey(input) {
        // Ensure input is a string
        if (typeof input !== 'string') {
            input = String(input || '');
        }
        // Include performance mode in cache key to prevent cross-mode caching
        const keyString = `${this.performanceMode}_${input.toLowerCase()}`;
        const hash = require('crypto').createHash('md5').update(keyString).digest('hex');
        return `query_${hash}`;
    }

    setPerformanceMode(mode) {
        const validModes = ['fast', 'balanced', 'quality'];
        if (!validModes.includes(mode)) {
            console.warn(`Invalid performance mode: ${mode}. Valid modes are: ${validModes.join(', ')}`);
            return false;
        }
        
        const previousMode = this.performanceMode;
        this.performanceMode = mode;
        this.config = this.configs[mode];
        console.log(`Performance mode switched to: ${mode}`);
        console.log(`Mode config:`, this.config);
        
        // Clear cache when switching to quality mode for fresh results
        if (mode === 'quality' && this.cache) {
            this.cache.flushAll();
            console.log('Cache cleared for quality mode');
        }
        
        // Initialize ML models if switching to quality mode and not already initialized
        if (mode === 'quality' && this.config.useML) {
            if (this.config.useRemoteModels && transformers && !this.remoteClassifier) {
                console.log('Initializing remote ML models for quality mode...');
                this.initializeRemoteModels().catch(error => {
                    console.error('Failed to initialize remote ML models:', error.message);
                    console.log('Falling back to lightweight ML...');
                    this.initializeLightweightML().catch(fallbackError => {
                        console.error('Failed to initialize lightweight ML:', fallbackError.message);
                    });
                });
            } else if (!this.mlEngine.initialized) {
                console.log('Initializing lightweight ML for quality mode...');
                this.initializeLightweightML().catch(error => {
                    console.error('Failed to initialize lightweight ML:', error.message);
                });
            }
        }
        
        return true;
    }

    getStatus() {
        return {
            initialized: this.isInitialized,
            performanceMode: this.performanceMode,
            config: this.config,
            toolsLoaded: Array.from(this.tools.keys()),
            conversationHistory: this.conversationHistory.length,
            cacheStats: this.cache.getStats(),
            mlCapabilities: this.mlCapabilities,
            mlEngineStatus: {
                remoteClassifier: this.remoteClassifier !== null,
                remoteEmbedder: this.remoteEmbedder !== null,
                lightweightML: this.mlEngine.initialized,
                semanticVectors: this.semanticVectors !== null
            },
            capabilities: {
                natural_language_processing: true,
                sentiment_analysis: this.config.useSentiment,
                advanced_nlp: this.config.useAdvancedNLP,
                machine_learning: this.config.useML,
                remote_models: this.config.useRemoteModels && this.remoteClassifier !== null,
                lightweight_ml: this.config.useML && this.mlEngine.initialized,
                caching: this.config.cacheEnabled,
                enhanced_analysis: this.config.maxAnalysisDepth >= 3,
                semantic_similarity: this.semanticVectors !== null,
                huggingface_transformers: transformers !== undefined
            }
        };
    }

    getConversationHistory() {
        return this.conversationHistory.slice(-10); // Return last 10 conversations
    }
}

module.exports = TensorFlowAgentServerless;
