/**
 * Storyline Integration for IAC Realtime AI
 * This script provides the interface between Articulate Storyline and the real-time AI service
 * for de-escalation training with speech-to-speech feedback.
 */

class StorylineRealtimeAI {
    constructor(config = {}) {
        this.config = {
            websocketUrl: config.websocketUrl || 'ws://localhost:8000/api/ws/speech',
            apiUrl: config.apiUrl || 'http://localhost:8000/api',
            autoConnect: config.autoConnect !== false,
            ...config
        };
        
        this.websocket = null;
        this.mediaRecorder = null;
        this.audioContext = null;
        this.isRecording = false;
        this.isConnected = false;
        this.audioChunks = [];
        
        // Storyline integration
        this.player = null;
        this.gradeVariable = 'ai_grade';
        this.feedbackVariable = 'ai_feedback';
        this.statusVariable = 'ai_status';
        
        // Initialize
        this.init();
    }
    
    async init() {
        try {
            // Get Storyline player reference
            this.player = GetPlayer();
            
            // Set initial status
            this.updateStatus('Initializing...');
            
            // Auto-connect if enabled
            if (this.config.autoConnect) {
                await this.connect();
            }
            
            this.updateStatus('Ready');
            
        } catch (error) {
            console.error('Failed to initialize StorylineRealtimeAI:', error);
            this.updateStatus('Initialization failed');
        }
    }
    
    async connect() {
        try {
            this.updateStatus('Connecting...');
            
            // Create WebSocket connection
            this.websocket = new WebSocket(this.websocketUrl);
            
            this.websocket.onopen = () => {
                console.log('Connected to IAC Realtime AI');
                this.isConnected = true;
                this.updateStatus('Connected');
            };
            
            this.websocket.onmessage = (event) => {
                this.handleWebSocketMessage(event);
            };
            
            this.websocket.onclose = () => {
                console.log('Disconnected from IAC Realtime AI');
                this.isConnected = false;
                this.updateStatus('Disconnected');
            };
            
            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateStatus('Connection error');
            };
            
        } catch (error) {
            console.error('Failed to connect:', error);
            this.updateStatus('Connection failed');
        }
    }
    
    async startRecording() {
        try {
            if (!this.isConnected) {
                throw new Error('Not connected to AI service');
            }
            
            this.updateStatus('Starting recording...');
            
            // Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: 24000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                } 
            });
            
            // Create audio context for PCM16 conversion
            this.audioContext = new AudioContext({ sampleRate: 24000 });
            const source = this.audioContext.createMediaStreamSource(stream);
            
            // Create processor for PCM16 conversion
            const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (event) => {
                if (this.isRecording) {
                    const inputData = event.inputBuffer.getChannelData(0);
                    const pcm16Data = this.convertToPCM16(inputData);
                    this.sendAudioChunk(pcm16Data);
                }
            };
            
            source.connect(processor);
            processor.connect(this.audioContext.destination);
            
            this.isRecording = true;
            this.audioChunks = [];
            this.updateStatus('Recording...');
            
            // Store references for cleanup
            this.audioStream = stream;
            this.audioProcessor = processor;
            this.audioSource = source;
            
            console.log('Recording started');
            
        } catch (error) {
            console.error('Failed to start recording:', error);
            this.updateStatus('Recording failed');
        }
    }
    
    stopRecording() {
        try {
            this.isRecording = false;
            this.updateStatus('Processing...');
            
            // Clean up audio resources
            if (this.audioProcessor) {
                this.audioProcessor.disconnect();
                this.audioProcessor = null;
            }
            if (this.audioSource) {
                this.audioSource.disconnect();
                this.audioSource = null;
            }
            if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = null;
            }
            if (this.audioStream) {
                this.audioStream.getTracks().forEach(track => track.stop());
                this.audioStream = null;
            }
            
            // Commit audio buffer to get AI response
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                this.websocket.send(JSON.stringify({ type: 'commit_audio' }));
            }
            
            console.log('Recording stopped');
            
        } catch (error) {
            console.error('Failed to stop recording:', error);
            this.updateStatus('Stop recording failed');
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
            if (event.data instanceof ArrayBuffer) {
                // Handle audio response
                this.handleAudioResponse(event.data);
            } else if (typeof event.data === 'string') {
                // Handle text response
                const data = JSON.parse(event.data);
                this.handleTextMessage(data);
            }
        } catch (error) {
            console.error('Failed to handle WebSocket message:', error);
        }
    }
    
    handleAudioResponse(audioData) {
        try {
            // Create audio element and play response
            const audioBlob = new Blob([audioData], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            const audio = new Audio(audioUrl);
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
            };
            
            audio.play().catch(error => {
                console.log('Auto-play blocked, user must interact first');
            });
            
            this.updateStatus('AI responded');
            
        } catch (error) {
            console.error('Failed to handle audio response:', error);
        }
    }
    
    handleTextMessage(data) {
        try {
            if (data.type === 'training_feedback') {
                // Update Storyline variables
                if (data.grade !== null) {
                    this.player.SetVar(this.gradeVariable, data.grade);
                    console.log('Grade updated:', data.grade);
                }
                
                if (data.feedback) {
                    this.player.SetVar(this.feedbackVariable, data.feedback);
                    console.log('Feedback updated:', data.feedback);
                }
                
                this.updateStatus('Feedback received');
            }
        } catch (error) {
            console.error('Failed to handle text message:', error);
        }
    }
    
    updateStatus(status) {
        if (this.player) {
            this.player.SetVar(this.statusVariable, status);
        }
        console.log('Status:', status);
    }
    
    requestFeedback() {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({ type: 'get_feedback' }));
        }
    }
    
    disconnect() {
        if (this.websocket) {
            this.websocket.close();
        }
        this.isConnected = false;
        this.updateStatus('Disconnected');
    }
}

// Global instance for Storyline integration
window.StorylineRealtimeAI = StorylineRealtimeAI;

// Auto-initialize if in Storyline environment
if (typeof GetPlayer === 'function') {
    window.storylineAI = new StorylineRealtimeAI({
        websocketUrl: 'ws://localhost:8000/api/ws/speech',
        autoConnect: true
    });
}
