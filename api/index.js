const express = require('express');
const cors = require('cors');
const path = require('path');

// Import our lightweight serverless agent
const TensorFlowAgentServerless = require('../src/agent/tensorflow_agent_serverless');

// Create Express app for Vercel serverless
const app = express();

// CORS configuration for Vercel deployment
app.use(cors({
    origin: [
        'https://vercel.app', 
        'https://*.vercel.app',
        'http://localhost:3000',
        'http://localhost:3001'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global agent instance (cached across serverless invocations)
let globalAgent = null;
let isInitializing = false;
let initStartTime = null;

// Initialize agent with timeout and retry logic
async function getAgent() {
    if (globalAgent && globalAgent.isInitialized) {
        return globalAgent;
    }
    
    if (isInitializing) {
        // Wait for initialization to complete (max 25 seconds)
        const maxWait = 25000;
        const startWait = Date.now();
        
        while (isInitializing && (Date.now() - startWait) < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        if (globalAgent && globalAgent.isInitialized) {
            return globalAgent;
        }
        
        throw new Error('Agent initialization timeout');
    }
    
    isInitializing = true;
    initStartTime = Date.now();
    
    try {
        console.log('🔄 Initializing lightweight serverless agent...');
        
        globalAgent = new TensorFlowAgentServerless();
        
        // Initialize with timeout
        const initTimeout = setTimeout(() => {
            throw new Error('Agent initialization timeout (30s)');
        }, 30000);
        
        await globalAgent.initialize();
        clearTimeout(initTimeout);
        
        const initTime = Date.now() - initStartTime;
        console.log(`✅ Serverless agent initialized successfully in ${initTime}ms`);
        
        return globalAgent;
        
    } catch (error) {
        console.error('❌ Failed to initialize agent:', error);
        globalAgent = null;
        throw error;
    } finally {
        isInitializing = false;
    }
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const agent = await getAgent();
        const status = agent.getStatus();
        const initTime = initStartTime ? Date.now() - initStartTime : null;
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            platform: 'vercel-serverless',
            initialization_time_ms: initTime,
            agent_ready: agent.isInitialized,
            performance_mode: status.performanceMode,
            tools_count: Array.from(agent.tools.keys()).length,
            ml_capabilities: {
                natural_language_processing: true,
                sentiment_analysis: true,
                intent_detection: true,
                entity_extraction: true
            },
            memory_usage: {
                used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                heap_total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024)
            }
        });
    } catch (error) {
        console.error('❌ Health check failed:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString(),
            platform: 'vercel-serverless',
            initialization_failed: true
        });
    }
});

// Main task processing endpoint
app.post('/api/run_task/', async (req, res) => {
    const requestStartTime = Date.now();
    
    try {
        const { task } = req.body;
        
        if (!task || typeof task !== 'string') {
            return res.status(400).json({
                error: 'Task is required and must be a string',
                usage: 'POST /api/run_task/ with {"task": "your query"}',
                timestamp: new Date().toISOString()
            });
        }
        
        if (task.length > 1000) {
            return res.status(400).json({
                error: 'Task too long (max 1000 characters)',
                timestamp: new Date().toISOString()
            });
        }
        
        console.log(`📝 Processing task: "${task.substring(0, 50)}${task.length > 50 ? '...' : ''}"`);
        
        const agent = await getAgent();
        const taskStartTime = Date.now();
        
        const result = await agent.processTask(task);
        
        const taskEndTime = Date.now();
        const totalTime = taskEndTime - requestStartTime;
        const taskTime = taskEndTime - taskStartTime;
        
        console.log(`✅ Task completed in ${taskTime}ms (total: ${totalTime}ms)`);
        
        res.json({
            result: result,
            processing_time_ms: taskTime,
            total_time_ms: totalTime,
            timestamp: new Date().toISOString(),
            platform: 'vercel-serverless',
            cached: taskTime < 10 // Assume cached if very fast
        });
        
    } catch (error) {
        const totalTime = Date.now() - requestStartTime;
        console.error('❌ Error processing task:', error);
        
        res.status(500).json({
            error: 'Task processing failed',
            message: error.message,
            total_time_ms: totalTime,
            timestamp: new Date().toISOString(),
            platform: 'vercel-serverless'
        });
    }
});

// Performance mode endpoint
app.post('/api/set_performance_mode/', async (req, res) => {
    try {
        const { mode } = req.body;
        
        const validModes = ['fast', 'balanced', 'quality'];
        if (!validModes.includes(mode)) {
            return res.status(400).json({
                error: 'Invalid performance mode',
                valid_modes: validModes,
                current_mode: process.env.PERFORMANCE_MODE || 'balanced'
            });
        }
        
        const agent = await getAgent();
        
        // Set the performance mode on the agent
        const success = agent.setPerformanceMode(mode);
        
        if (!success) {
            return res.status(400).json({
                error: 'Failed to set performance mode',
                valid_modes: validModes,
                current_mode: agent.performanceMode
            });
        }
        
        res.json({
            message: `Performance mode set to ${mode}`,
            mode: mode,
            previous_mode: agent.performanceMode === mode ? 'same' : 'different',
            config: agent.config,
            note: mode === 'quality' ? 'Cache cleared for fresh results in quality mode' : 'Performance mode updated',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error setting performance mode:', error);
        
        res.status(500).json({
            error: 'Failed to set performance mode',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Cache management endpoint
app.post('/api/clear_cache/', async (req, res) => {
    try {
        const agent = await getAgent();
        
        // Clear caches if available
        let cacheCleared = false;
        
        if (agent.cache && agent.cache.flushAll) {
            agent.cache.flushAll();
            cacheCleared = true;
        }
        
        res.json({
            message: 'Cache cleared successfully',
            cache_cleared: cacheCleared,
            timestamp: new Date().toISOString(),
            platform: 'vercel-serverless'
        });
        
    } catch (error) {
        console.error('❌ Error clearing cache:', error);
        
        res.status(500).json({
            error: 'Failed to clear cache',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Status endpoint with detailed information
app.get('/api/status/', async (req, res) => {
    try {
        const agent = await getAgent();
        const status = agent.getStatus();
        
        res.json({
            agent_status: status,
            platform: 'vercel-serverless',
            environment: {
                node_version: process.version,
                performance_mode: process.env.PERFORMANCE_MODE || 'balanced',
                memory_usage: process.memoryUsage()
            },
            uptime_seconds: process.uptime(),
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error getting status:', error);
        
        res.status(500).json({
            error: 'Failed to get status',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// API documentation endpoint
app.get('/api/docs/', (req, res) => {
    res.json({
        name: 'TensorFlow.js Agent Service API',
        version: '1.0.0',
        platform: 'vercel-serverless',
        endpoints: {
            'GET /api/health': 'Health check and system status',
            'POST /api/run_task/': 'Process AI tasks - body: {"task": "your query"}',
            'POST /api/set_performance_mode/': 'Change performance mode - body: {"mode": "fast|balanced|quality"}',
            'POST /api/clear_cache/': 'Clear system caches',
            'GET /api/status/': 'Detailed system status',
            'GET /api/docs/': 'This documentation'
        },
        examples: {
            pokemon_query: '{"task": "Tell me about Pikachu"}',
            general_query: '{"task": "How does machine learning work?"}',
            performance_mode: '{"mode": "quality"}'
        },
        timestamp: new Date().toISOString()
    });
});

// Catch-all for undefined API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        error: 'API endpoint not found',
        available_endpoints: [
            'GET /api/health',
            'POST /api/run_task/',
            'POST /api/set_performance_mode/',
            'POST /api/clear_cache/',
            'GET /api/status/',
            'GET /api/docs/'
        ],
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('❌ Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString(),
        platform: 'vercel-serverless'
    });
});

// Export the Express app for Vercel
module.exports = app;
