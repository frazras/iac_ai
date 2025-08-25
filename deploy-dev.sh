#!/bin/bash

# Development Deployment Script
echo "🔧 Deploying IAC Realtime AI in DEVELOPMENT mode..."

# Set development environment variables
export SERVER_ENV=dev
export SERVER_PORT=8000
export LOG_LEVEL=debug

# Build and run with docker-compose
echo "Building and starting development container..."
docker-compose down
docker-compose up --build -d

echo "✅ Development deployment complete!"
echo "🌐 Access the service at: http://localhost:8000"
echo "🔗 WebSocket URL: ws://localhost:8000/api/ws/speech"
echo "🏥 Health check: http://localhost:8000/health"

# Show logs
echo "📝 Container logs:"
docker-compose logs -f
