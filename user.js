/**
 * Self-contained Storyline user.js with IAC Realtime AI Integration
 * Everything needed for real-time speech-to-speech is included here
 * Version: 3.0 - Cleaned up and optimized
 */

// ============================================================================
// CONFIGURATION - Modify these values for your deployment
// ============================================================================

// AI Service Configuration
const AI_SERVICE_CONFIG = {
    // Token endpoint for getting ephemeral OpenAI tokens
    // PRODUCTION: Use your deployed API Gateway endpoint
    // DEVELOPMENT: Use your local/test API Gateway endpoint
    tokenEndpoint: 'https://99dqeidak0.execute-api.us-east-2.amazonaws.com/token',
    
    // Auto-connect to AI service on page load
    autoConnect: true,
    
    // Enable debug logging (set to false for production)
    debugMode: false
};

// ============================================================================
// PRODUCTION CONFIGURATION EXAMPLE
// ============================================================================
// 
// PRODUCTION CONFIGURATION IS NOW ACTIVE!
//
// Current configuration:
// ✅ tokenEndpoint: 'https://99dqeidak0.execute-api.us-east-2.amazonaws.com/token'
// ✅ autoConnect: true
// ✅ debugMode: false (production ready)
//
// This new architecture connects DIRECTLY to OpenAI for maximum performance!
//
// ============================================================================

// ============================================================================
// DEBUG CONFIGURATION
// ============================================================================

// Debug logging utility
const debug = {
    log: (...args) => AI_SERVICE_CONFIG.debugMode && console.log('🔍 DEBUG:', ...args),
    error: (...args) => AI_SERVICE_CONFIG.debugMode && console.error('🔍 DEBUG ERROR:', ...args),
    warn: (...args) => AI_SERVICE_CONFIG.debugMode && console.warn('🔍 DEBUG WARN:', ...args)
};

// Direct OpenAI Real-time AI integration class - connects directly to OpenAI
class StorylineRealtimeAI {
    constructor(config = {}) {
        this.config = {
            tokenEndpoint: config.tokenEndpoint || AI_SERVICE_CONFIG.tokenEndpoint,
            autoConnect: config.autoConnect !== false ? AI_SERVICE_CONFIG.autoConnect : false,
            debugMode: config.debugMode !== undefined ? config.debugMode : AI_SERVICE_CONFIG.debugMode,
            ...config
        };
        
        // Direct OpenAI connection
        this.websocket = null;
        this.sessionId = null;
        this.ephemeralToken = null;
        
        // Audio processing
        this.recordingAudioContext = null;
        this.playbackAudioContext = null;
        this.isRecording = false;
        this.isConnected = false;
        this.audioStream = null;
        this.audioProcessor = null;
        this.audioSource = null;
        
        // Playback queue for seamless audio
        this.audioQueue = [];
        this.isPlayingAudio = false;
        this.nextPlayTime = 0;
        
        // Feedback tracking
        this.lastFeedbackReceived = false;
        this.currentGrade = null;
        this.currentFeedback = null;
        this.player = null;
        
        debug.log('StorylineRealtimeAI constructor initialized with direct OpenAI connection');
        
        // Initialize
        this.init();
    }
    
    checkInitialGradeValues() {
        debug.log('Checking initial grade values...');
        
        // Check if Storyline player is available
        if (typeof player !== 'undefined') {
            try {
                const currentGrade = player.GetVar('grade');
                const currentGradeDisplay = player.GetVar('gradeDisplay');
                debug.log('Initial grade variable value:', currentGrade);
                debug.log('Initial gradeDisplay variable value:', currentGradeDisplay);
                
                // Validate and reset invalid grade values from resume sessions
                this.validateAndResetGradeValues(currentGrade, currentGradeDisplay);
                
            } catch (e) {
                debug.log('Could not read initial grade variables:', e.message);
            }
        } else {
            debug.log('Storyline player not available yet');
            // Try again in a moment
            setTimeout(() => this.checkInitialGradeValues(), 1000);
        }
    }
    
    validateAndResetGradeValues(currentGrade, currentGradeDisplay) {
        try {
            debug.log('Validating grade values...');
            
            let needsReset = false;
            let resetReason = '';
            
            // Check if grade is a valid 1-10 value
            if (currentGrade !== null && currentGrade !== undefined && currentGrade !== 'Pending') {
                const gradeNum = parseFloat(currentGrade);
                if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 10) {
                    needsReset = true;
                    resetReason = `Invalid grade value: ${currentGrade} (must be 1-10)`;
                    debug.log('Invalid grade detected:', currentGrade);
                }
            }
            
            // Check if gradeDisplay is properly formatted
            if (currentGradeDisplay && typeof currentGradeDisplay === 'string') {
                if (currentGradeDisplay.includes('60') || currentGradeDisplay.includes('100')) {
                    needsReset = true;
                    resetReason = `Invalid gradeDisplay format: ${currentGradeDisplay}`;
                    debug.log('Invalid gradeDisplay detected:', currentGradeDisplay);
                }
            }
            
            // Reset if needed
            if (needsReset) {
                debug.log('Resetting invalid grade values:', resetReason);
                
                try {
                    // Reset to initial state
                    this.player.SetVar('grade', 'Pending');
                    this.player.SetVar('gradeDisplay', 'Not graded yet');
                    
                    debug.log('Grade variables reset successfully');
                    debug.log('New grade value:', this.player.GetVar('grade'));
                    debug.log('New gradeDisplay value:', this.player.GetVar('gradeDisplay'));
                    
                } catch (e) {
                    debug.log('Could not reset grade variables:', e.message);
                }
            } else {
                debug.log('Grade values are valid, no reset needed');
            }
            
        } catch (error) {
            debug.error('Error validating grade values:', error);
        }
    }

    async init() {
        try {
            console.log('Initializing StorylineRealtimeAI...');
            
            // Check if this is a resume session and handle accordingly
            this.handleResumeSession();
            
            // Check initial grade values
            this.checkInitialGradeValues();
            
            // Auto-connect if enabled
            if (this.config.autoConnect) {
                await this.connect();
            }
            
        } catch (error) {
            console.error('Failed to initialize StorylineRealtimeAI:', error);
        }
    }
    
    handleResumeSession() {
        try {
            debug.log('Checking for resume session...');
            
            // Check if we have a player reference
            if (typeof GetPlayer === 'function') {
                const player = GetPlayer();
                
                // Check for resume-related variables
                try {
                    const hasResumeData = player.GetVar('_playerVars.#hasPrevHistory');
                    const lastSlideViewed = player.GetVar('LastSlideViewed_5uNng21bzCw');
                    
                    debug.log('Resume data check - hasPrevHistory:', hasResumeData);
                    debug.log('Resume data check - lastSlideViewed:', lastSlideViewed);
                    
                    if (hasResumeData === true || lastSlideViewed) {
                        debug.log('Resume session detected - will validate grade data');
                        
                        // Set a flag to indicate this is a resume session
                        this.isResumeSession = true;
                        
                        // Force a delay before checking grades to ensure player is fully ready
                        setTimeout(() => {
                            debug.log('Resume session - delayed grade validation');
                            this.checkInitialGradeValues();
                        }, 2000); // 2 second delay for resume sessions
                        
                    } else {
                        debug.log('Fresh session - no resume data');
                        this.isResumeSession = false;
                    }
                    
                } catch (e) {
                    debug.log('Could not check resume data:', e.message);
                }
            }
            
        } catch (error) {
            debug.error('Error handling resume session:', error);
        }
    }
    
    async connect() {
        try {
            console.log('🔐 Getting ephemeral OpenAI token...');
            
            // Get ephemeral token from our Lambda function
            const tokenResponse = await fetch(this.config.tokenEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!tokenResponse.ok) {
                throw new Error(`Token request failed: ${tokenResponse.status}`);
            }
            
            const tokenData = await tokenResponse.json();
            
            if (!tokenData.success) {
                throw new Error(`Token creation failed: ${tokenData.message}`);
            }
            
            console.log('✅ Ephemeral token received:', tokenData.sessionId);
            this.sessionId = tokenData.sessionId;
            this.ephemeralToken = tokenData.ephemeralToken;
            
            // Initialize WebRTC connection to OpenAI Realtime API
            console.log('🔌 Connecting to OpenAI Realtime API via WebRTC...');
            await this.initializeWebRTC();
            
        } catch (error) {
            console.error('Failed to connect to OpenAI:', error);
            throw error;
        }
    }

    async initializeWebRTC() {
        // Create RTCPeerConnection
        this.peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        // Setup audio elements
        this.setupAudioElements();

        // Create data channel for signaling (manual turn control)
        this.dataChannel = this.peerConnection.createDataChannel('oai-events', {
            ordered: true
        });

        this.dataChannel.onopen = () => {
            console.log('📡 WebRTC data channel opened');
        };

        this.dataChannel.onmessage = (event) => {
            console.log('📨 Received data channel message:', event.data);
            // Handle OpenAI events through data channel
            try {
                const message = JSON.parse(event.data);
                this.handleOpenAIEvent(message);
            } catch (e) {
                console.warn('Failed to parse data channel message:', e);
            }
        };

        // Handle incoming audio stream
        this.peerConnection.ontrack = (event) => {
            console.log('📻 Received remote audio stream');
            if (this.remoteAudio && event.streams[0]) {
                this.remoteAudio.srcObject = event.streams[0];
                this.remoteAudio.play().catch(e => console.warn('Audio play failed:', e));
            }
        };

        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            console.log('🔗 WebRTC connection state:', state);
            
            if (state === 'connected') {
                console.log('✅ Connected to OpenAI Realtime API via WebRTC');
                this.isConnected = true;
                this.configureSession();
            } else if (state === 'disconnected' || state === 'failed') {
                console.log('❌ Disconnected from OpenAI Realtime API');
                this.isConnected = false;
            }
        };

        // Get user media and add to peer connection
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: 24000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                } 
            });
            
            console.log('🎤 Got user media stream');
            this.localStream = stream;
            
            // Add audio track to peer connection
            const audioTrack = stream.getAudioTracks()[0];
            this.peerConnection.addTrack(audioTrack, stream);

            // Create offer
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

            console.log('📤 Sending SDP offer to OpenAI...');

            // Send offer to OpenAI with proper authorization
            const response = await fetch('https://api.openai.com/v1/realtime', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.ephemeralToken}`,
                    'Content-Type': 'application/sdp',
                    'OpenAI-Beta': 'realtime=v1'
                },
                body: offer.sdp
            });

            if (!response.ok) {
                throw new Error(`WebRTC signaling failed: ${response.status} ${response.statusText}`);
            }

            const answerSdp = await response.text();
            console.log('📥 Received SDP answer from OpenAI');

            // Set remote description
            await this.peerConnection.setRemoteDescription({
                type: 'answer',
                sdp: answerSdp
            });

        } catch (error) {
            console.error('WebRTC initialization failed:', error);
            throw error;
        }
    }

    setupAudioElements() {
        // Create remote audio element if it doesn't exist
        if (!this.remoteAudio) {
            this.remoteAudio = document.createElement('audio');
            this.remoteAudio.autoplay = true;
            this.remoteAudio.style.display = 'none';
            document.body.appendChild(this.remoteAudio);
        }
    }
    
    async startRecording() {
        try {
            if (!this.isConnected) {
                throw new Error('Not connected to AI service');
            }

            // Initialize playback audio context on user interaction
            if (!this.playbackAudioContext) {
                try {
                    this.playbackAudioContext = new (window.AudioContext || window.webkitAudioContext)();
                    this.audioChunks = [];
                    this.isPlayingAudio = false;
                    debug.log('Playback audio context initialized');
                } catch (error) {
                    console.warn('Failed to initialize playback audio context:', error);
                }
            }
            
            console.log('🎤 Starting real-time AI recording...');
            
            // Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: 24000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                } 
            });
            
            // Create SEPARATE audio context for recording PCM16 conversion
            this.recordingAudioContext = new AudioContext({ sampleRate: 24000 });
            const source = this.recordingAudioContext.createMediaStreamSource(stream);
            
            // Create processor for PCM16 conversion
            const processor = this.recordingAudioContext.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (event) => {
                if (this.isRecording) {
                    const inputData = event.inputBuffer.getChannelData(0);
                    const pcm16Data = this.convertToPCM16(inputData);
                    this.sendAudioChunk(pcm16Data);
                }
            };
            
            source.connect(processor);
            processor.connect(this.recordingAudioContext.destination);
            
            this.isRecording = true;
            
            // Reset feedback flag for new session
            this.lastFeedbackReceived = false;
            
            // Store references for cleanup
            this.audioStream = stream;
            this.audioProcessor = processor;
            this.audioSource = source;
            
            console.log('✅ Recording started');
            
        } catch (error) {
            console.error('Failed to start recording:', error);
        }
    }
    
    stopRecording() {
        try {
            console.log('🛑 Stopping recording...');
            this.isRecording = false;
            
            // For manual start/stop UX, we need to signal OpenAI that user finished speaking
            // With WebRTC, we can send a message through data channel or use turn detection override
            this.signalEndOfUserInput();
            
            console.log('✅ Recording stopped, AI processing...');
            
        } catch (error) {
            console.error('Failed to stop recording:', error);
        }
    }

    signalEndOfUserInput() {
        // Send response.create event through WebRTC data channel to trigger OpenAI response
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            const responseEvent = {
                type: 'response.create'
            };
            
            this.dataChannel.send(JSON.stringify(responseEvent));
            debug.log('📤 Sent response.create to OpenAI via data channel');
        } else {
            console.warn('Data channel not available for signaling');
        }
    }
    
    convertToPCM16(float32Array) {
        const pcm16Array = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            const s = Math.max(-1, Math.min(1, float32Array[i]));
            pcm16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return pcm16Array.buffer;
    }
    
    async sendAudioChunk(audioData) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            // Convert PCM16 to base64 for OpenAI
            const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioData)));
            
            const audioEvent = {
                type: 'input_audio_buffer.append',
                audio: base64Audio
            };
            
            this.websocket.send(JSON.stringify(audioEvent));
            debug.log('🎵 Audio chunk sent to OpenAI:', audioData.byteLength, 'bytes');
        }
    }
    
    commitAudioAndGetResponse() {
        // With WebRTC, audio is streamed continuously and automatically
        // OpenAI processes the audio in real-time and responds when user stops talking
        debug.log('📤 Audio streaming via WebRTC - waiting for OpenAI response');
        
        // The response will come through the WebRTC audio stream automatically
        // No manual commit needed with WebRTC approach
    }
    
    playAudioDelta(base64Audio) {
        try {
            // Initialize playback audio context if not already done
            if (!this.playbackAudioContext) {
                this.playbackAudioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.audioQueue = [];
                this.isPlayingAudio = false;
                this.nextPlayTime = 0;
            }

            // Resume playback audio context if suspended
            if (this.playbackAudioContext.state === 'suspended') {
                this.playbackAudioContext.resume();
            }

            // Decode base64 audio
            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Convert PCM16 data to AudioBuffer
            const int16Array = new Int16Array(bytes.buffer);
            const float32Array = new Float32Array(int16Array.length);
            
            // Convert 16-bit PCM to float32 (-1.0 to 1.0)
            for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 32768.0;
            }

            // Create AudioBuffer for this chunk
            const audioBuffer = this.playbackAudioContext.createBuffer(1, float32Array.length, 24000);
            audioBuffer.copyToChannel(float32Array, 0);

            // Add to queue for seamless playback
            this.audioQueue.push(audioBuffer);

            // Start playback if not already playing
            if (!this.isPlayingAudio) {
                this.startSeamlessPlayback();
            }

        } catch (error) {
            console.error('Failed to play audio delta:', error);
        }
    }
    
    startSeamlessPlayback() {
        if (this.isPlayingAudio || this.audioQueue.length === 0) {
            return;
        }

        this.isPlayingAudio = true;
        debug.log('Starting seamless audio playback');

        // Initialize timing for seamless playback
        const currentTime = this.playbackAudioContext.currentTime;
        this.nextPlayTime = currentTime + 0.1; // Small buffer

        this.scheduleNextChunk();
    }

    scheduleNextChunk() {
        // Check if we have chunks to play
        if (this.audioQueue.length === 0) {
            // No more chunks, but keep checking for new ones
            setTimeout(() => {
                if (this.audioQueue.length > 0) {
                    this.scheduleNextChunk();
                } else if (this.isPlayingAudio) {
                    // Only stop if no new chunks arrived
                    this.isPlayingAudio = false;
                    debug.log('Audio playback complete');
                }
            }, 1000);
            return;
        }

        const audioBuffer = this.audioQueue.shift();
        const source = this.playbackAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.playbackAudioContext.destination);

        // Schedule to play at the exact right time
        source.start(this.nextPlayTime);
        debug.log('Playing audio chunk:', audioBuffer.duration.toFixed(3), 'seconds');

        // Update next play time
        this.nextPlayTime += audioBuffer.duration;

        // Schedule the next chunk
        setTimeout(() => this.scheduleNextChunk(), (audioBuffer.duration * 1000) - 100);
    }
    
    processFeedback(transcript) {
        debug.log('📝 Processing feedback:', transcript);
        
        // Extract grade using regex patterns
        const gradePatterns = [
            /\*\*rating[:\s]*(\d{1,2})\/10\*\*/i,
            /rating[:\s]*(\d{1,2})\/10/i,
            /(\d{1,2})\/10/i,
            /rating[:\s]*(\d{1,2})/i
        ];
        
        let grade = null;
        for (const pattern of gradePatterns) {
            const match = transcript.match(pattern);
            if (match) {
                const potentialGrade = parseInt(match[1]);
                if (potentialGrade >= 1 && potentialGrade <= 10) {
                    grade = potentialGrade;
                    break;
                }
            }
        }
        
        // Store results
        this.currentGrade = grade;
        this.currentFeedback = transcript;
        this.lastFeedbackReceived = true;
        
        // Update Storyline variables
        this.updateStorylineVariables(grade, transcript);
        
        debug.log('📊 Feedback processed - Grade:', grade);
    }
    
    updateStorylineVariables(grade, feedback) {
        if (this.player) {
            if (grade !== null) {
                debug.log('Setting grade to:', grade);
                try { 
                    this.player.SetVar('grade', grade); 
                    debug.log('Grade set successfully:', this.player.GetVar('grade'));
                } catch (e) { debug.log('Variable grade not found:', e.message); }
                
                try { 
                    const gradeDisplay = `${grade}/10`;
                    this.player.SetVar('gradeDisplay', gradeDisplay); 
                    debug.log('GradeDisplay set to:', gradeDisplay);
                } catch (e) { debug.log('Variable gradeDisplay not found:', e.message); }
            }
            
            if (feedback) {
                try { 
                    this.player.SetVar('feedback', feedback); 
                    debug.log('Feedback set successfully');
                } catch (e) { debug.log('Variable feedback not found:', e.message); }
            }
            
            // Update status
            try { 
                this.player.SetVar('ai_status', 'AI feedback complete'); 
            } catch (e) { debug.log('Variable ai_status not found:', e.message); }
        }
    }
    
    handleOpenAIMessage(event) {
        try {
            const data = JSON.parse(event.data);
            this.handleOpenAIEvent(data);
        } catch (error) {
            console.error('Failed to handle OpenAI message:', error);
        }
    }
    
    handleOpenAIEvent(event) {
        const eventType = event.type;
        debug.log('📨 OpenAI Event:', eventType, event);
        
        switch (eventType) {
            case 'session.created':
                debug.log('🎯 Session created:', event.session.id);
                this.configureSession();
                break;
                
            case 'session.updated':
                debug.log('✅ Session configured successfully');
                break;
                
            case 'response.audio.delta':
                // Play audio response chunk
                if (event.delta) {
                    this.playAudioDelta(event.delta);
                }
                break;
                
            case 'response.audio_transcript.done':
                // Extract feedback and grade from transcript
                if (event.transcript) {
                    this.processFeedback(event.transcript);
                }
                break;
                
            case 'response.done':
                debug.log('✅ Response complete');
                this.resetUIAfterResponse();
                break;
                
            case 'error':
                debug.log('❌ OpenAI API error:', event.error);
                console.error('OpenAI API error:', event.error);
                break;
                
            default:
                debug.log('🔍 Unhandled event type:', eventType);
        }
    }
    
    configureSession() {
        // With WebRTC, session configuration is handled during the session creation
        // The instructions and settings are already configured in the Lambda function
        // when creating the ephemeral session
        console.log('🎯 Session configured via WebRTC - using server-side configuration');
        debug.log('🎯 Session configuration complete');
    }
    

    startSeamlessPlayback() {
        if (this.isPlayingAudio || this.audioQueue.length === 0) {
            return;
        }

        this.isPlayingAudio = true;
        debug.log('Starting seamless audio playback');

        // Initialize timing for seamless playback
        const currentTime = this.playbackAudioContext.currentTime;
        this.nextPlayTime = currentTime + 0.1; // Small buffer to prevent underruns

        this.scheduleNextChunk();
    }

    scheduleNextChunk() {
        // Check if we have chunks to play
        if (this.audioQueue.length === 0) {
            // No more chunks, but keep checking for new ones
            setTimeout(() => {
                if (this.audioQueue.length > 0) {
                    this.scheduleNextChunk();
                } else if (this.isPlayingAudio) {
                    // Only stop if no new chunks arrived
                    this.isPlayingAudio = false;
                    debug.log('Audio playback complete');
                    
                    // Request feedback now that audio is complete
                    debug.log('Requesting feedback after audio completion...');
                    this.requestFeedback();
                    
                    // Reset UI state - reactivate record button and remove loading
                    this.resetUIAfterResponse();
                }
            }, 1000); // Increased delay to ensure audio stream is truly complete
            return;
        }

        const audioBuffer = this.audioQueue.shift();
        const source = this.playbackAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.playbackAudioContext.destination);

        // Schedule to play at the exact right time for seamless audio
        source.start(this.nextPlayTime);
        debug.log('Playing audio chunk:', audioBuffer.duration.toFixed(3), 'seconds');

        // Update next play time for seamless continuation
        this.nextPlayTime += audioBuffer.duration;

        // Schedule the next chunk
        setTimeout(() => this.scheduleNextChunk(), (audioBuffer.duration * 1000) - 100); // Start next chunk 100ms before current ends
    }
    
    resetUIAfterResponse() {
        try {
            debug.log('Resetting UI after AI response completion');
            
            // Add grade debugging for UI reset
            if (this.player) {
                try {
                    const currentGrade = this.player.GetVar('grade');
                    debug.log('resetUIAfterResponse - Current grade:', currentGrade);
                } catch (e) {
                    debug.log('resetUIAfterResponse - Could not read grade:', e.message);
                }
            }
            
            // Update Storyline variables if player exists
            if (this.player) {
                try {
                    // Reset recording state to allow new recording
                    this.player.SetVar('isRecording', false);
                } catch (e) { debug.log('Variable isRecording not found:', e.message); }
                
                try {
                    // Remove loading state/indicators
                    this.player.SetVar('ai_processing', false);
                } catch (e) { debug.log('Variable ai_processing not found:', e.message); }
                
                try {
                    this.player.SetVar('ai_status', 'Ready for next interaction');
                } catch (e) { debug.log('Variable ai_status not found:', e.message); }
                
                try {
                    // Enable record button (remove any disabled state)
                    this.player.SetVar('recordButtonEnabled', true);
                } catch (e) { debug.log('Variable recordButtonEnabled not found:', e.message); }
                
                debug.log('UI state reset complete - ready for next recording');
            }
            
            // Reset internal recording flag
            this.isRecording = false;
            
        } catch (error) {
            console.error('Failed to reset UI after response:', error);
        }
    }
    
    
    // Method to clear resume data and reset grade variables
    clearResumeData() {
        try {
            console.log('🧹 Clearing resume data and resetting grade variables...');
            
            if (this.player) {
                // Reset grade variables to initial state
                try {
                    this.player.SetVar('grade', 'Pending');
                    debug.log('Grade reset to: Pending');
                } catch (e) { debug.log('Could not reset grade:', e.message); }
                
                try {
                    this.player.SetVar('gradeDisplay', 'Not graded yet');
                    debug.log('GradeDisplay reset to: Not graded yet');
                } catch (e) { debug.log('Could not reset gradeDisplay:', e.message); }
                
                // Clear other session variables that might cause issues
                try {
                    this.player.SetVar('feedback', '');
                    debug.log('Feedback cleared');
                } catch (e) { debug.log('Could not clear feedback:', e.message); }
                
                try {
                    this.player.SetVar('ai_status', 'Ready');
                    debug.log('AI status reset to: Ready');
                } catch (e) { debug.log('Could not reset ai_status:', e.message); }
                
                console.log('✅ Resume data cleared successfully');
                
                // Force a refresh of the grade display
                setTimeout(() => {
                    this.checkInitialGradeValues();
                }, 500);
                
            } else {
                debug.log('Player not available for clearing resume data');
            }
            
        } catch (error) {
            console.error('Error clearing resume data:', error);
        }
    }
    
    // Method to check connection status
    getConnectionStatus() {
        if (this.websocket) {
            switch (this.websocket.readyState) {
                case WebSocket.CONNECTING:
                    return 'Connecting...';
                case WebSocket.OPEN:
                    return 'Connected';
                case WebSocket.CLOSING:
                    return 'Closing...';
                case WebSocket.CLOSED:
                    return 'Disconnected';
                default:
                    return 'Unknown';
            }
        }
        return 'No WebSocket';
    }
    
    // Method to reconnect if needed
    async reconnect() {
        console.log('🔄 Attempting to reconnect...');
        this.isConnected = false;
        if (this.websocket) {
            this.websocket.close();
        }
        await this.connect();
    }
}

// Initialize real-time AI integration
let storylineAI = null;

// Global functions for troubleshooting (only available in debug mode)
if (AI_SERVICE_CONFIG.debugMode) {
    window.clearStorylineResumeData = function() {
        console.log('Global function called to clear resume data');
        if (storylineAI) {
            storylineAI.clearResumeData();
        } else {
            console.log('StorylineAI not initialized yet');
        }
    };

    window.checkStorylineGrades = function() {
        console.log('Global function called to check grade values');
        if (storylineAI) {
            storylineAI.checkInitialGradeValues();
        } else {
            console.log('StorylineAI not initialized yet');
        }
    };
}

function ExecuteScript(strId) {
    switch (strId) {
        case "67Ka939gLqp":
            Script1();
            break;
        case "6OoFJc6Y9A5":
            Script2();
            break;
    }
}

window.InitExecuteScripts = function() {
    var player = GetPlayer();
    var object = player.object;
    var addToTimeline = player.addToTimeline;
    var setVar = player.SetVar;
    var getVar = player.GetVar;

    // Initialize real-time AI integration with direct OpenAI connection
    storylineAI = new StorylineRealtimeAI({
        tokenEndpoint: AI_SERVICE_CONFIG.tokenEndpoint,
        autoConnect: AI_SERVICE_CONFIG.autoConnect,
        debugMode: AI_SERVICE_CONFIG.debugMode
    });

    // Store player reference in the AI instance
    storylineAI.player = player;

    // Log connection status periodically
    setInterval(() => {
        if (storylineAI) {
            const status = storylineAI.getConnectionStatus();
            debug.log('AI Connection Status:', status);
            
            // Update Storyline status if connected
            if (status === 'Connected') {
                player.SetVar('ai_status', 'AI Coach Ready');
            } else if (status === 'Connecting...') {
                player.SetVar('ai_status', 'Connecting to AI...');
            } else if (status === 'Disconnected') {
                player.SetVar('ai_status', 'AI Service Disconnected');
            }
        }
    }, 10000); // Check every 10 seconds

    window.Script1 = function() {
        const player = GetPlayer();
        
        // Add grade debugging for Script1
        try {
            const currentGrade = player.GetVar('grade');
            debug.log('Script1 - Current grade at start:', currentGrade);
        } catch (e) {
            debug.log('Script1 - Could not read grade:', e.message);
        }

        // Toggle the record button state.
        player.SetVar('isRecording', !player.GetVar('isRecording'));

        // Get the value of the isRecording variable
        let recording = player.GetVar('isRecording');

        if (recording) {
            // Start recording with real-time AI
            console.log('🎤 Starting real-time AI recording...');
            
            // Set UI state to show recording in progress
            try { player.SetVar('ai_status', 'Listening...'); } catch (e) { debug.log('Variable ai_status not found'); }
            try { player.SetVar('recordButtonEnabled', true); } catch (e) { debug.log('Variable recordButtonEnabled not found'); }
            
            // Check if AI service is connected
            if (storylineAI && storylineAI.isConnected) {
                // Start real-time recording
                storylineAI.startRecording();
                
            } else {
                console.error('AI service not connected');
                player.SetVar('ai_status', 'AI Service Disconnected');
                // Fallback to old recording method if needed
                startFallbackRecording();
            }
            
        } else {
            // Stop recording and get AI feedback
            console.log('�� Stopping real-time AI recording...');
            
            // Add grade debugging for stop recording
            try {
                const currentGrade = player.GetVar('grade');
                debug.log('Script1 - Current grade at stop:', currentGrade);
            } catch (e) {
                debug.log('Script1 - Could not read grade at stop:', e.message);
            }
            
            // Set UI state to show processing
            try { player.SetVar('ai_status', 'AI is analyzing...'); } catch (e) { debug.log('Variable ai_status not found'); }
            try { player.SetVar('ai_processing', true); } catch (e) { debug.log('Variable ai_processing not found'); }
            try { player.SetVar('recordButtonEnabled', false); } catch (e) { debug.log('Variable recordButtonEnabled not found'); }
            
            if (storylineAI) {
                // Stop recording and trigger AI response
                storylineAI.stopRecording();
                
                // Feedback will be requested automatically after audio playback completes
                
            } else {
                // Fallback stop
                player.SetVar('ai_status', 'Processing failed');
                player.SetVar('recordButtonEnabled', true);  // Re-enable if failed
                stopFallbackRecording();
            }
        }
    };

    // Fallback recording methods (if AI service fails)
    function startFallbackRecording() {
        console.log('Using fallback recording method');
        
        let chunks = [];
        const supportedFormat = getSupportedAudioFormat();

        if (!supportedFormat) {
            console.log('No supported audio types found');
            return;
        }

        navigator.mediaDevices.getUserMedia({audio: true, video: false})
            .then(stream => {
                window.recorder = new MediaRecorder(stream);
                window.recorder.start();

                window.recorder.ondataavailable = e => {
                    chunks.push(e.data);
                };

                window.recorder.onstop = () => {
                    // Handle fallback recording completion
                    console.log('Fallback recording completed');
                };
            })
            .catch(err => {
                console.log(err);
            });
    }

    function stopFallbackRecording() {
        if (window.recorder) {
            window.recorder.stop();
        }
    }

    // Helper function for audio format detection
    function getSupportedAudioFormat() {
        const formats = [
            {mimeType: 'audio/ogg; codecs=opus', fileExtension: 'ogg'},
            {mimeType: 'audio/ogg; codecs=vorbis', fileExtension: 'ogg'},
            {mimeType: 'audio/wav', fileExtension: 'wav'},
            {mimeType: 'audio/mpeg', fileExtension: 'mp3'},
            {mimeType: 'audio/mp4', fileExtension: 'm4a'},
            {mimeType: 'audio/opus', fileExtension: 'opus'},
            {mimeType: 'audio/flac', fileExtension: 'flac'},
            {mimeType: 'audio/webm; codecs=opus', fileExtension: 'webm'}
        ];

        for (let format of formats) {
            if (MediaRecorder.isTypeSupported(format.mimeType)) {
                return format;
            }
        }
        return null;
    }

    window.Script2 = function() {
        const target = object('6FuHxvwnpiN');
        const duration = 750;
        const easing = 'ease-out';
        const id = '693KAE0tDVI';
        const pulseAmount = 0.07;
        const delay = 5917;
        player.addForTriggers(
            id,
            target.animate([
                { scale: '1' }, { scale: `${1 + pulseAmount}` },
                { scale: '1' }, { scale: `${1 + pulseAmount}` },
                { scale: '1' }
            ],
            { fill: 'forwards', duration, easing }
            )
        );
    };
};
