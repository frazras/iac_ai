"""
AWS Lambda function for minting ephemeral OpenAI Realtime API tokens.
No authentication required - public endpoint for testing.
"""

import json
import os
import requests
from datetime import datetime, timedelta
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    Mint ephemeral OpenAI Realtime API tokens for direct browser connection.
    
    This function:
    1. Calls OpenAI API to create ephemeral session
    2. Returns short-lived token safe for browser use
    3. No authentication required (public endpoint)
    """
    
    # Log the request for debugging
    logger.info(f"Token request received: {json.dumps(event, default=str)}")
    
    # CORS headers for browser requests
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Content-Type': 'application/json'
    }
    
    # Handle CORS preflight requests
    if event.get('httpMethod') == 'OPTIONS' or event.get('requestContext', {}).get('http', {}).get('method') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({'message': 'CORS preflight successful'})
        }
    
    try:
        # Get OpenAI API key from environment
        openai_api_key = os.environ.get('OPENAI_API_KEY')
        if not openai_api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set")
        
        # Parse request body for dynamic configuration
        dynamic_config = {}
        if event.get('body'):
            try:
                if isinstance(event['body'], str):
                    dynamic_config = json.loads(event['body'])
                else:
                    dynamic_config = event['body']
                logger.info(f"Received dynamic configuration: {json.dumps(dynamic_config, indent=2)}")
            except (json.JSONDecodeError, TypeError) as e:
                logger.warning(f"Failed to parse request body: {e}")
                dynamic_config = {}
        
        # Build instructions from dynamic configuration
        feedback_instructions = dynamic_config.get('feedbackInstructions', '').strip()
        grade_instructions = dynamic_config.get('gradeInstructions', '').strip()
        
        # Combine instructions with defaults if custom instructions are provided
        if feedback_instructions or grade_instructions:
            instructions = "You are an expert de-escalation training coach.\n\n"
            
            if feedback_instructions:
                instructions += "FEEDBACK INSTRUCTIONS:\n" + feedback_instructions + "\n\n"
            
            if grade_instructions:
                instructions += "GRADING INSTRUCTIONS:\n" + grade_instructions + "\n\n"
            else:
                # Default grading instruction if not provided
                instructions += "CRITICAL: You MUST always include a numerical grade in your response using this exact format:\n"
                instructions += "**Rating: X/10** (where X is a number from 1-10)\n\n"
            
            # Add default coaching framework if no custom feedback instructions
            if not feedback_instructions:
                instructions += """Focus on these key de-escalation skills:
- Tone and voice modulation
- Active listening and empathy  
- Calm and confident demeanor
- Clear communication
- Safety awareness
- Conflict resolution techniques

Always provide constructive feedback that helps users improve their de-escalation skills."""
        else:
            # Use default instructions if no custom ones provided
            instructions = '''You are an expert de-escalation training coach. Your role is to:

1. Listen to the user's de-escalation attempt
2. Provide immediate constructive feedback
3. Grade their performance on a scale of 1-10
4. Offer specific guidance for improvement

Focus on these key de-escalation skills:
- Tone and voice modulation
- Active listening and empathy  
- Calm and confident demeanor
- Clear communication
- Safety awareness
- Conflict resolution techniques

CRITICAL: You MUST always include a numerical grade in your response using this exact format:
**Rating: X/10** (where X is a number from 1-10)

Example response:
"Your approach showed good empathy and calm tone. You maintained good communication throughout.

**Rating: 7/10**

For improvement: Try to be more confident in your delivery and provide specific next steps for the situation."

Always provide constructive feedback that helps users improve their de-escalation skills.'''

        # Get dynamic configuration values with defaults
        feedback_temperature = dynamic_config.get('feedbackTemperature', 0.8)
        feedback_model = dynamic_config.get('feedbackModel', 'gpt-4o-realtime-preview-2024-10-01')
        
        # Ensure temperature is within valid range
        if not isinstance(feedback_temperature, (int, float)) or feedback_temperature < 0 or feedback_temperature > 2:
            feedback_temperature = 0.8
            logger.warning(f"Invalid temperature value, using default: {feedback_temperature}")
        
        # Ensure model is valid for OpenAI Realtime API (speech-to-speech)
        # Only gpt-4o-realtime-preview models support direct speech-to-speech
        supported_realtime_models = [
            'gpt-4o-realtime-preview-2024-10-01',
            'gpt-4o-realtime-preview-2024-12-17',
            'gpt-4o-realtime-preview'  # Generic version (uses latest)
        ]
        
        # Check if the provided model is a Realtime API model
        if feedback_model not in supported_realtime_models:
            # If user provided a non-Realtime model (like gpt-4, gpt-4o, etc.), use default
            original_model = feedback_model
            feedback_model = 'gpt-4o-realtime-preview-2024-10-01'
            logger.warning(f"Model '{original_model}' is not compatible with OpenAI Realtime API (speech-to-speech). Using default: {feedback_model}")
            logger.info("Note: Only gpt-4o-realtime-preview models support direct speech-to-speech functionality")
        
        logger.info(f"Using model: {feedback_model}")
        logger.info(f"Using temperature: {feedback_temperature}")
        logger.info(f"Instructions length: {len(instructions)} characters")
        logger.info("Creating ephemeral session with dynamic configuration...")
        
        response = requests.post(
            'https://api.openai.com/v1/realtime/sessions',
            headers={
                'Authorization': f'Bearer {openai_api_key}',
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'realtime=v1'
            },
            json={
                'model': feedback_model,
                'modalities': ['text', 'audio'],
                'voice': 'alloy',
                'instructions': instructions,
                'input_audio_format': 'pcm16',
                'output_audio_format': 'pcm16',
                'input_audio_transcription': {
                    'model': 'whisper-1'
                },
                'turn_detection': None,  # Manual turn detection for user-controlled start/stop
                'temperature': feedback_temperature,
                'max_response_output_tokens': 4096
            },
            timeout=30  # 30 second timeout
        )
        
        logger.info(f"OpenAI API response status: {response.status_code}")
        
        if response.status_code == 200:
            session_data = response.json()
            logger.info(f"Session created successfully: {session_data.get('id', 'unknown')}")
            
            # Return ephemeral token data with configuration info
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': True,
                    'ephemeralToken': session_data['client_secret']['value'],
                    'sessionId': session_data['id'],
                    'expiresAt': session_data.get('expires_at', int((datetime.now() + timedelta(hours=1)).timestamp())),
                    'model': session_data.get('model', feedback_model),
                    'voice': session_data.get('voice', 'alloy'),
                    'temperature': feedback_temperature,
                    'instructionsLength': len(instructions),
                    'customConfiguration': {
                        'feedbackInstructions': bool(feedback_instructions),
                        'gradeInstructions': bool(grade_instructions),
                        'feedbackTemperature': feedback_temperature,
                        'feedbackModel': feedback_model
                    },
                    'message': 'Ephemeral token created successfully with dynamic configuration'
                })
            }
        else:
            # Log the error response
            error_text = response.text
            logger.error(f"OpenAI API error: {response.status_code} - {error_text}")
            
            return {
                'statusCode': 500,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': False,
                    'error': 'Failed to create OpenAI session',
                    'details': f"OpenAI API returned {response.status_code}",
                    'message': 'Please try again in a few moments'
                })
            }
            
    except requests.exceptions.Timeout:
        logger.error("Request to OpenAI API timed out")
        return {
            'statusCode': 504,
            'headers': cors_headers,
            'body': json.dumps({
                'success': False,
                'error': 'Request timeout',
                'message': 'OpenAI API request timed out, please try again'
            })
        }
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error: {str(e)}")
        return {
            'statusCode': 502,
            'headers': cors_headers,
            'body': json.dumps({
                'success': False,
                'error': 'Network error',
                'message': 'Unable to connect to OpenAI API'
            })
        }
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'success': False,
                'error': 'Internal server error',
                'message': 'An unexpected error occurred'
            })
        }

# Health check endpoint
def health_check():
    """Simple health check for the Lambda function."""
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'status': 'healthy',
            'service': 'openai-token-mint',
            'timestamp': datetime.now().isoformat(),
            'version': '1.0.0'
        })
    }


