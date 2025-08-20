/**
 * TensorFlow.js-powered AI Agent Service with Express.js
 * 
 * A production-ready AI agent service that uses TensorFlow.js for local inference,
 * intelligent pattern matching for tool routing, and Pokemon information tools.
 * 
 * Features:
 * - Intent classification using NLP
 * - Pokemon information tool integration
 * - Response caching for performance
 * - RESTful API compatible with LangChain service
 * 
 * Author: AI Agent Developer
 * Version: 1.0.0
 * Node.js: 18+
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const NodeCache = require('node-cache');
require('dotenv').config();

const TensorFlowAgent = require('./agent/tensorflow_agent');
const PokemonTool = require('./tools/pokemon_tool');
const logger = require('./utils/logger');

// Global agent instance
let agent = null;

// Performance configuration
const PERFORMANCE_MODE = process.env.PERFORMANCE_MODE || 'balanced';
const PORT = process.env.PORT || 3000;
const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 1800; // 30 minutes

// Response cache
const responseCache = new NodeCache({ stdTTL: CACHE_TTL });

/**
 * Initialize the TensorFlow.js agent with tools
 */
async function initializeAgent() {
    try {
        logger.info('Initializing TensorFlow.js Agent...');
        
        // Initialize tools
        const pokemonTool = new PokemonTool();
        const tools = [pokemonTool];
        
        // Create agent with tools
        agent = new TensorFlowAgent({
            tools,
            performanceMode: PERFORMANCE_MODE,
            cache: responseCache
        });
        
        await agent.initialize();
        
        logger.info(`Agent initialized successfully with ${tools.length} tools`);
        logger.info(`Performance mode: ${PERFORMANCE_MODE}`);
        
        return agent;
        
    } catch (error) {
        logger.error(`Failed to initialize agent: ${error.message}`);
        throw error;
    }
}

/**
 * Create Express.js application
 */
function createApp() {
    const app = express();
    
    // Middleware
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },
    }));
    app.use(cors());
    app.use(morgan('combined'));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    
    // Serve static files from public directory
    app.use('/static', express.static(path.join(__dirname, '..', 'public')));
    
    // Test UI route
    app.get('/test', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'test-ui.html'));
    });
    
    // Health check endpoint
    app.get('/', (req, res) => {
        res.json({
            message: 'TensorFlow.js AI Agent Service',
            status: 'running',
            agent_ready: agent !== null,
            performance_mode: PERFORMANCE_MODE,
            framework: 'TensorFlow.js',
            version: '1.0.0'
        });
    });
    
    // Main task processing endpoint (compatible with LangChain service)
    app.post('/run_task/', async (req, res) => {
        const startTime = Date.now();
        
        try {
            if (!agent) {
                return res.status(503).json({
                    error: 'Agent not initialized'
                });
            }
            
            const { task, stream = false, mode } = req.body;
            
            if (!task) {
                return res.status(400).json({
                    error: 'Task parameter is required'
                });
            }
            
            // Handle performance mode change
            if (mode && ['fast', 'balanced', 'quality'].includes(mode)) {
                if (agent.performanceMode !== mode) {
                    logger.info(`Switching performance mode from ${agent.performanceMode} to ${mode}`);
                    agent.performanceMode = mode;
                }
            }
            
            logger.info(`Processing task: ${task.substring(0, 50)}...`);
            
            // Include mode in cache key to differentiate responses by performance mode
            const cacheKey = `task_${mode || agent.performanceMode}_${Buffer.from(task.toLowerCase().trim()).toString('base64')}`;
            const cachedResult = responseCache.get(cacheKey);
            
            if (cachedResult) {
                logger.info(`Returning cached response for task (${mode || agent.performanceMode} mode)`);
                return res.json({
                    result: cachedResult,
                    cached: true,
                    performance_mode: mode || agent.performanceMode,
                    processing_time: Date.now() - startTime
                });
            }
            
            // Process task with agent
            const result = await agent.processTask(task);
            
            // Cache the result
            responseCache.set(cacheKey, result);
            
            const processingTime = Date.now() - startTime;
            logger.info(`Task completed in ${processingTime}ms`);
            
            res.json({
                result,
                cached: false,
                performance_mode: mode || agent.performanceMode,
                processing_time: processingTime
            });
            
        } catch (error) {
            const processingTime = Date.now() - startTime;
            logger.error(`Error processing task after ${processingTime}ms: ${error.message}`);
            
            res.status(500).json({
                error: `Task processing failed: ${error.message}`,
                processing_time: processingTime
            });
        }
    });
    
    // List available tools
    app.get('/tools/', (req, res) => {
        if (!agent) {
            return res.json({
                tools: [],
                status: 'agent_not_ready'
            });
        }
        
        const toolsInfo = agent.getToolsInfo();
        
        res.json({
            tools: toolsInfo,
            total_tools: toolsInfo.length
        });
    });
    
    // Detailed health check
    app.get('/health/', (req, res) => {
        const cacheStats = responseCache.getStats();
        
        res.json({
            service: 'healthy',
            agent_ready: agent !== null,
            tools_count: agent ? agent.getToolsInfo().length : 0,
            performance_mode: PERFORMANCE_MODE,
            framework: 'TensorFlow.js',
            cache_entries: cacheStats.keys,
            cache_hits: cacheStats.hits,
            cache_misses: cacheStats.misses,
            performance_optimizations: [
                'Response caching (30min TTL)',
                'Pokemon API caching (1hr TTL)',
                'Connection pooling',
                `NLP-based intent classification`,
                'Pattern matching for tool routing',
                'Configurable performance modes',
                'Fast JavaScript execution'
            ],
            node_version: process.version,
            memory_usage: process.memoryUsage()
        });
    });
    
    // Performance modes endpoint
    app.get('/performance/modes/', (req, res) => {
        res.json({
            current_mode: PERFORMANCE_MODE,
            available_modes: {
                fast: {
                    description: 'Fastest responses using simple pattern matching',
                    estimated_speed: '10x faster than LLM',
                    use_case: 'Quick queries, real-time chat',
                    features: ['Pattern matching', 'No ML inference', 'Instant responses']
                },
                balanced: {
                    description: 'Good balance using lightweight NLP + patterns',
                    estimated_speed: '5x faster than LLM',
                    use_case: 'General purpose, production use',
                    features: ['NLP intent classification', 'Pattern matching fallback', 'Caching']
                },
                quality: {
                    description: 'Best quality using TensorFlow.js models',
                    estimated_speed: '2x faster than LLM',
                    use_case: 'Complex queries, detailed analysis',
                    features: ['TensorFlow.js inference', 'Advanced NLP', 'Context awareness']
                }
            }
        });
    });
    
    // Cache management
    app.post('/cache/clear/', (req, res) => {
        responseCache.flushAll();
        res.json({
            message: 'Cache cleared successfully'
        });
    });
    
    app.get('/cache/stats/', (req, res) => {
        const stats = responseCache.getStats();
        res.json(stats);
    });
    
    // Error handling middleware
    app.use((error, req, res, next) => {
        logger.error(`Unhandled error: ${error.message}`);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    });
    
    // 404 handler
    app.use((req, res) => {
        res.status(404).json({
            error: 'Endpoint not found',
            available_endpoints: [
                'GET /',
                'POST /run_task/',
                'GET /tools/',
                'GET /health/',
                'GET /performance/modes/',
                'POST /cache/clear/',
                'GET /cache/stats/'
            ]
        });
    });
    
    return app;
}

/**
 * Start the server
 */
async function startServer() {
    try {
        // Initialize agent first
        await initializeAgent();
        
        // Create and start Express app
        const app = createApp();
        
        const server = app.listen(PORT, '0.0.0.0', () => {
            logger.info(`🚀 TensorFlow.js Agent Service started successfully`);
            logger.info(`📡 Server running on http://0.0.0.0:${PORT}`);
            logger.info(`🧠 Agent ready with ${agent.getToolsInfo().length} tools`);
            logger.info(`⚡ Performance mode: ${PERFORMANCE_MODE}`);
        });
        
        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger.info('SIGTERM received, shutting down gracefully');
            server.close(() => {
                logger.info('Server closed');
                process.exit(0);
            });
        });
        
        process.on('SIGINT', () => {
            logger.info('SIGINT received, shutting down gracefully');
            server.close(() => {
                logger.info('Server closed');
                process.exit(0);
            });
        });
        
    } catch (error) {
        logger.error(`Failed to start server: ${error.message}`);
        process.exit(1);
    }
}

// Start the server if this file is run directly
if (require.main === module) {
    startServer();
}

module.exports = { createApp, initializeAgent };
