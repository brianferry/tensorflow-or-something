/**
 * TensorFlow Agent Module Exports
 * 
 * Centralized exports for the refactored TensorFlow Agent modules
 * following separation of concerns best practices.
 */

// Main Agent
const TensorFlowAgent = require('./tensorflow_agent_refactored');

// Core Modules
const MLEngine = require('./modules/MLEngine');
const IntentClassifier = require('./modules/IntentClassifier');

// Analyzers
const QueryAnalyzer = require('./analyzers/QueryAnalyzer');
const MLPokemonAnalyzer = require('./analyzers/MLPokemonAnalyzer');

// Generators
const ResponseGenerator = require('./generators/ResponseGenerator');

// Legacy compatibility
const TensorFlowAgentLegacy = require('./tensorflow_agent');

module.exports = {
    // Main Agent (Refactored)
    TensorFlowAgent,
    
    // Core Modules
    MLEngine,
    IntentClassifier,
    
    // Analyzers
    QueryAnalyzer,
    MLPokemonAnalyzer,
    
    // Generators
    ResponseGenerator,
    
    // Legacy Support
    TensorFlowAgentLegacy,
    
    // Default export (refactored version)
    default: TensorFlowAgent
};
