/**
 * Logger utility for TensorFlow.js Agent Service
 * 
 * Provides structured logging with timestamps and log levels
 */

const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.logLevels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
        
        // Create logs directory if it doesn't exist
        const logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
    }
    
    _shouldLog(level) {
        return this.logLevels[level] <= this.logLevels[this.logLevel];
    }
    
    _formatMessage(level, message) {
        const timestamp = new Date().toISOString();
        const upperLevel = level.toUpperCase();
        return `[${timestamp}] ${upperLevel}: ${message}`;
    }
    
    _log(level, message) {
        if (!this._shouldLog(level)) {
            return;
        }
        
        const formattedMessage = this._formatMessage(level, message);
        
        // Console output with colors
        const colors = {
            error: '\x1b[31m',  // Red
            warn: '\x1b[33m',   // Yellow
            info: '\x1b[36m',   // Cyan
            debug: '\x1b[37m'   // White
        };
        
        const reset = '\x1b[0m';
        const color = colors[level] || colors.info;
        
        console.log(`${color}${formattedMessage}${reset}`);
        
        // File output (optional)
        if (process.env.LOG_TO_FILE === 'true') {
            const logFile = path.join(process.cwd(), 'logs', 'agent.log');
            fs.appendFileSync(logFile, formattedMessage + '\n');
        }
    }
    
    error(message) {
        this._log('error', message);
    }
    
    warn(message) {
        this._log('warn', message);
    }
    
    info(message) {
        this._log('info', message);
    }
    
    debug(message) {
        this._log('debug', message);
    }
}

// Export singleton instance
module.exports = new Logger();
