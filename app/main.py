"""
Main FastAPI application for real-time speech-to-speech communication.
This application provides WebSocket endpoints for streaming audio data to and from OpenAI's Realtime API.
"""

import os
import logging
from fastapi import FastAPI, Request, UploadFile, Form
from fastapi.staticfiles import StaticFiles
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

# Configure CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
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

# Mount static files with cache-busting headers
from fastapi.responses import FileResponse
import os

@app.get("/static/{filename:path}")
async def serve_static(filename: str):
    """Serve static files with cache-busting headers."""
    file_path = f"app/static/{filename}"
    if os.path.exists(file_path):
        return FileResponse(
            file_path,
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
    return {"error": "File not found"}, 404

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def read_root():
    """Serve the main HTML page."""
    try:
        with open("app/static/index.html", "r") as f:
            html_content = f.read()
        return HTMLResponse(content=html_content, status_code=200)
    except FileNotFoundError:
        return HTMLResponse(
            content="<h1>Welcome to IAC Realtime AI</h1><p>Static files not found. Please ensure the static directory exists.</p>",
            status_code=200
        )

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "iac-realtime-ai",
        "openai_key_configured": bool(os.getenv("OPENAI_API_KEY"))
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
