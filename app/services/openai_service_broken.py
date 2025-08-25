"""
OpenAI Realtime API service for handling speech-to-speech communication.
This service manages WebSocket connections to OpenAI's Realtime API and handles
audio streaming in both directions.
"""

import asyncio
import json
import os
import logging
import base64
from typing import Optional, AsyncGenerator, Callable
import websockets
from websockets.exceptions import ConnectionClosed, WebSocketException

from app.models.schemas import RealtimeConfig

logger = logging.getLogger(__name__)


class OpenAIRealtimeService:
    """Service for managing OpenAI Realtime API connections."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key is required")
        
        self.websocket_url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"
        self.websocket: Optional[websockets.WebSocketServerProtocol] = None
        self.session_id: Optional[str] = None
        self.is_connected = False
        
    async def connect(self, config: Optional[RealtimeConfig] = None) -> bool:
        """
        Connect to OpenAI Realtime API WebSocket.
        
        Args:
            config: Configuration for the realtime session
            
        Returns:
            bool: True if connection successful
        """
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "OpenAI-Beta": "realtime=v1"
            }
            
            logger.info(f"Connecting to OpenAI Realtime API: {self.websocket_url}")
            self.websocket = await websockets.connect(
                self.websocket_url,
                extra_headers=headers,
                ping_interval=20,
                ping_timeout=10
            )
            
            # Store config for later use after session creation
            self.config = config
            
            # Wait for session creation before configuring
            # The session configuration will be sent in the session.created event handler
            
            # Add fallback timer in case session creation event doesn't come
            async def fallback_config():
                await asyncio.sleep(2)  # Wait 2 seconds
                if not hasattr(self, 'session_id'):
                    logger.warning("⚠️ Session creation event not received, sending configuration anyway...")
            if config:
                await self._configure_session(config)
            else:
                default_config = RealtimeConfig()
                await self._configure_session(default_config)
            
            asyncio.create_task(fallback_config())
            
            self.is_connected = True
            logger.info("Successfully connected to OpenAI Realtime API - waiting for session creation...")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to OpenAI Realtime API: {e}")
            self.is_connected = False
            return False
    
    async def _configure_session(self, config: RealtimeConfig):
        """Configure the realtime session with the given parameters."""
        
        # Enhanced instructions for de-escalation training
        deescalation_instructions = """
        You are an expert de-escalation training coach. Your role is to:
        
        1. **Listen and Assess**: Analyze the user's de-escalation approach
        2. **Provide Immediate Feedback**: Give real-time coaching during their response
        3. **Grade Performance**: Evaluate their technique on a scale of 1-100
        4. **Offer Specific Guidance**: Point out strengths and areas for improvement
        5. **Maintain Professional Tone**: Be encouraging but direct in your feedback
        
        Focus on these key de-escalation skills:
        - Tone and voice modulation
        - Active listening and empathy
        - Calm and confident demeanor
        - Clear communication
        - Safety awareness
        - Conflict resolution techniques
        
        Always provide constructive feedback that helps users improve their skills.
        """
        
        # Determine response modalities based on config
        response_modalities = ["text"]  # Always include text for accessibility and feedback
        if config and hasattr(config, 'response_type'):
            if config.response_type == 'audio':
                response_modalities.append("audio")
        else:
            # Default to both text and audio for full experience
            response_modalities.append("audio")
        
        # Store modalities for use in response creation
        self.session_modalities = response_modalities
        
        session_update = {
            "type": "session.update",
            "session": {
                "modalities": response_modalities,
                "instructions": deescalation_instructions,
                "voice": config.voice if config else "alloy",
                "input_audio_format": config.input_audio_format if config else "pcm16",
                "output_audio_format": config.output_audio_format if config else "pcm16",
                "input_audio_transcription": config.input_audio_transcription,
                "turn_detection": config.turn_detection if config else None,
                "tools": config.tools if config else [],
                "tool_choice": config.tool_choice if config else "auto",
                "temperature": config.temperature if config else 0.8,
                "max_response_output_tokens": config.max_response_output_tokens if config else 4096
            }
        }
        
        await self.websocket.send(json.dumps(session_update))
        logger.info(f"🎯 De-escalation training session configured with modalities: {response_modalities}")
        logger.info(f"🎯 Session instructions: {deescalation_instructions[:100]}...")
        logger.info(f"🎯 Full session config: {json.dumps(session_update, indent=2)}")
        logger.info(f"🎯 Session modalities explicitly set to: {response_modalities}")
        logger.info(f"🎯 Instructions length: {len(deescalation_instructions)} characters")
    
    async def disconnect(self):
        """Disconnect from OpenAI Realtime API."""
        if self.websocket and not self.websocket.closed:
            await self.websocket.close()
            logger.info("Disconnected from OpenAI Realtime API")
        self.is_connected = False
    
    async def send_audio_chunk(self, audio_data: bytes):
        """
        Send audio chunk to OpenAI Realtime API.
        
        Args:
            audio_data: Raw PCM16 audio data bytes
        """
        if not self.is_connected or not self.websocket:
            raise ConnectionError("Not connected to OpenAI Realtime API")
        
        try:
            # Convert audio data to base64
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')
            
            # Create audio input event
            audio_event = {
                "type": "input_audio_buffer.append",
                "audio": audio_base64
            }
            
            logger.info(f"🎵 Sending audio to OpenAI: {len(audio_data)} bytes -> {len(audio_base64)} base64 chars")
            await self.websocket.send(json.dumps(audio_event))
            logger.debug(f"Audio event sent successfully")
            
        except Exception as e:
            logger.error(f"Failed to send audio chunk: {e}")
            raise
    
    async def commit_audio_buffer(self):
        """Commit the audio buffer to trigger response generation."""
        if not self.is_connected or not self.websocket:
            raise ConnectionError("Not connected to OpenAI Realtime API")
        
        try:
            # Check if we already have an active response
            if hasattr(self, 'has_active_response') and self.has_active_response:
                logger.info("⏳ Response already in progress, skipping commit")
                return
                
            commit_event = {
                "type": "input_audio_buffer.commit"
            }
            await self.websocket.send(json.dumps(commit_event))
            
            # Mark that we have an active response
            self.has_active_response = True
            logger.info("📤 Audio buffer committed, waiting for response...")
            
            # Set a timeout to reset the flag if no response comes
            async def reset_timeout():
                await asyncio.sleep(10)  # Wait 10 seconds
                if self.has_active_response:
                    logger.warning("⏰ Response timeout - resetting active response flag")
                    self.has_active_response = False
            
            asyncio.create_task(reset_timeout())
            
        except Exception as e:
            logger.error(f"Failed to commit audio buffer: {e}")
            raise
    
    async def listen_for_responses(self, audio_callback: Callable[[bytes], None]):
        """
        Listen for responses from OpenAI Realtime API.
        
        Args:
            audio_callback: Callback function to handle received audio data
        """
        if not self.is_connected or not self.websocket:
            raise ConnectionError("Not connected to OpenAI Realtime API")
        
        try:
            async for message in self.websocket:
                try:
                    event = json.loads(message)
                    await self._handle_event(event, audio_callback)
                except json.JSONDecodeError:
                    logger.warning(f"Received non-JSON message: {message}")
                except Exception as e:
                    logger.error(f"Error handling event: {e}")
                    
        except ConnectionClosed:
            logger.info("OpenAI WebSocket connection closed")
            self.is_connected = False
        except WebSocketException as e:
            logger.error(f"WebSocket error: {e}")
            self.is_connected = False
        except Exception as e:
            logger.error(f"Unexpected error in listen_for_responses: {e}")
            self.is_connected = False
    
    async def _handle_event(self, event: dict, audio_callback: Callable[[bytes], None]):
        """Handle events received from OpenAI Realtime API."""
        try:
        event_type = event.get("type")
        
            # Debug: Log every event that reaches this method
            logger.info(f"🔍 === EVENT HANDLER ENTRY ===")
            logger.info(f"🔍 Event type: {event_type}")
            logger.info(f"🔍 Event keys: {list(event.keys())}")
            
            # Track events for debugging
            if not hasattr(self, 'event_count'):
                self.event_count = {}
            self.event_count[event_type] = self.event_count.get(event_type, 0) + 1
            
            # Log all events for debugging
            logger.info(f"📨 === RECEIVED OPENAI EVENT #{self.event_count[event_type]} ===")
            logger.info(f"📨 Event type: {event_type}")
            logger.info(f"📨 Event data: {json.dumps(event, indent=2)}")
            logger.info(f"📨 === END EVENT LOG ===")
            
            # Handle transcript events FIRST (before other handlers)
            if event_type == "response.audio_transcript.delta":
                logger.info(f"📝 === TRANSCRIPT DELTA HANDLER EXECUTED ===")
                transcript_delta = event.get("delta")
                if transcript_delta:
                    logger.info(f"📝 Transcript delta: {transcript_delta}")
                    # Store transcript for later analysis
                    if not hasattr(self, 'current_transcript'):
                        self.current_transcript = ""
                    self.current_transcript += transcript_delta
                    logger.info(f"📝 Current transcript so far: {self.current_transcript}")
                else:
                    logger.warning("📝 No delta in transcript event")
                return
                    
            elif event_type == "response.audio_transcript.done":
                logger.info(f"📝 === TRANSCRIPT DONE HANDLER EXECUTED ===")
                transcript = event.get("transcript")
                if transcript:
                    logger.info(f"📝 === COMPLETE TRANSCRIPT RECEIVED ===")
                    logger.info(f"📝 Transcript: {transcript}")
                    # Extract feedback from the transcript
                    await self._extract_training_feedback(transcript)
                    logger.info(f"📝 === TRANSCRIPT PROCESSING COMPLETE ===")
                else:
                    logger.warning("📝 No transcript in done event")
                                                return
        
        if event_type == "session.created":
            self.session_id = event.get("session", {}).get("id")
                logger.info(f"🎯 Session created with ID: {self.session_id}")
                # Send session configuration after creation
                if hasattr(self, 'config') and self.config:
                    logger.info(f"🎯 Sending session configuration with modalities: {self.session_modalities}")
                    await self._configure_session(self.config)
                else:
                    # Use default configuration
                    logger.info("🎯 Using default session configuration")
                    default_config = RealtimeConfig()
                    await self._configure_session(default_config)
            
        elif event_type == "session.updated":
            logger.info("✅ Session configuration updated successfully")
            # Log the updated session details
            session_data = event.get("session", {})
            logger.info(f"🎯 Session details: {json.dumps(session_data, indent=2)}")
            
        elif event_type == "input_audio_buffer.committed":
            logger.debug("Audio buffer committed")
            
        elif event_type == "input_audio_buffer.speech_started":
            logger.debug("Speech started")
            
        elif event_type == "input_audio_buffer.speech_stopped":
            logger.debug("Speech stopped")
            
        elif event_type == "response.audio.delta":
            # Handle audio response chunks
            audio_base64 = event.get("delta")
            if audio_base64:
                try:
                    audio_data = base64.b64decode(audio_base64)
                    logger.info(f"🎵 Received audio delta: {len(audio_data)} bytes")
                    audio_callback(audio_data)
                except Exception as e:
                    logger.error(f"Failed to decode audio response: {e}")
                    
        elif event_type == "response.audio_transcript.delta":
            # Handle audio transcript deltas (what OpenAI is actually saying)
            logger.info(f"📝 === TRANSCRIPT DELTA HANDLER EXECUTED ===")
            transcript_delta = event.get("delta")
            if transcript_delta:
                logger.info(f"📝 Transcript delta: {transcript_delta}")
                # Store transcript for later analysis
                if not hasattr(self, 'current_transcript'):
                    self.current_transcript = ""
                self.current_transcript += transcript_delta
                logger.info(f"📝 Current transcript so far: {self.current_transcript}")
            else:
                logger.warning("📝 No delta in transcript event")
                
        elif event_type == "response.audio_transcript.done":
            # Handle completed audio transcript
            logger.info(f"📝 === TRANSCRIPT DONE HANDLER EXECUTED ===")
            transcript = event.get("transcript")
            if transcript:
                logger.info(f"📝 === COMPLETE TRANSCRIPT RECEIVED ===")
                logger.info(f"📝 Transcript: {transcript}")
                # Extract feedback from the transcript
                await self._extract_training_feedback(transcript)
                logger.info(f"📝 === TRANSCRIPT PROCESSING COMPLETE ===")
            else:
                logger.warning("📝 No transcript in done event")
                    
        elif event_type == "response.audio.done":
            logger.info("🎵 === AUDIO RESPONSE COMPLETE ===")
            # Audio response is complete, transcript should follow
            logger.info("🎵 Waiting for transcript to extract feedback...")
            
        elif event_type == "response.audio.format":
            # Log the audio format being used
            audio_format = event.get("format", "unknown")
            logger.info(f"🎵 OpenAI audio format: {audio_format}")
            
        elif event_type == "response.text.delta":
            # Handle text response chunks for grading and feedback extraction
            text_delta = event.get("delta")
            if text_delta:
                logger.info(f"📝 Text response delta: {text_delta}")
                # Store text for later analysis
                if not hasattr(self, 'current_response_text'):
                    self.current_response_text = ""
                self.current_response_text += text_delta
                
        elif event_type == "response.text.done":
            logger.info("📝 Text response complete")
            # Extract grading and feedback from complete text response
            if hasattr(self, 'current_response_text') and self.current_response_text:
                logger.info(f"📝 Full text response: {self.current_response_text}")
                await self._extract_training_feedback(self.current_response_text)
                self.current_response_text = ""
                
        elif event_type == "response.done":
            logger.info("✅ Complete response finished")
            # Reset active response flag
            self.has_active_response = False
            # Final cleanup if needed
            if hasattr(self, 'current_response_text') and self.current_response_text:
                logger.info(f"📝 Processing remaining text: {self.current_response_text}")
                await self._extract_training_feedback(self.current_response_text)
                self.current_response_text = ""
            
        elif event_type == "error":
            error_msg = event.get("error", {})
            logger.error(f"OpenAI API error: {error_msg}")
            
        else:
            # Handle any other event types that might contain transcript data
            if "transcript" in event:
                logger.info(f"🔍 Found transcript data in {event_type} event")
                transcript = event.get("transcript")
                if transcript:
                    logger.info(f"📝 === EXTRACTING TRANSCRIPT FROM {event_type} ===")
                    logger.info(f"📝 Transcript: {transcript}")
                    await self._extract_training_feedback(transcript)
                    logger.info(f"📝 === TRANSCRIPT EXTRACTION COMPLETE ===")
            else:
                # Try to capture transcript from any event structure
                transcript_captured = await self._capture_transcript_from_event(event)
                if not transcript_captured:
                    logger.info(f"🔍 Unhandled event type: {event_type} - Full event: {event}")

    async def _request_text_feedback(self):
        """Explicitly request text feedback from OpenAI for grading and feedback extraction."""
        try:
            if not self.is_connected or not self.websocket:
                logger.warning("Cannot request text feedback - not connected")
                return
                
            logger.info("📝 === TEXT FEEDBACK REQUEST STARTED ===")
            
            # Create a text-only response request
            text_response_event = {
                "type": "response.create",
                "response": {
                    "modalities": ["text"],
                    "input_audio_transcription": {
                        "type": "text",
                        "text": "Please provide a brief assessment and grade for the de-escalation training session. Include a grade (1-10) and specific feedback on strengths and areas for improvement."
                    }
                }
            }
            
            logger.info(f"📝 Requesting text feedback from OpenAI with event: {json.dumps(text_response_event, indent=2)}")
            await self.websocket.send(json.dumps(text_response_event))
            logger.info("📝 === TEXT FEEDBACK REQUEST SENT ===")
            
        except Exception as e:
            logger.error(f"Failed to request text feedback: {e}")
            logger.error(f"Exception details: {type(e).__name__}: {str(e)}")
    
    async def _create_response_manually(self):
        """Manually create a response if the automatic flow fails."""
        try:
            if not self.is_connected or not self.websocket:
                logger.warning("Cannot create response manually - not connected")
                return
                
            # Create a response with both text and audio modalities
            response_event = {
                "type": "response.create",
                "response": {
                    "modalities": ["text", "audio"]
                }
            }
            
            logger.info("🔄 Manually creating response with text and audio modalities...")
            await self.websocket.send(json.dumps(response_event))
            
        except Exception as e:
            logger.error(f"Failed to create response manually: {e}")
    
    async def _check_session_status(self):
        """Check the current session status and force reconfiguration if needed."""
        try:
            if not self.is_connected or not self.websocket:
                return False
                
            # Send a session status check
            status_event = {
                "type": "session.get"
            }
            
            logger.info("🔍 Checking session status...")
            await self.websocket.send(json.dumps(status_event))
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to check session status: {e}")
            return False
    
    async def _force_session_reconfiguration(self):
        """Force a session reconfiguration to ensure both modalities are enabled."""
        try:
            if not self.is_connected or not self.websocket:
                return False
                
            logger.warning("⚠️ Forcing session reconfiguration...")
            
            # Re-send the session configuration
            if hasattr(self, 'config') and self.config:
                await self._configure_session(self.config)
            else:
                default_config = RealtimeConfig()
                await self._configure_session(default_config)
                
            return True
            
        except Exception as e:
            logger.error(f"Failed to force session reconfiguration: {e}")
            return False
    
    async def _extract_training_feedback(self, response_text: str):
        """Extract grading and feedback from the AI's response."""
        try:
            logger.info(f"🔍 === EXTRACTING FEEDBACK FROM TRANSCRIPT ===")
            logger.info(f"🔍 Transcript text: {response_text[:200]}...")
            
            # Look for grading patterns in the response
            import re
            
            # Extract grade if present (e.g., "85/100", "Grade: 90", etc.)
            grade_patterns = [
                r'(\d{1,3})/?100?',  # 85/100, 90, etc.
                r'grade[:\s]*(\d{1,3})',  # Grade: 85
                r'score[:\s]*(\d{1,3})',  # Score: 85
                r'(\d{1,3})%',  # 85%
                r'(\d{1,3})\s*out\s*of\s*100',  # 85 out of 100
            ]
            
            grade = None
            for pattern in grade_patterns:
                grade_match = re.search(pattern, response_text.lower())
                if grade_match:
                    grade = grade_match.group(1) or grade_match.group(2)
                    break
            
            if grade:
                self.last_grade = int(grade)
                logger.info(f"📊 Extracted grade: {self.last_grade}/100")
            else:
                # If no explicit grade, estimate based on positive/negative language
                positive_words = ['good', 'great', 'excellent', 'well', 'strong', 'effective', 'helpful', 'approachable']
                negative_words = ['poor', 'weak', 'ineffective', 'unhelpful', 'unapproachable', 'bad']
                
                positive_count = sum(1 for word in positive_words if word in response_text.lower())
                negative_count = sum(1 for word in negative_words if word in response_text.lower())
                
                if positive_count > negative_count:
                    estimated_grade = min(85, 70 + (positive_count * 5))
                    self.last_grade = estimated_grade
                    logger.info(f"📊 Estimated grade based on positive feedback: {estimated_grade}/100")
                else:
                    self.last_grade = 60
                    logger.info(f"📊 Estimated grade based on mixed feedback: 60/100")
            
            # For coaching transcripts, use the entire response as feedback
            self.last_feedback = response_text
            logger.info(f"💡 Using full transcript as feedback: {len(response_text)} characters")
            
            # Store full response for reference
            self.last_full_response = response_text
            
            logger.info(f"✅ === FEEDBACK EXTRACTION COMPLETE ===")
            logger.info(f"✅ Grade: {self.last_grade}, Feedback length: {len(self.last_feedback)}")
            
        except Exception as e:
            logger.error(f"Error extracting training feedback: {e}")
            # Set defaults on error
            self.last_grade = 70  # Default passing grade
            self.last_feedback = response_text
            self.last_full_response = response_text

    async def _capture_transcript_from_event(self, event: dict):
        """Capture transcript data from any event that contains it."""
        try:
            event_type = event.get("type")
            
            # Check if this event contains transcript data
            if "transcript" in event:
                transcript = event.get("transcript")
                if transcript:
                    logger.info(f"📝 === CAPTURED TRANSCRIPT FROM {event_type} ===")
                    logger.info(f"📝 Transcript: {transcript}")
                    # Extract feedback from the transcript
                    await self._extract_training_feedback(transcript)
                    logger.info(f"📝 === TRANSCRIPT CAPTURE COMPLETE ===")
                    return True
                    
            # Check for transcript in nested structures
            if "part" in event and isinstance(event["part"], dict):
                part = event["part"]
                if "transcript" in part:
                    transcript = part["transcript"]
                    if transcript:
                        logger.info(f"📝 === CAPTURED TRANSCRIPT FROM {event_type}.part ===")
                        logger.info(f"📝 Transcript: {transcript}")
                        await self._extract_training_feedback(transcript)
                        logger.info(f"📝 === TRANSCRIPT CAPTURE COMPLETE ===")
                        return True
                        
            # Check for transcript in content arrays
            if "content" in event and isinstance(event["content"], list):
                for content_item in event["content"]:
                    if isinstance(content_item, dict) and "transcript" in content_item:
                        transcript = content_item["transcript"]
                        if transcript:
                            logger.info(f"📝 === CAPTURED TRANSCRIPT FROM {event_type}.content ===")
                            logger.info(f"📝 Transcript: {transcript}")
                            await self._extract_training_feedback(transcript)
                            logger.info(f"📝 === TRANSCRIPT CAPTURE COMPLETE ===")
                            return True
                            
            return False
            
        except Exception as e:
            logger.error(f"Error capturing transcript from event: {e}")
            return False

    def get_last_grade(self) -> Optional[int]:
        """Get the last extracted grade."""
        return getattr(self, 'last_grade', None)
    
    def get_last_feedback(self) -> Optional[str]:
        """Get the last extracted feedback."""
        return getattr(self, 'last_feedback', None)
    
    def get_last_full_response(self) -> Optional[str]:
        """Get the last full response text."""
        return getattr(self, 'last_full_response', None)


async def create_openai_service(config: Optional[RealtimeConfig] = None) -> OpenAIRealtimeService:
    """
    Factory function to create and connect OpenAI Realtime service.
    
    Args:
        config: Optional configuration for the service
        
    Returns:
        Connected OpenAI Realtime service instance
    """
    service = OpenAIRealtimeService()
    
    if await service.connect(config):
        return service
    else:
        raise ConnectionError("Failed to connect to OpenAI Realtime API")
