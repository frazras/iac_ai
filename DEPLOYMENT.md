# IAC Realtime AI - Deployment Guide

This guide covers deploying the IAC Realtime AI system for de-escalation training.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- OpenAI API key with Realtime API access
- Port 8000 available (configurable)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd iac_realtime_ai
```

### 2. Configure Environment
```bash
# Copy the environment template
cp .env.example .env

# Edit .env and add your OpenAI API key
OPENAI_API_KEY=your_actual_openai_api_key_here
```

### 3. Build and Run
```bash
# Build and start the application
docker-compose up --build

# Or run in detached mode
docker-compose up --build -d
```

### 4. Access the Application
Open your browser and navigate to:
```
http://localhost:8000
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

---

**Note**: This deployment guide covers the working features of the IAC Realtime AI system. For additional configuration options, refer to the main README.md file.
