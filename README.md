# IAC Realtime AI - De-escalation Training System

A real-time speech-to-speech AI system for de-escalation training, designed to integrate with Articulate Storyline courses.

## 🚀 Features

### ✅ **Working Features**
- **Real-time Speech-to-Speech**: Live audio communication with AI
- **WebSocket Communication**: Fast, reliable real-time connections
- **OpenAI Realtime API Integration**: Powered by OpenAI's latest real-time technology
- **Storyline Integration**: Seamless integration with Articulate Storyline courses
- **De-escalation Training**: Specialized for conflict resolution training
- **Performance Grading**: AI-powered assessment of de-escalation skills
- **Audio Feedback**: Real-time coaching and feedback

### 🔧 **Technical Features**
- **FastAPI Backend**: Modern, fast Python web framework
- **WebSocket Support**: Real-time bidirectional communication
- **Docker Support**: Easy deployment and scaling
- **CORS Enabled**: Cross-origin resource sharing for development
- **Environment Configuration**: Flexible configuration via environment variables

## 📋 Prerequisites

- Python 3.8+
- OpenAI API key with Realtime API access
- Docker (optional, for containerized deployment)

## 🛠️ Installation & Quick Start

### Local Development

1. **Clone the repository**
```bash
git clone <repository-url>
cd iac_realtime_ai
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your OpenAI API key
```

4. **Run the application**
```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Docker Deployment (Recommended)

1. **Build and run with Docker Compose**
```bash
docker-compose up --build
```

2. **Or build manually**
```bash
docker build -t iac-realtime-ai .
docker run -p 8000:8000 iac-realtime-ai
```

3. **Access the application**
Open your browser and navigate to:
```
http://localhost:8000
```

## 🔌 API Endpoints

### WebSocket Endpoints
- **`/api/ws/speech`** - Real-time speech communication

### REST Endpoints
- **`/api/training/feedback`** - Get training feedback
- **`/api/training/scenarios`** - Available training scenarios
- **`/api/legacy/process`** - Legacy compatibility endpoint

## 🎯 Storyline Integration

The system integrates with Articulate Storyline through the JavaScript code in your course's `user.js` file, providing:

- Real-time AI coaching during training sessions
- Automatic performance assessment
- Seamless integration with Storyline variables
- Audio feedback and coaching

### Included Files
- **`user.js`** - Complete Storyline integration script with real-time AI capabilities
- **`storyline_integration.js`** - Alternative integration script (if needed)

### Usage in Storyline
1. **Copy `user.js`** from this project to your Storyline course's `story_content` folder
2. **Configure the WebSocket URL** in the script to point to your server
3. **Use the provided methods** to start/stop recording and get feedback

### Configuration
The `user.js` file includes a configuration section at the top that you can modify:

```javascript
// AI Service Configuration
const AI_SERVICE_CONFIG = {
    // WebSocket URL for the AI service (change this for production)
    websocketUrl: 'ws://localhost:8000/api/ws/speech',
    
    // Auto-connect to AI service on page load
    autoConnect: true,
    
    // Enable debug logging (set to false for production)
    debugMode: false
};
```

**For Production Deployment:**
- Change `websocketUrl` to your production server (e.g., `wss://yourdomain.com/api/ws/speech`)
- Use `wss://` (secure WebSocket) for HTTPS sites
- Set `debugMode: false` for production
- Ensure your server is accessible from your Storyline hosting environment

### Features in user.js
- **Real-time Speech Recording**: Live audio capture and streaming
- **AI Response Playback**: Seamless audio feedback from the AI
- **Grade Management**: Automatic handling of training scores (1-10 scale)
- **Resume Session Handling**: Smart detection and cleanup of old session data
- **Debug Mode**: Configurable logging for troubleshooting
- **Fallback Recording**: Backup recording method if AI service fails

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Storyline     │    │   WebSocket      │    │   OpenAI        │
│   Course        │◄──►│   Endpoint       │◄──►│   Realtime API  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Audio          │
                       │   Processing     │
                       └──────────────────┘
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | - | ✅ |
| `PORT` | Application port | 8000 | ❌ |
| `LOG_LEVEL` | Logging level | info | ❌ |

### Audio Configuration

**OpenAI Realtime API Settings**:
- Sample Rate: 24kHz
- Format: PCM16
- Channels: Mono
- Voice: Alloy (configurable)

### OpenAI Configuration
- Supports all OpenAI Realtime API models
- Configurable temperature and other parameters
- Automatic connection management and retry logic

## 🐳 Docker Deployment

### Production Docker Compose
```yaml
version: '3.8'
services:
  iac-realtime-ai:
    build: .
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - LOG_LEVEL=info
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Manual Docker Build
```bash
# Build the image
docker build -t iac-realtime-ai .

# Run the container
docker run -d \
  --name iac-realtime-ai \
  -p 8000:8000 \
  -e OPENAI_API_KEY=your_key_here \
  iac-realtime-ai
```

## 🌐 Production Deployment

### 1. Reverse Proxy Setup (Nginx)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. SSL/HTTPS Setup
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Systemd Service (Linux)
```ini
[Unit]
Description=IAC Realtime AI
After=network.target

[Service]
Type=simple
User=iac-ai
WorkingDirectory=/opt/iac-realtime-ai
Environment=PATH=/opt/iac-realtime-ai/venv/bin
ExecStart=/opt/iac-realtime-ai/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## 📊 Monitoring

### Health Checks
```bash
# Application health
curl http://localhost:8000/health

# WebSocket service health
curl http://localhost:8000/api/ws/health
```

### Log Monitoring
```bash
# View application logs
docker-compose logs -f iac-realtime-ai

# View specific log levels
docker-compose logs -f --tail=100 iac-realtime-ai | grep ERROR
```

### Performance Metrics
Monitor these key metrics:
- Active WebSocket connections
- OpenAI API response times
- Audio processing latency
- Connection success/failure rates

The system includes comprehensive logging for:
- WebSocket connections and disconnections
- Audio processing status
- OpenAI API interactions
- Error handling and debugging

## 🔒 Security

### Production Security Checklist
- [ ] Use HTTPS/WSS in production
- [ ] Restrict CORS origins to your domain
- [ ] Store API keys in secure environment variables
- [ ] Implement rate limiting
- [ ] Add authentication if needed
- [ ] Regular security updates

### CORS Configuration
```python
# In production, restrict origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 🚨 Troubleshooting

### Common Issues

**1. "Failed to connect to OpenAI"**
- Verify your OpenAI API key is correct
- Ensure you have Realtime API access
- Check internet connectivity

**2. Connection drops frequently**
- Check network stability
- Verify WebSocket proxy settings if behind a proxy
- Monitor application logs for errors

**3. High memory usage**
- Monitor container resource usage
- Consider increasing memory limits
- Check for memory leaks in long-running connections

### Debug Mode
```bash
# Enable verbose logging
LOG_LEVEL=debug docker-compose up

# View detailed logs
docker-compose logs -f --tail=100 iac-realtime-ai
```

## 📈 Scaling

### Horizontal Scaling
The WebSocket architecture supports multiple instances:
- Each connection maintains its own OpenAI service
- Stateless design allows for load balancing
- Use Redis for session sharing if needed

### Load Balancer Configuration
```nginx
upstream iac_ai_backend {
    server 127.0.0.1:8001;
    server 127.0.0.1:8002;
    server 127.0.0.1:8003;
}

server {
    location / {
        proxy_pass http://iac_ai_backend;
        # ... other proxy settings
    }
}
```

## 🔄 Updates

### Updating the Application
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up --build -d

# Verify deployment
curl http://localhost:8000/health
```

### Zero-Downtime Updates
```bash
# Build new image
docker build -t iac-realtime-ai:new .

# Update one container at a time
docker-compose up -d --no-deps --scale iac-realtime-ai=2
docker-compose up -d --no-deps --scale iac-realtime-ai=1
```

## 🚀 Deployment Considerations

### Production Considerations
- Use a production ASGI server (e.g., Gunicorn with Uvicorn workers)
- Set up proper CORS origins for production
- Configure logging and monitoring
- Use environment-specific configuration files

### Scaling
- The WebSocket architecture supports multiple concurrent connections
- Each connection maintains its own OpenAI service instance
- Stateless design allows for horizontal scaling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the existing issues
2. Create a new issue with detailed information
3. Include logs and error messages

---

**Note**: This system is designed specifically for de-escalation training and integrates with Articulate Storyline. For other use cases, the core WebSocket and OpenAI integration components can be adapted.
