/**
 * TensorFlow.js Agent - Refactored Main Agent Implementation
 * 
 * This agent orchestrates multiple specialized modules to provide
 * intelligent task routing, tool integration, and response generation.
 */

const logger = require('../utils/logger');

// Import specialized modules
const MLEngine = require('./modules/MLEngine');
const IntentClassifier = require('./modules/IntentClassifier');
const QueryAnalyzer = require('./analyzers/QueryAnalyzer');
const ResponseGenerator = require('./generators/ResponseGenerator');
const MLPokemonAnalyzer = require('./analyzers/MLPokemonAnalyzer');

class TensorFlowAgent {
    constructor(options = {}) {
        this.tools = options.tools || [];
        this.performanceMode = options.performanceMode || 'balanced';
        this.cache = options.cache;
        
        // Initialize specialized modules
        this.mlEngine = new MLEngine(this.performanceMode);
        this.intentClassifier = new IntentClassifier(this.tools, this.performanceMode);
        this.queryAnalyzer = new QueryAnalyzer();
        this.responseGenerator = new ResponseGenerator(this.performanceMode);
        this.mlPokemonAnalyzer = new MLPokemonAnalyzer();
        
        this.isInitialized = false;
    }
    
    /**
     * Initialize the agent and its components
     */
    async initialize() {
        try {
            logger.info('Initializing TensorFlow.js Agent...');
            
            // Initialize all modules
            await this.mlEngine.initialize();
            this.intentClassifier.initialize();
            
            this.isInitialized = true;
            logger.info(`Agent initialized in ${this.performanceMode} mode`);
            
        } catch (error) {
            logger.error(`Agent initialization failed: ${error.message}`);
            throw error;
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
            
            // Classify intent using specialized module
            const classification = this.intentClassifier.classifyIntent(task);
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
                const enhancedParams = await this.mlEngine.mlEnhancedParameterExtraction(task);
                const result = await tool.execute(task, {
                    performanceMode: this.performanceMode,
                    config: this._getConfig(),
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
                    config: this._getConfig()
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
     * Process structured data from tools using AI capabilities
     */
    async _processToolData(toolData, originalQuery, mlParams = null) {
        switch (toolData.type) {
            case 'pokemon_data':
                if (mlParams) {
                    return await this.mlPokemonAnalyzer.generateMLEnhancedPokemonResponse(
                        toolData.pokemon, originalQuery, toolData.performanceMode, mlParams
                    );
                } else {
                    return await this.responseGenerator.generateResponse(
                        toolData.pokemon, originalQuery, 'pokemon', mlParams
                    );
                }
            case 'competitive_matchup':
                return await this.responseGenerator.generateResponse(
                    toolData.pokemon, originalQuery, 'competitive_matchup', mlParams
                );
            default:
                return 'I received data from the tool but cannot process it properly.';
        }
    }
    
    /**
     * Execute general task (without tools)
     */
    async _executeGeneralTask(task) {
        logger.info('Executing general task');
        
        // Generate response using specialized response generator
        return await this.responseGenerator.generateResponse(null, task, 'general');
    }
    
    /**
     * Get performance configuration
     */
    _getConfig() {
        const configs = {
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
        
        return configs[this.performanceMode] || configs.balanced;
    }
    
    /**
     * Switch performance mode
     */
    async switchPerformanceMode(newMode) {
        if (!['fast', 'balanced', 'quality'].includes(newMode)) {
            throw new Error(`Invalid performance mode: ${newMode}`);
        }
        
        const oldMode = this.performanceMode;
        this.performanceMode = newMode;
        
        // Reinitialize components that depend on performance mode
        this.mlEngine = new MLEngine(this.performanceMode);
        this.intentClassifier = new IntentClassifier(this.tools, this.performanceMode);
        this.responseGenerator = new ResponseGenerator(this.performanceMode);
        
        // Reinitialize if needed
        if (newMode === 'quality' && oldMode !== 'quality') {
            await this.mlEngine.initialize();
        }
        
        this.intentClassifier.initialize();
        
        logger.info(`Performance mode switched from ${oldMode} to ${newMode}`);
    }
    
    /**
     * Add or update tools
     */
    updateTools(tools) {
        this.tools = tools;
        this.intentClassifier.updateTools(tools);
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
            ml_enabled: this._getConfig().useML,
            advanced_nlp: this._getConfig().useAdvancedNLP,
            ml_capabilities: this.mlEngine.getCapabilities(),
            modules: {
                ml_engine: this.mlEngine.isReady(),
                intent_classifier: true,
                query_analyzer: true,
                response_generator: true,
                ml_pokemon_analyzer: true
            }
        };
    }
    
    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            mode: this.performanceMode,
            ml_enabled: this._getConfig().useML,
            capabilities: this.mlEngine.getCapabilities(),
            modules_loaded: {
                ml_engine: this.mlEngine.isReady(),
                intent_classifier: true,
                query_analyzer: true,
                response_generator: true,
                ml_pokemon_analyzer: true
            }
        };
    }
}

module.exports = TensorFlowAgent;
