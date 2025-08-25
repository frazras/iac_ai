/**
 * Self-contained Storyline user.js with IAC Realtime AI Integration
 * Everything needed for real-time speech-to-speech is included here
 * Version: 3.0 - Cleaned up and optimized
 */

// Configuration - Set to true to enable debug logging
const DEBUG_MODE = false;

// Debug logging utility
const debug = {
    log: (...args) => DEBUG_MODE && console.log('🔍 DEBUG:', ...args),
    error: (...args) => DEBUG_MODE && console.error('🔍 DEBUG ERROR:', ...args),
    warn: (...args) => DEBUG_MODE && console.warn('🔍 DEBUG WARN:', ...args)
};

// Real-time AI integration class - self-contained
class StorylineRealtimeAI {
    constructor(config = {}) {
        this.config = {
            websocketUrl: config.websocketUrl || 'ws://localhost:8000/api/ws/speech',
            autoConnect: config.autoConnect !== false,
            debugMode: config.debugMode || DEBUG_MODE,
            ...config
        };
        
        this.websocket = null;
        this.audioContext = null;
        this.isRecording = false;
        this.isConnected = false;
        this.audioStream = null;
        this.audioProcessor = null;
        this.audioSource = null;
        this.lastFeedbackReceived = false;
        this.player = null;
        
        debug.log('StorylineRealtimeAI constructor initialized');
        
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
            console.log('Connecting to real-time AI service...');
            
            // Create WebSocket connection
            this.websocket = new WebSocket(this.config.websocketUrl);
            
            this.websocket.onopen = () => {
                console.log('✅ Connected to IAC Realtime AI');
                this.isConnected = true;
            };
            
            this.websocket.onmessage = (event) => {
                debug.log('WebSocket message received:', event.data);
                this.handleWebSocketMessage(event);
            };
            
            this.websocket.onclose = () => {
                console.log('❌ Disconnected from IAC Realtime AI');
                this.isConnected = false;
            };
            
            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
            
        } catch (error) {
            console.error('Failed to connect:', error);
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
            
            // Clean up RECORDING audio resources only
            if (this.audioProcessor) {
                this.audioProcessor.disconnect();
                this.audioProcessor = null;
            }
            if (this.audioSource) {
                this.audioSource.disconnect();
                this.audioSource = null;
            }
            if (this.recordingAudioContext) {
                this.recordingAudioContext.close();
                this.recordingAudioContext = null;
            }
            if (this.audioStream) {
                this.audioStream.getTracks().forEach(track => track.stop());
                this.audioStream = null;
            }
            
            // Keep playback audio context alive for AI response
            debug.log('Playback audio context preserved for AI response');
            
            // Commit audio buffer to get AI response
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                this.websocket.send(JSON.stringify({ type: 'commit_audio' }));
                debug.log('Audio buffer committed to AI');
            }
            
            console.log('✅ Recording stopped');
            
        } catch (error) {
            console.error('Failed to stop recording:', error);
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
    
    sendAudioChunk(audioData) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(audioData);
        }
    }
    
    handleWebSocketMessage(event) {
        try {
            if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
                // Handle audio response
                debug.log('Detected audio data type:', event.data.constructor.name);
                this.handleAudioResponse(event.data);
            } else if (typeof event.data === 'string') {
                // Handle text response
                const data = JSON.parse(event.data);
                this.handleTextMessage(data);
            } else {
                debug.log('Unknown message type:', typeof event.data, event.data);
            }
        } catch (error) {
            console.error('Failed to handle WebSocket message:', error);
        }
    }
    
    async handleAudioResponse(audioData) {
        try {
            const dataSize = audioData.byteLength || audioData.size || 0;
            debug.log('Received AI audio response:', dataSize, 'bytes');
            
            // Convert PCM16 to playable audio format
            await this.playPCM16Audio(audioData);
            
        } catch (error) {
            console.error('Failed to handle audio response:', error);
        }
    }

    async playPCM16Audio(audioData) {
        try {
            // Initialize playback audio context if not already done
            if (!this.playbackAudioContext) {
                this.playbackAudioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.audioQueue = [];
                this.isPlayingAudio = false;
                this.nextPlayTime = 0;
            }

            // Resume playback audio context if suspended (required for auto-play policy)
            if (this.playbackAudioContext.state === 'suspended') {
                await this.playbackAudioContext.resume();
            }

            // Convert blob to array buffer if needed
            let arrayBuffer;
            if (audioData instanceof Blob) {
                arrayBuffer = await audioData.arrayBuffer();
            } else {
                arrayBuffer = audioData;
            }

            // Convert PCM16 data to AudioBuffer directly
            const int16Array = new Int16Array(arrayBuffer);
            const float32Array = new Float32Array(int16Array.length);
            
            // Convert 16-bit PCM to float32 (-1.0 to 1.0)
            for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 32768.0;
            }

            // Create AudioBuffer for this chunk
            const audioBuffer = this.playbackAudioContext.createBuffer(1, float32Array.length, 24000);
            audioBuffer.copyToChannel(float32Array, 0);

            // Add to queue for seamless playback
            if (!this.audioQueue) {
                this.audioQueue = [];
            }
            this.audioQueue.push(audioBuffer);

            // Start playback if not already playing
            if (!this.isPlayingAudio) {
                this.startSeamlessPlayback();
            }

        } catch (error) {
            console.error('Failed to play PCM16 audio:', error);
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
    
    handleTextMessage(data) {
        try {
            debug.log('Processing text message:', data);
            
            if (data.type === 'training_feedback') {
                console.log('📊 Training feedback received:', data);
                
                // Mark that we've received feedback
                this.lastFeedbackReceived = true;
                
                // Update Storyline variables if they exist
                if (this.player) {
                    if (data.grade !== null) {
                        debug.log('About to set grade to:', data.grade);
                        debug.log('Data received:', JSON.stringify(data));
                        
                        try { 
                            debug.log('Before setting - current grade value:', this.player.GetVar('grade'));
                            this.player.SetVar('grade', data.grade); 
                            debug.log('After setting - new grade value:', this.player.GetVar('grade'));
                        } catch (e) { debug.log('Variable grade not found:', e.message); }
                        
                        try { 
                            debug.log('Before setting - current gradeDisplay value:', this.player.GetVar('gradeDisplay'));
                            
                            // Ensure gradeDisplay is always properly formatted
                            let gradeDisplayValue = '';
                            if (data.grade !== null && data.grade !== undefined) {
                                const gradeNum = parseFloat(data.grade);
                                if (!isNaN(gradeNum) && gradeNum >= 1 && gradeNum <= 10) {
                                    gradeDisplayValue = `${data.grade}/10`;
                                } else {
                                    gradeDisplayValue = 'Invalid grade';
                                    debug.log('Invalid grade value received:', data.grade);
                                }
                            } else {
                                gradeDisplayValue = 'No grade';
                                debug.log('Null/undefined grade received');
                            }
                            
                            this.player.SetVar('gradeDisplay', gradeDisplayValue); 
                            debug.log('After setting - new gradeDisplay value:', this.player.GetVar('gradeDisplay'));
                        } catch (e) { debug.log('Variable gradeDisplay not found:', e.message); }
                    } else {
                        debug.log('Received null grade value');
                    }
                    if (data.feedback) {
                        console.log('💡 Setting feedback:', data.feedback);
                        try { this.player.SetVar('feedback', data.feedback); } catch (e) { debug.log('Variable feedback not found'); }
                    }
                    
                    // Update status to show feedback received
                    try { this.player.SetVar('ai_status', 'AI feedback complete'); } catch (e) { debug.log('Variable ai_status not found'); }
                }
            } else {
                debug.log('Other text message type:', data.type);
            }
        } catch (error) {
            console.error('Failed to handle text message:', error);
        }
    }
    
    requestFeedback() {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            const feedbackRequest = { type: 'get_feedback' };
            debug.log('Sending feedback request:', feedbackRequest);
            this.websocket.send(JSON.stringify(feedbackRequest));
            
            // Add a fallback timer in case the feedback request fails
            setTimeout(() => {
                if (!this.lastFeedbackReceived) {
                    console.warn('⚠️ Feedback request timeout, trying again...');
                    this.websocket.send(JSON.stringify({ type: 'get_feedback' }));
                }
            }, 5000); // 5 second timeout
            
        } else {
            console.error('❌ WebSocket not connected for feedback request');
        }
    }
    
    // Method to manually trigger feedback if needed
    forceFeedbackRequest() {
        console.log('🔄 Force requesting feedback...');
        this.lastFeedbackReceived = false;
        this.requestFeedback();
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
if (DEBUG_MODE) {
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

    // Initialize real-time AI integration
    storylineAI = new StorylineRealtimeAI({
        websocketUrl: 'ws://localhost:8000/api/ws/speech',
        autoConnect: true,
        debugMode: DEBUG_MODE
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
