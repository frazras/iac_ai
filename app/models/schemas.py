"""
Pydantic models and schemas for the IAC Realtime AI application.
"""

from typing import Optional, Literal
from pydantic import BaseModel, Field


class AudioChunk(BaseModel):
    """Schema for audio data chunks."""
    data: bytes = Field(..., description="Raw audio data")
    format: Optional[str] = Field(default="wav", description="Audio format")
    sample_rate: Optional[int] = Field(default=24000, description="Audio sample rate")


class RealtimeConfig(BaseModel):
    """Configuration for OpenAI Realtime API session."""
    model: str = Field(default="gpt-4o-realtime-preview-2024-10-01", description="Model to use")
    voice: Literal["alloy", "echo", "fable", "onyx", "nova", "shimmer"] = Field(
        default="alloy", description="Voice for speech synthesis"
    )
    input_audio_format: Literal["pcm16", "g711_ulaw", "g711_alaw"] = Field(
        default="pcm16", description="Input audio format"
    )
    output_audio_format: Literal["pcm16", "g711_ulaw", "g711_alaw"] = Field(
        default="pcm16", description="Output audio format"
    )
    input_audio_transcription: Optional[dict] = Field(
        default=None, description="Input audio transcription settings"
    )
    turn_detection: Optional[dict] = Field(
        #default_factory=lambda: {"type": "server_vad", "threshold": 0.5, "prefix_padding_ms": 300, "silence_duration_ms": 200},
        default=None,  # Default to None - no automatic turn detection
        description="Turn detection configuration"
    )
    tools: Optional[list] = Field(default_factory=list, description="Available tools")
    tool_choice: str = Field(default="auto", description="Tool choice strategy")
    temperature: float = Field(default=0.8, description="Response randomness")
    max_response_output_tokens: int = Field(default=4096, description="Max output tokens")
    response_type: Literal["text", "audio"] = Field(
        default="audio", description="Type of response to generate (text only or text + audio)"
    )


class SessionResponse(BaseModel):
    """Response from session creation."""
    session_id: str = Field(..., description="Unique session identifier")
    status: str = Field(..., description="Session status")


class ErrorResponse(BaseModel):
    """Error response schema."""
    error: str = Field(..., description="Error message")
    details: Optional[str] = Field(default=None, description="Additional error details")
    code: Optional[str] = Field(default=None, description="Error code")
