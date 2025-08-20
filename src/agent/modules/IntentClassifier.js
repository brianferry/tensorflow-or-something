/**
 * IntentClassifier - Intent classification and routing logic
 * 
 * Handles pattern-based and ML-based intent classification
 * for routing tasks to appropriate handlers.
 */

const natural = require('natural');
const logger = require('../../utils/logger');

class IntentClassifier {
    constructor(tools = [], performanceMode = 'balanced') {
        this.tools = tools;
        this.performanceMode = performanceMode;
        this.classifier = null;
        this.toolPatterns = new Map();
        
        // NLP processors
        this.tokenizer = new natural.WordTokenizer();
        this.stemmer = natural.PorterStemmer;
        
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
    }

    /**
     * Initialize the intent classifier
     */
    initialize() {
        this._setupToolPatterns();
        this._initializeClassifier();
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
                /\b(pokemon|pokémon|poke)\b/i,
                /\b(pikachu|charizard|bulbasaur|squirtle|charmander|mew|mewtwo|lucario|garchomp|rayquaza|arceus|dialga|palkia|giratina|kyogre|groudon|latios|latias|deoxys|jirachi|celebi|manaphy|darkrai|shaymin|victini|keldeo|genesect|diancie|hoopa|volcanion|magearna|marshadow|zeraora|meltan|melmetal|zarude|calyrex|glastrier|spectrier|enamorus|koraidon|miraidon|rhyhorn)\b/i,
                /tell me about (pikachu|charizard|bulbasaur|squirtle|charmander|\w+mon)/i,
                /what (is|are) (pikachu|charizard|bulbasaur|squirtle|charmander|\w+mon)/i,
                /(pikachu|charizard|bulbasaur|squirtle|charmander|\w+mon)\s+(stats?|info|information|details|data)/i,
                /does\s+(pikachu|charizard|bulbasaur|squirtle|charmander|\w+mon)\s+(evolve|belong)/i,
                /when does\s+(pikachu|charizard|bulbasaur|squirtle|charmander|\w+mon)\s+evolve/i,
                /\b(evolution|evolve|egg group|generation|habitat)\b.*\b(pokemon|pokémon)\b/i,
                /(pokemon|pokémon)\s+(stats?|abilities|evolution|type|height|weight)/i,
                /how does\s+\w+\s+(matchup|versus|vs)\s+\w+/i,
                /\w+\s+(vs|versus)\s+\w+.*competitive/i
            );
        }
        
        return patterns;
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
            { text: 'how does pikachu matchup versus rhyhorn', label: 'pokemon' },
            { text: 'charizard vs blastoise competitive', label: 'pokemon' },
            
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
     * Classify intent of the input text
     */
    classifyIntent(text) {
        return this._patternClassifyIntent(text);
    }

    /**
     * Pattern-based intent classification (fallback and fast/balanced modes)
     */
    _patternClassifyIntent(text) {
        try {
            // First, try tool pattern matching
            for (const [toolName, patterns] of this.toolPatterns) {
                for (const pattern of patterns) {
                    if (pattern.test(text)) {
                        return {
                            intent: 'tool',
                            tool: toolName,
                            confidence: 0.9
                        };
                    }
                }
            }
            
            // Then try NLP classifier
            const tokens = this._preprocessText(text);
            const classifications = this.classifier.getClassifications(tokens);
            
            if (classifications.length > 0) {
                const topClass = classifications[0];
                
                if (topClass.label === 'pokemon') {
                    return {
                        intent: 'tool',
                        tool: 'pokemon_info',
                        confidence: topClass.value
                    };
                } else {
                    return {
                        intent: topClass.label,
                        confidence: topClass.value
                    };
                }
            }
            
            // Default to general intent
            return {
                intent: 'general',
                confidence: 0.5
            };
            
        } catch (error) {
            logger.error(`Intent classification failed: ${error.message}`);
            return {
                intent: 'general',
                confidence: 0.3
            };
        }
    }

    /**
     * Preprocess text for analysis
     */
    _preprocessText(text) {
        let processed = text.toLowerCase().trim();
        
        if (this.config.useAdvancedNLP) {
            // Use compromise for advanced NLP
            try {
                const compromise = require('compromise');
                const doc = compromise(processed);
                
                // Extract relevant parts
                const nouns = doc.nouns().out('array');
                const verbs = doc.verbs().out('array');
                const adjectives = doc.adjectives().out('array');
                
                processed = [...nouns, ...verbs, ...adjectives].join(' ');
            } catch (error) {
                // Fallback if compromise is not available
                logger.warn('Advanced NLP not available, using basic preprocessing');
            }
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
     * Update tools and regenerate patterns
     */
    updateTools(tools) {
        this.tools = tools;
        this._setupToolPatterns();
    }

    /**
     * Get available tools
     */
    getTools() {
        return this.tools;
    }
}

module.exports = IntentClassifier;
