"""
WebSocket endpoints for real-time speech-to-speech communication.
This module handles WebSocket connections from clients and manages
the communication bridge to OpenAI's Realtime API.
"""

import asyncio
import json
import logging
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState

from app.services.openai_service import OpenAIRealtimeService, create_openai_service
from app.models.schemas import RealtimeConfig, ErrorResponse

logger = logging.getLogger(__name__)

router = APIRouter()

# Connection manager to track active WebSocket connections
class ConnectionManager:
    """Manages WebSocket connections and their associated OpenAI services."""
    
    def __init__(self):
        self.active_connections: Dict[WebSocket, OpenAIRealtimeService] = {}
        self.connection_tasks: Dict[WebSocket, Set[asyncio.Task]] = {}
    
    async def connect(self, websocket: WebSocket, config: RealtimeConfig = None):
        """Accept WebSocket connection and create OpenAI service."""
        await websocket.accept()
        
        try:
            # Create OpenAI service for this connection
            openai_service = await create_openai_service(config)
            self.active_connections[websocket] = openai_service
            self.connection_tasks[websocket] = set()
            
            logger.info(f"New WebSocket connection established: {websocket.client}")
            return openai_service
            
        except Exception as e:
            logger.error(f"Failed to create OpenAI service: {e}")
            await websocket.close(code=1011, reason="Failed to connect to OpenAI")
            raise
    
    async def disconnect(self, websocket: WebSocket):
        """Clean up WebSocket connection and associated resources."""
        if websocket in self.active_connections:
            # Cancel all tasks for this connection
            if websocket in self.connection_tasks:
                for task in self.connection_tasks[websocket]:
                    if not task.done():
                        task.cancel()
                        try:
                            await task
                        except asyncio.CancelledError:
                            pass
                del self.connection_tasks[websocket]
            
            # Disconnect from OpenAI
            openai_service = self.active_connections[websocket]
            await openai_service.disconnect()
            del self.active_connections[websocket]
            
            logger.info(f"WebSocket connection cleaned up: {websocket.client}")
    
    def get_service(self, websocket: WebSocket) -> OpenAIRealtimeService:
        """Get OpenAI service for a WebSocket connection."""
        return self.active_connections.get(websocket)
    
    def add_task(self, websocket: WebSocket, task: asyncio.Task):
        """Add a task to be tracked for a connection."""
        if websocket in self.connection_tasks:
            self.connection_tasks[websocket].add(task)


# Global connection manager
manager = ConnectionManager()


@router.websocket("/ws/speech")
async def websocket_speech_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time speech-to-speech communication.
    
    This endpoint:
    1. Accepts WebSocket connections from clients
    2. Creates an OpenAI Realtime API connection
    3. Streams audio data bidirectionally
    4. Handles connection lifecycle and cleanup
    """
    openai_service = None
    
    try:
        # Accept connection and create OpenAI service
        openai_service = await manager.connect(websocket)
        
        # Create task to listen for OpenAI responses
        def audio_response_handler(audio_data: bytes):
            """Handle audio responses from OpenAI and send to client."""
            if websocket.client_state == WebSocketState.CONNECTED:
                try:
                    # Schedule the coroutine to run in the event loop
                    asyncio.create_task(websocket.send_bytes(audio_data))
                    logger.info(f"Sent audio response to client: {len(audio_data)} bytes")
                except Exception as e:
                    logger.error(f"Failed to send audio to client: {e}")
        
        # Start listening for OpenAI responses in background
        response_task = asyncio.create_task(
            openai_service.listen_for_responses(audio_response_handler)
        )
        manager.add_task(websocket, response_task)
        
        # Variables for buffering audio
        audio_buffer = bytearray()
        buffer_size_threshold = 4800  # ~200ms of audio at 24kHz
        min_buffer_size = 2400  # ~100ms minimum for OpenAI (as per API requirements)
        silence_timeout = 0.5  # seconds - reduced for faster response
        last_audio_time = asyncio.get_event_loop().time()
        commit_counter = 0  # Track chunks sent for periodic commits
        last_commit_time = 0  # Prevent rapid commits
        min_commit_interval = 1.0  # Minimum 1 second between commits
        
        # Training feedback tracking
        last_feedback_time = 0
        feedback_interval = 2.0  # Send feedback every 2 seconds
        
        # Main message handling loop
        while True:
            try:
                # Wait for message from client
                message = await websocket.receive()
                
                if "bytes" in message:
                    # Handle binary audio data (raw PCM16 from client)
                    audio_data = message["bytes"]
                    current_time = asyncio.get_event_loop().time()
                    
                    logger.debug(f"Received audio chunk: {len(audio_data)} bytes")
                    
                    if audio_data and len(audio_data) > 0:
                        # Add to buffer
                        audio_buffer.extend(audio_data)
                        last_audio_time = current_time
                        
                        logger.debug(f"Buffer size: {len(audio_buffer)} bytes (threshold: {buffer_size_threshold})")
                        
                        # Send buffered audio if threshold reached
                        if len(audio_buffer) >= buffer_size_threshold:
                            logger.info(f"Sending audio buffer: {len(audio_buffer)} bytes")
                            await openai_service.send_audio_chunk(bytes(audio_buffer))
                            audio_buffer.clear()
                            commit_counter += 1
                            logger.debug(f"Audio chunks sent: {commit_counter} (no auto-commit)")
                    
                    # No automatic commits during recording - only send audio chunks
                    # User must manually stop recording to trigger AI response
                
                elif "text" in message:
                    # Handle text messages (for configuration, etc.)
                    try:
                        text_data = message["text"]
                        command = json.loads(text_data)
                        
                        if command.get("type") == "commit_audio":
                            # Manual commit trigger
                            if len(audio_buffer) > 0:
                                await openai_service.send_audio_chunk(bytes(audio_buffer))
                                audio_buffer.clear()
                            await openai_service.commit_audio_buffer()
                            
                        elif command.get("type") == "configure":
                            # Handle configuration updates (if needed)
                            logger.info("Configuration update requested")
                            
                        elif command.get("type") == "get_feedback":
                            # Send current grading and feedback to client
                            current_time = asyncio.get_event_loop().time()
                            if current_time - last_feedback_time > feedback_interval:
                                # Get current feedback data
                                grade = openai_service.get_last_grade()
                                feedback = openai_service.get_last_full_response()
                                full_response = openai_service.get_last_full_response()
                                
                                logger.info(f"📊 Feedback request - Grade: {grade}, Feedback: {feedback[:100] if feedback else 'None'}...")
                                
                                # If no feedback available, just log it (the transcript processing handles this)
                                if not feedback and not grade:
                                    logger.info("📝 No feedback available yet, waiting for transcript processing...")
                                
                                feedback_data = {
                                    "type": "training_feedback",
                                    "grade": grade,
                                    "feedback": feedback,
                                    "full_response": full_response
                                }
                                await websocket.send_text(json.dumps(feedback_data))
                                last_feedback_time = current_time
                                logger.info("✅ Sent training feedback to client")
                            else:
                                logger.info(f"⏰ Feedback rate limited - next available in {feedback_interval - (current_time - last_feedback_time):.1f}s")
                            
                    except json.JSONDecodeError:
                        logger.warning(f"Invalid JSON received: {text_data}")
                        
            except WebSocketDisconnect:
                logger.info("Client disconnected")
                break
            except Exception as e:
                logger.error(f"Error handling WebSocket message: {e}")
                # Send error to client if possible
                if websocket.client_state == WebSocketState.CONNECTED:
                    error_response = ErrorResponse(
                        error="Internal server error",
                        details=str(e)
                    )
                    await websocket.send_text(error_response.json())
                break
    
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    
    finally:
        # Clean up connection
        await manager.disconnect(websocket)


@router.websocket("/ws/test")
async def websocket_test_endpoint(websocket: WebSocket):
    """
    Simple test WebSocket endpoint for development and debugging.
    Echoes back received messages without OpenAI integration.
    """
    await websocket.accept()
    
    try:
        while True:
            message = await websocket.receive()
            
            if "bytes" in message:
                # Echo back audio data
                await websocket.send_bytes(message["bytes"])
            elif "text" in message:
                # Echo back text data
                await websocket.send_text(f"Echo: {message['text']}")
                
    except WebSocketDisconnect:
        logger.info("Test client disconnected")
    except Exception as e:
        logger.error(f"Test WebSocket error: {e}")


@router.get("/ws/health")
async def websocket_health():
    """Health check for WebSocket service."""
    return {
        "status": "healthy",
        "active_connections": len(manager.active_connections),
        "service": "websocket-handler"
    }
