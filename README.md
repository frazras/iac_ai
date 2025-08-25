# IAC Realtime AI - Speech-to-Speech Communication

A high-performance, real-time speech-to-speech communication application powered by OpenAI's Realtime API. This application enables natural conversations with AI through continuous audio streaming, delivering near-instantaneous responses without the latency of traditional transcription → text processing → synthesis workflows.

## 🚀 Features

- **Real-time Audio Streaming**: Continuous bidirectional audio communication with sub-second latency
- **OpenAI Realtime API Integration**: Leverages OpenAI's latest speech-to-speech capabilities
- **De-escalation Training Focus**: Specialized for conflict resolution and de-escalation skills training
- **Performance Grading**: AI automatically grades user performance on a 1-100 scale
- **Constructive Feedback**: Extracts specific feedback and improvement suggestions
- **Storyline Integration**: Ready-to-use integration with Articulate Storyline e-learning platform
- **Modern Web Architecture**: Built with FastAPI, WebSockets, and responsive HTML5/JavaScript
- **Docker-Ready**: Complete containerization with production-ready configuration
- **Volume Visualization**: Real-time audio input level monitoring
- **Automatic Audio Format Detection**: Supports multiple browser audio formats
- **Error Handling & Recovery**: Robust connection management and graceful error handling
- **Health Monitoring**: Built-in health checks and connection status monitoring

## 🎯 **NEW: De-escalation Training Features**

### **AI Coach Capabilities**
- **Real-time Assessment**: Evaluates tone, pacing, and emotional delivery
- **Performance Grading**: Provides numerical scores (1-100) for each response
- **Skill Focus Areas**:
  - Tone and voice modulation
  - Active listening and empathy
  - Calm and confident demeanor
  - Clear communication
  - Safety awareness
  - Conflict resolution techniques

### **Storyline Integration**
- **Seamless Integration**: Drop-in replacement for existing audio recording systems
- **Variable Mapping**: Automatically updates Storyline variables with AI feedback
- **Real-time Communication**: WebSocket-based connection for instant responses
- **Audio Quality**: 24kHz PCM16 audio for optimal AI processing

## 🎓 **Storyline Integration for De-escalation Training**

### **Quick Integration Steps**

1. **Include the Integration Script**
   ```html
   <!-- Add this to your Storyline HTML -->
   <script src="storyline_integration.js"></script>
   ```

2. **Initialize the AI Service**
   ```javascript
   // The script auto-initializes, but you can customize:
   window.storylineAI = new StorylineRealtimeAI({
       websocketUrl: 'ws://your-server:8000/api/ws/speech',
       autoConnect: true
   });
   ```

3. **Use in Your Storyline Triggers**
   ```javascript
   // Start recording
   window.storylineAI.startRecording();
   
   // Stop recording and get AI feedback
   window.storylineAI.stopRecording();
   
   // Request feedback update
   window.storylineAI.requestFeedback();
   ```

### **Storyline Variables**
The integration automatically updates these variables:
- `ai_grade` - Performance score (1-100)
- `ai_feedback` - Constructive feedback text
- `ai_status` - Connection and processing status

### **Example Storyline Workflow**
1. **Introduction Slide**: Explain the de-escalation scenario
2. **Practice Slide**: User records their response
3. **AI Feedback**: Real-time audio coaching and grading
4. **Review Slide**: Display grade and feedback for reflection

## 🏗️ Architecture

### Backend (FastAPI + WebSockets)
```
app/
├── main.py                 # FastAPI application entry point
├── api/
│   └── websocket.py       # WebSocket endpoint handlers with training features
├── services/
│   └── openai_service.py  # OpenAI Realtime API integration + grading
├── models/
│   └── schemas.py         # Pydantic data models
├── static/
│   └── index.html         # Frontend client
└── storyline_integration.js # Storyline integration script
```

### Key Components

1. **WebSocket Manager**: Handles client connections and OpenAI service lifecycle
2. **OpenAI Realtime Service**: Manages streaming communication with OpenAI's API
3. **Training Feedback Engine**: Extracts grades and feedback from AI responses
4. **Audio Buffer Management**: Optimizes audio chunking for minimal latency
5. **Connection Resilience**: Automatic reconnection and error recovery
6. **Storyline Bridge**: Seamless integration with Articulate Storyline

## 🛠️ Technology Stack

- **Backend**: FastAPI 0.115.6, Python 3.11
- **Real-time Communication**: WebSockets
- **AI Integration**: OpenAI Realtime API (latest version)
- **Frontend**: Vanilla JavaScript, HTML5 Audio API
- **Containerization**: Docker & Docker Compose
- **Audio Processing**: Web Audio API, MediaRecorder API
- **E-learning Integration**: Articulate Storyline compatibility

## ⚡ Quick Start

### Prerequisites

- Docker and Docker Compose
- OpenAI API key with Realtime API access
- Modern web browser with microphone access

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

## 🎯 Usage

1. **Start Conversation**: Click the "Start Conversation" button
2. **Grant Permissions**: Allow microphone access when prompted
3. **Speak Naturally**: Begin speaking - the AI will respond in real-time
4. **Monitor Volume**: Watch the volume indicator to ensure audio is being captured
5. **End Session**: Click "Stop Conversation" when finished

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | - | ✅ |
| `PORT` | Application port | 8000 | ❌ |
| `LOG_LEVEL` | Logging level | info | ❌ |

### Audio Configuration

The application automatically detects the best audio format supported by your browser:

- **Preferred**: WebM with Opus codec
- **Fallback**: WebM, MP4, MPEG

**OpenAI Realtime API Settings**:
- Sample Rate: 24kHz
- Format: PCM16
- Channels: Mono
- Voice: Alloy (configurable)

## 🚀 Development

### Local Development (without Docker)

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export OPENAI_API_KEY=your_api_key_here

# Run the application
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### API Endpoints

#### WebSocket Endpoints
- `GET /api/ws/speech` - Main speech-to-speech WebSocket
- `GET /api/ws/test` - Echo test WebSocket for debugging

#### HTTP Endpoints
- `GET /` - Serve the main application interface
- `GET /health` - Application health check
- `GET /api/ws/health` - WebSocket service health check

### Testing

```bash
# Test WebSocket connection
curl -f http://localhost:8000/health

# View application logs
docker-compose logs -f iac-realtime-ai
```

## 📊 Performance Characteristics

- **Latency**: < 500ms end-to-end in optimal conditions
- **Audio Chunk Size**: 100ms (configurable)
- **Buffer Threshold**: 200ms before transmission
- **Connection Timeout**: 10 seconds
- **Automatic Reconnection**: On connection loss

## 🔒 Security Considerations

### Production Deployment

1. **API Key Security**: Store API keys in secure environment variables or secrets management
2. **HTTPS/WSS**: Always use secure connections in production
3. **CORS Configuration**: Restrict origins to your domain
4. **Rate Limiting**: Implement request rate limiting
5. **Authentication**: Add user authentication for public deployments

### Example Production Environment

```bash
# .env for production
OPENAI_API_KEY=sk-your-production-key
LOG_LEVEL=warning
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
```

## 🐛 Troubleshooting

### Common Issues

**1. "Failed to connect to OpenAI"**
- Verify your OpenAI API key is correct
- Ensure you have Realtime API access
- Check internet connectivity

**2. "Microphone access denied"**
- Grant microphone permissions in browser
- Ensure you're accessing via HTTPS in production
- Check browser microphone settings

**3. "No audio playback"**
- Verify browser audio settings
- Check if audio autoplay is blocked
- Ensure speakers/headphones are connected

**4. Connection drops frequently**
- Check network stability
- Verify WebSocket proxy settings if behind a proxy
- Monitor application logs for errors

### Debug Mode

```bash
# Enable verbose logging
LOG_LEVEL=debug docker-compose up

# View detailed logs
docker-compose logs -f --tail=100 iac-realtime-ai
```

## 📈 Monitoring

### Health Checks

The application provides built-in health monitoring:

```bash
# Check application health
curl http://localhost:8000/health

# Check WebSocket service
curl http://localhost:8000/api/ws/health
```

### Metrics

Monitor these key metrics:
- Active WebSocket connections
- OpenAI API response times
- Audio buffer overflow events
- Connection success/failure rates

## 🛣️ Roadmap

### Planned Features

- [ ] Multi-user support with session management
- [ ] Custom voice selection
- [ ] Audio quality settings
- [ ] Conversation history
- [ ] Multiple language support
- [ ] Integration with other LLM providers
- [ ] Mobile application
- [ ] Analytics dashboard

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
1. Check the troubleshooting section above
2. Review application logs
3. Create an issue in the repository
4. Consult OpenAI's Realtime API documentation

## 🙏 Acknowledgments

- OpenAI for the powerful Realtime API
- FastAPI community for the excellent framework
- Contributors and testers

---

**Built with ❤️ for real-time AI communication**
