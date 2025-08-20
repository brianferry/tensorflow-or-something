#!/bin/bash

# Replit Test Runner for TensorFlow Agent Service
# This script provides enhanced testing capabilities in the Replit environment

set -e

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    printf "${1}${2}${NC}\n"
}

# Function to print section headers
print_header() {
    echo
    print_color $BLUE "=================================================================="
    print_color $BLUE "  $1"
    print_color $BLUE "=================================================================="
    echo
}

# Function to run a test and capture results
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    print_color $YELLOW "Running: $test_name"
    echo "Command: $test_command"
    echo
    
    if eval "$test_command"; then
        print_color $GREEN "✅ $test_name - PASSED"
        return 0
    else
        print_color $RED "❌ $test_name - FAILED"
        return 1
    fi
}

# Main execution
main() {
    print_header "TensorFlow Agent Service - Replit Test Suite"
    
    # Set test environment
    export NODE_ENV=test
    export PORT=3001
    export TEST_MODE=true
    export LOG_LEVEL=debug
    
    print_color $BLUE "Environment: Replit Test Mode"
    print_color $BLUE "Node Version: $(node --version)"
    print_color $BLUE "NPM Version: $(npm --version)"
    echo
    
    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        print_header "Installing Dependencies"
        npm install
    fi
    
    # Initialize test results
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    
    # Test categories to run
    declare -a test_categories=(
        "Unit Tests:npm run test:unit"
        "Integration Tests:npm run test:integration"
        "API Tests:npm run test:api"
        "Agent Tests:npm run test:agent"
        "Pokemon Tool Tests:npm run test:pokemon"
        "Security Tests:npm run test:security"
        "Performance Tests:npm run test:performance"
    )
    
    # Parse command line arguments
    if [ "$1" = "quick" ]; then
        print_color $YELLOW "Running Quick Test Suite (Unit + Integration only)"
        test_categories=(
            "Unit Tests:npm run test:unit"
            "Integration Tests:npm run test:integration"
        )
    elif [ "$1" = "full" ] || [ "$1" = "all" ]; then
        print_color $YELLOW "Running Full Test Suite"
        # Use all test categories
    elif [ -n "$1" ]; then
        print_color $YELLOW "Running specific test: $1"
        test_categories=("Custom Test:npm run test:$1")
    else
        print_color $YELLOW "Running Standard Test Suite"
        # Use all test categories except performance (can be slow in Replit)
        test_categories=(
            "Unit Tests:npm run test:unit"
            "Integration Tests:npm run test:integration"
            "API Tests:npm run test:api"
            "Agent Tests:npm run test:agent"
            "Pokemon Tool Tests:npm run test:pokemon"
            "Security Tests:npm run test:security"
        )
    fi
    
    # Run tests
    for test_category in "${test_categories[@]}"; do
        IFS=':' read -r test_name test_command <<< "$test_category"
        
        print_header "$test_name"
        
        total_tests=$((total_tests + 1))
        
        if run_test "$test_name" "$test_command"; then
            passed_tests=$((passed_tests + 1))
        else
            failed_tests=$((failed_tests + 1))
        fi
        
        echo
        sleep 1  # Brief pause between tests for readability
    done
    
    # Summary
    print_header "Test Results Summary"
    print_color $BLUE "Total Tests: $total_tests"
    print_color $GREEN "Passed: $passed_tests"
    print_color $RED "Failed: $failed_tests"
    
    if [ $failed_tests -eq 0 ]; then
        print_color $GREEN "🎉 All tests passed! Your service is ready for deployment."
        exit 0
    else
        print_color $RED "⚠️ Some tests failed. Please review the output above."
        exit 1
    fi
}

# Help function
show_help() {
    echo "Replit Test Runner for TensorFlow Agent Service"
    echo ""
    echo "Usage: $0 [option]"
    echo ""
    echo "Options:"
    echo "  quick     Run quick test suite (unit + integration only)"
    echo "  full      Run full test suite including performance tests"
    echo "  all       Same as full"
    echo "  unit      Run only unit tests"
    echo "  integration Run only integration tests"
    echo "  api       Run only API tests"
    echo "  agent     Run only agent tests"
    echo "  pokemon   Run only Pokemon tool tests"
    echo "  security  Run only security tests"
    echo "  performance Run only performance tests"
    echo "  help      Show this help message"
    echo ""
    echo "Default: Run standard test suite (all except performance)"
}

# Check for help argument
if [ "$1" = "help" ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

# Run main function
main "$@"
