#!/bin/bash

# Production Deployment Script
echo "🚀 Deploying IAC Realtime AI in PRODUCTION mode..."

# Check if OPENAI_API_KEY is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY environment variable is required for production"
    echo "Please run: export OPENAI_API_KEY=your_actual_key_here"
    exit 1
fi

# Set production environment variables
export SERVER_ENV=prod
export SERVER_PORT=8080
export LOG_LEVEL=info

# Build and run with docker-compose
echo "Building and starting production container..."
docker-compose down
docker-compose up --build -d

echo "✅ Production deployment complete!"
echo "🌐 Access the service at: http://ai.iaclearning.com:8080"
echo "🔗 WebSocket URL: ws://ai.iaclearning.com:8080/api/ws/speech"
echo "🏥 Health check: http://ai.iaclearning.com:8080/health"

# Show container status
echo "📊 Container status:"
docker-compose ps

echo ""
echo "🔧 Next steps:"
echo "1. Ensure DNS 'ai.iaclearning.com' points to this server"
echo "2. Ensure firewall allows TCP 8080 (ufw allow 8080/tcp)"
echo "3. Update user.js with: websocketUrl: 'ws://ai.iaclearning.com:8080/api/ws/speech'"
echo "4. Test the deployment: curl http://ai.iaclearning.com:8080/health"
