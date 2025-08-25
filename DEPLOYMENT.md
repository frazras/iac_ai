# 🚀 Deployment Guide for De-escalation Training Platform

## **Overview**
This guide covers deploying the IAC Realtime AI service for integration with your Articulate Storyline de-escalation training platform.

## **Prerequisites**
- Docker and Docker Compose installed
- OpenAI API key with Realtime API access
- Network access to the deployment server
- Storyline platform ready for integration

## **Quick Deployment**

### **1. Environment Setup**
```bash
# Clone the repository
git clone <your-repo-url>
cd iac_realtime_ai

# Create environment file
cp .env.example .env

# Edit .env with your OpenAI API key
OPENAI_API_KEY=sk-your-actual-api-key-here
LOG_LEVEL=info
```

### **2. Build and Deploy**
```bash
# Build and start the service
docker-compose up --build -d

# Check status
docker-compose ps
docker-compose logs -f iac-realtime-ai
```

### **3. Verify Deployment**
```bash
# Health check
curl http://localhost:8000/health

# Training endpoints
curl http://localhost:8000/api/training/scenarios
```

## **Storyline Integration**

### **1. Update Your Storyline Project**
Replace your existing `user.js` with the new `storyline_user.js` from this repository.

### **2. Include Integration Script**
Add this to your Storyline HTML:
```html
<script src="storyline_integration.js"></script>
```

### **3. Update WebSocket URL**
In `storyline_user.js`, update the WebSocket URL to match your deployment:
```javascript
window.storylineAI = new StorylineRealtimeAI({
    websocketUrl: 'ws://your-server-ip:8000/api/ws/speech',
    autoConnect: true
});
```

## **Production Deployment**

### **1. Production Environment Variables**
```bash
# .env for production
OPENAI_API_KEY=sk-your-production-key
LOG_LEVEL=warning
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
HTTPS_ENABLED=true
```

### **2. Reverse Proxy Setup (Nginx)**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### **3. SSL Certificate Setup**
```bash
# Using Let's Encrypt
sudo certbot --nginx -d yourdomain.com

# Or manual SSL certificate placement
sudo cp your-cert.pem /etc/ssl/certs/
sudo cp your-key.pem /etc/ssl/private/
```

## **Testing the Integration**

### **1. Test WebSocket Connection**
```javascript
// In browser console
const ws = new WebSocket('ws://your-server:8000/api/ws/speech');
ws.onopen = () => console.log('Connected!');
ws.onmessage = (e) => console.log('Message:', e.data);
```

### **2. Test Audio Recording**
```javascript
// Test microphone access
navigator.mediaDevices.getUserMedia({audio: true})
  .then(stream => console.log('Microphone access granted'))
  .catch(err => console.error('Microphone access denied:', err));
```

### **3. Test AI Response**
Start recording and speak for a few seconds. You should hear the AI respond within 1-2 seconds.

## **Monitoring and Troubleshooting**

### **1. Check Service Status**
```bash
# Service status
docker-compose ps

# Real-time logs
docker-compose logs -f iac-realtime-ai

# Check OpenAI connection
docker-compose logs iac-realtime-ai | grep "OpenAI"
```

### **2. Common Issues**

**WebSocket Connection Failed**
- Check firewall settings
- Verify port 8000 is open
- Check if service is running

**No AI Response**
- Verify OpenAI API key is valid
- Check OpenAI API quota
- Review server logs for errors

**Audio Quality Issues**
- Ensure 24kHz sample rate
- Check microphone permissions
- Verify PCM16 audio format

### **3. Performance Monitoring**
```bash
# Monitor resource usage
docker stats iac-realtime-ai

# Check WebSocket connections
curl http://localhost:8000/api/ws/health
```

## **Scaling Considerations**

### **1. Multiple Instances**
```yaml
# docker-compose.yml
services:
  iac-realtime-ai:
    deploy:
      replicas: 3
    environment:
      - REDIS_URL=redis://redis:6379
```

### **2. Load Balancer**
Use a load balancer (HAProxy, Nginx) to distribute WebSocket connections across multiple instances.

### **3. Database Integration**
For production use, consider adding:
- User session management
- Training history storage
- Performance analytics

## **Security Considerations**

### **1. API Key Security**
- Never commit API keys to version control
- Use environment variables or secrets management
- Rotate keys regularly

### **2. Network Security**
- Use HTTPS/WSS in production
- Implement rate limiting
- Restrict CORS origins
- Add authentication if needed

### **3. Data Privacy**
- Ensure compliance with training data regulations
- Implement data retention policies
- Secure audio data transmission

## **Support and Maintenance**

### **1. Regular Updates**
```bash
# Update dependencies
docker-compose pull
docker-compose up --build -d

# Check for security updates
docker-compose exec iac-realtime-ai pip list --outdated
```

### **2. Backup Strategy**
- Backup environment configuration
- Backup training scenarios
- Document customizations

### **3. Monitoring Setup**
- Set up log aggregation
- Configure alerting for service failures
- Monitor OpenAI API usage and costs

---

**Need Help?** Check the troubleshooting section in the main README or create an issue in the repository.
