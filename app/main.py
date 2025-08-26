"""
Main FastAPI application for real-time speech-to-speech communication.
This application provides WebSocket endpoints for streaming audio data to and from OpenAI's Realtime API.
"""

import os
import logging
from fastapi import FastAPI, Request, UploadFile, Form
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from typing import Optional

from app.api.websocket import router as websocket_router

# Load environment variables
load_dotenv()

# Configure logging
log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="IAC Realtime AI",
    description="Real-time speech-to-speech communication using OpenAI's Realtime API",
    version="1.0.0"
)

# Configure CORS - allow all origins for maximum compatibility
allowed_origins = ["*"]
logger.info("CORS enabled for all origins - wide open access")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include WebSocket router
app.include_router(websocket_router, prefix="/api")

# Add new training-specific endpoints
@app.post("/api/training/feedback")
async def get_training_feedback():
    """Get current training feedback and grading."""
    return {
        "status": "success",
        "message": "Training feedback endpoint ready",
        "features": [
            "Real-time audio feedback",
            "Performance grading (1-100)",
            "Constructive feedback extraction",
            "De-escalation skill assessment"
        ]
    }

@app.get("/api/training/scenarios")
async def get_training_scenarios():
    """Get available de-escalation training scenarios."""
    scenarios = [
        {
            "id": "agitated_customer",
            "title": "Agitated Customer Service",
            "description": "Handle an upset customer in a retail setting",
            "difficulty": "Beginner",
            "duration": "2-3 minutes"
        },
        {
            "id": "workplace_conflict",
            "title": "Workplace Dispute",
            "description": "Mediate a conflict between coworkers",
            "difficulty": "Intermediate",
            "duration": "3-4 minutes"
        },
        {
            "id": "public_disturbance",
            "title": "Public Disturbance",
            "description": "De-escalate a situation in a public space",
            "difficulty": "Advanced",
            "duration": "4-5 minutes"
        }
    ]
    return {"scenarios": scenarios}

# Backward compatibility endpoint (mimics old iacai system)
@app.post("/api/legacy/process")
async def legacy_process_endpoint(
    audio: Optional[UploadFile] = Form(None),
    message: Optional[str] = Form(None),
    instructions: Optional[str] = Form("You are a helpful assistant, specializing in providing feedback for online training courses"),
    temperature: Optional[float] = Form(0.5),
    model: Optional[str] = Form("gpt-4"),
    response_type: Optional[str] = Form("text"),
    voice: Optional[str] = Form("echo")
):
    """
    Legacy endpoint for backward compatibility with the old iacai system.
    This endpoint processes audio/text and returns AI responses in the same format.
    """
    from fastapi import HTTPException
    
    try:
        # Process audio if provided
        if audio:
            # For now, we'll use a simplified approach since we don't have FFmpeg
            # In production, you might want to add audio processing capabilities
            if not message:
                message = "Audio recording provided (transcription not available in real-time mode)"
        
        # Ensure we have a message to process
        if not message:
            raise HTTPException(status_code=400, detail="No message or audio content to process")
        
        # Create a mock response that mimics the old system
        # In a real implementation, you'd connect to the real-time AI service
        mock_response = f"AI response to: {message}"
        
        # Generate audio if requested
        base64_audio = ""
        if response_type == "audio":
            # In a real implementation, you'd generate audio here
            # For now, we'll return a placeholder
            base64_audio = "base64_placeholder_for_audio"
        
        return {
            "success": True,
            "response": mock_response,
            "audio": base64_audio,
            "message": message,
            "note": "This is a legacy compatibility endpoint. For real-time AI, use the WebSocket connection."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.get("/", response_class=HTMLResponse)
async def read_root():
    """Serve a simple welcome page for the API."""
    server_env = os.getenv("SERVER_ENV", "dev").lower()
    server_port = os.getenv("SERVER_PORT", "8000")
    
    # Set WebSocket URL based on environment
    if server_env == "prod":
        # Check if we're on DigitalOcean App Platform
        host = os.getenv("HOST", "ai.iaclearning.com")
        if "ondigitalocean.app" in host:
            # Use WSS for DigitalOcean App Platform
            ws_url = f"wss://{host}/api/ws/speech"
        else:
            # Use WS for custom domain
            ws_url = f"ws://{host}:{server_port}/api/ws/speech"
        env_badge = "🚀 PRODUCTION"
        env_color = "#28a745"
    else:
        ws_url = f"ws://localhost:{server_port}/api/ws/speech"
        env_badge = "🔧 DEVELOPMENT"
        env_color = "#ffc107"
    
    return HTMLResponse(
        content=f"""
        <html>
            <head>
                <title>IAC Realtime AI - De-escalation Training</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 40px; text-align: center; }}
                    h1 {{ color: #333; }}
                    p {{ color: #666; }}
                    .endpoint {{ background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }}
                    .env-badge {{ background: {env_color}; color: white; padding: 5px 10px; border-radius: 15px; font-size: 0.8em; }}
                </style>
            </head>
            <body>
                <h1>🚀 IAC Realtime AI</h1>
                <p>De-escalation Training System</p>
                <div class="env-badge">{env_badge}</div>
                <br>
                <div class="endpoint">
                    <strong>WebSocket Endpoint:</strong> {ws_url}
                </div>
                <div class="endpoint">
                    <strong>Health Check:</strong> <a href="/health">/health</a>
                </div>
                <p><em>This system is designed to integrate with Articulate Storyline courses.</em></p>
            </body>
        </html>
        """,
        status_code=200
    )

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    server_env = os.getenv("SERVER_ENV", "dev").lower()
    server_port = os.getenv("SERVER_PORT", "8000")
    host = os.getenv("HOST", "localhost")
    
    return {
        "status": "healthy",
        "service": "iac-realtime-ai",
        "environment": server_env,
        "port": server_port,
        "host": host,
        "websocket_protocol": "wss" if server_env == "prod" and "ondigitalocean.app" in host else "ws",
        "openai_key_configured": bool(os.getenv("OPENAI_API_KEY")),
        "cors_mode": "production" if server_env == "prod" else "development"
    }

if __name__ == "__main__":
    import uvicorn
    
    # Check if we should use SSL
    use_ssl = os.getenv("USE_SSL", "false").lower() == "true"
    ssl_keyfile = os.getenv("SSL_KEYFILE", "ssl/key.pem")
    ssl_certfile = os.getenv("SSL_CERTFILE", "ssl/cert.pem")
    
    if use_ssl and os.path.exists(ssl_keyfile) and os.path.exists(ssl_certfile):
        logger.info("Starting with SSL support")
        uvicorn.run(
            app, 
            host="0.0.0.0", 
            port=8000,
            ssl_keyfile=ssl_keyfile,
            ssl_certfile=ssl_certfile
        )
    else:
        logger.info("Starting without SSL support")
        uvicorn.run(app, host="0.0.0.0", port=8000)
