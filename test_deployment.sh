#!/bin/bash

# IAC Realtime AI - Deployment Test Script
# This script tests the application deployment and basic functionality

set -e  # Exit on any error

echo "🚀 IAC Realtime AI - Deployment Test"
echo "===================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one with your OpenAI API key:"
    echo "   cp .env.example .env"
    echo "   # Then edit .env and add your OpenAI API key"
    exit 1
fi

# Check if OpenAI API key is set
if grep -q "sk-your-openai-api-key-here" .env; then
    echo "❌ Please update .env with your actual OpenAI API key"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Build the Docker image
echo "🔨 Building Docker image..."
if docker-compose build; then
    echo "✅ Docker image built successfully"
else
    echo "❌ Docker build failed"
    exit 1
fi

# Start the application
echo "🚀 Starting application..."
if docker-compose up -d; then
    echo "✅ Application started"
else
    echo "❌ Failed to start application"
    exit 1
fi

# Wait for application to be ready
echo "⏳ Waiting for application to be ready..."
sleep 10

# Test health endpoint
echo "🏥 Testing health endpoint..."
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Health endpoint responding"
else
    echo "❌ Health endpoint not responding"
    echo "📋 Application logs:"
    docker-compose logs --tail=20 iac-realtime-ai
    exit 1
fi

# Test WebSocket health endpoint
echo "🔌 Testing WebSocket health endpoint..."
if curl -f http://localhost:8000/api/ws/health > /dev/null 2>&1; then
    echo "✅ WebSocket service responding"
else
    echo "❌ WebSocket service not responding"
    echo "📋 Application logs:"
    docker-compose logs --tail=20 iac-realtime-ai
    exit 1
fi

# Test main application page
echo "🌐 Testing main application page..."
if curl -f http://localhost:8000/ > /dev/null 2>&1; then
    echo "✅ Main application page responding"
else
    echo "❌ Main application page not responding"
    echo "📋 Application logs:"
    docker-compose logs --tail=20 iac-realtime-ai
    exit 1
fi

echo ""
echo "🎉 Deployment test completed successfully!"
echo ""
echo "📱 Application is running at: http://localhost:8000"
echo ""
echo "🔧 Useful commands:"
echo "   View logs:     docker-compose logs -f iac-realtime-ai"
echo "   Stop app:      docker-compose down"
echo "   Restart app:   docker-compose restart"
echo "   Rebuild:       docker-compose up --build -d"
echo ""
echo "🎤 Open http://localhost:8000 in your browser to start using the app!"
