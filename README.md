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

## 🛠️ Installation

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

### Docker Deployment

1. **Build and run with Docker Compose**
```bash
docker-compose up --build
   ```

2. **Or build manually**
   ```bash
   docker build -t iac-realtime-ai .
   docker run -p 8000:8000 iac-realtime-ai
   ```

## 🔌 API Endpoints

### WebSocket Endpoints
- **`/api/ws/speech`** - Real-time speech communication

### REST Endpoints
- **`/api/training/feedback`** - Get training feedback
- **`/api/training/scenarios`** - Available training scenarios
- **`/api/legacy/process`** - Legacy compatibility endpoint

## 🎯 Storyline Integration

The system includes a JavaScript integration script (`storyline_integration.js`) that provides:

- Real-time AI coaching during training sessions
- Automatic performance assessment
- Seamless integration with Storyline variables
- Audio feedback and coaching

### Usage in Storyline
1. Include the integration script in your Storyline project
2. Configure the WebSocket URL to point to your server
3. Use the provided methods to start/stop recording and get feedback

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
- `OPENAI_API_KEY` - Your OpenAI API key
- `LOG_LEVEL` - Logging level (INFO, DEBUG, etc.)
- `PORT` - Server port (default: 8000)

### OpenAI Configuration
- Supports all OpenAI Realtime API models
- Configurable temperature and other parameters
- Automatic connection management and retry logic

## 📊 Monitoring

The system includes comprehensive logging for:
- WebSocket connections and disconnections
- Audio processing status
- OpenAI API interactions
- Error handling and debugging

## 🚀 Deployment

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
