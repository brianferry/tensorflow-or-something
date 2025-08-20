# Replit Testing Guide

## Overview

This TensorFlow Agent Service includes comprehensive testing capabilities optimized for the Replit environment. You can run various types of tests to ensure your service is working correctly before deployment.

## Quick Start

### 1. Run All Tests
```bash
npm run test:replit
```

### 2. Run Quick Tests (Recommended for development)
```bash
npm run test:replit:quick
```

### 3. Run Full Test Suite
```bash
npm run test:replit:full
```

## Available Test Commands

### Replit-Specific Commands
- `npm run test:replit` - Run standard test suite (all except performance)
- `npm run test:replit:quick` - Run unit and integration tests only
- `npm run test:replit:full` - Run all tests including performance tests
- `npm run test:replit:help` - Show available test options

### Individual Test Categories
- `npm run test:unit` - Unit tests for core components
- `npm run test:integration` - Integration tests for workflows
- `npm run test:api` - API endpoint tests
- `npm run test:agent` - TensorFlow agent tests
- `npm run test:pokemon` - Pokemon tool tests
- `npm run test:security` - Security vulnerability tests
- `npm run test:performance` - Performance and load tests

### Environment Test
```bash
node test/test_replit_env.js
```
This verifies that your Replit environment is properly configured.

## Test Files

### Configuration Files
- `.test.replit` - Replit test environment configuration
- `test/replit.config.js` - Test settings optimized for Replit
- `test-replit.sh` - Enhanced test runner with colored output

### Test Suites
- `test/test_all.js` - Main test orchestrator
- `test/test_agent.js` - Core agent functionality tests
- `test/test_pokemon_tool.js` - Pokemon tool tests
- `test/test_integration.js` - Integration tests
- `test/test_performance.js` - Performance benchmarks
- `test/test_security.js` - Security tests
- `test/test_replit_env.js` - Environment verification

## Test Environment

The tests run in a dedicated test environment with:
- Node.js 20
- Port 3001 (separate from main service on 3000)
- Test-specific environment variables
- Debug logging enabled
- Enhanced error reporting

## What Gets Tested

### ✅ Unit Tests
- Agent initialization and configuration
- Performance mode switching (fast/balanced/quality)
- Tool integration and routing
- Error handling and edge cases
- Pokemon API integration
- Caching mechanisms

### ✅ Integration Tests
- End-to-end request processing
- Multi-tool workflows
- Error recovery
- Performance across different scenarios

### ✅ API Tests
- HTTP endpoint functionality
- Request/response validation
- Authentication and security
- Rate limiting
- CORS handling

### ✅ Security Tests
- Input sanitization
- XSS protection
- Rate limiting effectiveness
- Helmet security headers
- Error information disclosure

### ✅ Performance Tests
- Response time benchmarks
- Memory usage monitoring
- Concurrent request handling
- Caching effectiveness

## Test Results

Tests provide detailed output including:
- ✅ Pass/fail status for each test
- ⏱️ Execution time
- 📊 Performance metrics
- 🔍 Detailed error information
- 📈 Coverage statistics

## Replit-Specific Features

### Environment Auto-Setup
The test runner automatically:
- Sets up test environment variables
- Checks Node.js and npm versions
- Verifies required dependencies
- Tests port availability
- Validates file system structure

### Enhanced Output
- Color-coded test results
- Progress indicators
- Detailed timing information
- Memory usage tracking
- Clear error messages

### Performance Optimization
- Tests are optimized for Replit's environment
- Longer timeouts for slower Replit instances
- Memory-efficient test execution
- Parallel test execution where appropriate

## Troubleshooting

### Common Issues

1. **Tests fail due to missing dependencies**
   ```bash
   npm install
   npm run test:replit
   ```

2. **Port conflicts**
   - Tests use port 3001 by default
   - Main service uses port 3000
   - If conflicts occur, stop other services

3. **Memory issues**
   - Use `npm run test:replit:quick` for lighter testing
   - Avoid running performance tests in low-memory environments

4. **TensorFlow warnings**
   - TensorFlow.js warnings are normal and don't affect functionality
   - Tests will pass despite these informational messages

### Environment Verification
If tests fail unexpectedly, first run:
```bash
node test/test_replit_env.js
```

This will verify your Replit environment is properly configured.

## Best Practices

### Before Deployment
1. Run `npm run test:replit:quick` during development
2. Run `npm run test:replit:full` before final deployment
3. Check the environment with `node test/test_replit_env.js`

### During Development
- Use `npm run test:unit` for rapid feedback
- Run specific test categories as you work on features
- Use the test runner's help: `npm run test:replit:help`

### Performance Testing
- Run performance tests in a dedicated Replit session
- Ensure no other services are running during performance tests
- Performance thresholds are adjusted for Replit's environment

## Integration with Replit

### Replit Console
All tests can be run directly in the Replit console with full color output and progress indicators.

### Replit Files
- Tests integrate with Replit's file system
- No additional setup required
- Works with Replit's package management

### Replit Environment
- Tests adapt to Replit's resource constraints
- Optimized timeouts and thresholds
- Enhanced error reporting for Replit debugging

## Next Steps

After tests pass:
1. Your service is ready for deployment
2. Use the main service with `npm start`
3. Test the deployed service with the API endpoints
4. Monitor performance in production

For deployment instructions, see `REPLIT_DEPLOY.md`.
