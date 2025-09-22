window.InitUserScripts = function()
{
var player = GetPlayer();
var object = player.object;
var once = player.once;
var addToTimeline = player.addToTimeline;
var setVar = player.SetVar;
var getVar = player.GetVar;
var update = player.update;
var pointerX = player.pointerX;
var pointerY = player.pointerY;
var showPointer = player.showPointer;
var hidePointer = player.hidePointer;
var slideWidth = player.slideWidth;
var slideHeight = player.slideHeight;
window.Script2 = function()
{
    // ============================================================================
  // AI SERVICE CONFIGURATION - Initialize AI system on preload
  // ============================================================================
  
  console.log('🚀 Initializing AI Service...');
  
  // Read dynamic configuration from Storyline variables
  const player = GetPlayer();
  
  // Try to read control panel variables, with fallbacks to defaults
  let feedbackInstructions, gradeInstructions, feedbackTemperature, gradeTemperature, feedbackModel, gradeModel;
  
  try {
      feedbackInstructions = player.GetVar('FeedbackInstructions') || '';
      console.log('📋 Feedback Instructions loaded:', feedbackInstructions.substring(0, 100) + '...');
  } catch (e) {
      feedbackInstructions = '';
      console.log('📋 Feedback Instructions variable not found, using default');
  }
  
  try {
      gradeInstructions = player.GetVar('GradeInstructions') || '';
      console.log('📊 Grade Instructions loaded:', gradeInstructions.substring(0, 100) + '...');
  } catch (e) {
      gradeInstructions = '';
      console.log('📊 Grade Instructions variable not found, using default');
  }
  
  try {
      feedbackTemperature = parseFloat(player.GetVar('FeedbackTemperature')) || 0.8;
      console.log('🌡️ Feedback Temperature:', feedbackTemperature);
  } catch (e) {
      feedbackTemperature = 0.8;
      console.log('🌡️ Feedback Temperature variable not found, using default:', feedbackTemperature);
  }
  
  try {
      gradeTemperature = parseFloat(player.GetVar('GradeTemperature')) || 0.8;
      console.log('🌡️ Grade Temperature:', gradeTemperature);
  } catch (e) {
      gradeTemperature = 0.8;
      console.log('🌡️ Grade Temperature variable not found, using default:', gradeTemperature);
  }
  
  // Validate temperature is within OpenAI Realtime API requirements (>= 0.6)
  if (feedbackTemperature < 0.6) {
      console.warn('⚠️ Feedback Temperature', feedbackTemperature, 'is below minimum 0.6. Using 0.6.');
      feedbackTemperature = 0.6;
  }
  
  if (gradeTemperature < 0.6) {
      console.warn('⚠️ Grade Temperature', gradeTemperature, 'is below minimum 0.6. Using 0.6.');
      gradeTemperature = 0.6;
  }
  
  try {
      feedbackModel = player.GetVar('FeedbackModel') || 'gpt-4o-realtime-preview-2024-10-01';
      console.log('🤖 Feedback Model:', feedbackModel);
  } catch (e) {
      feedbackModel = 'gpt-4o-realtime-preview-2024-10-01';
      console.log('🤖 Feedback Model variable not found, using default:', feedbackModel);
  }
  
  try {
      gradeModel = player.GetVar('GradeModel') || 'gpt-4o-realtime-preview-2024-10-01';
      console.log('🤖 Grade Model:', gradeModel);
  } catch (e) {
      gradeModel = 'gpt-4o-realtime-preview-2024-10-01';
      console.log('🤖 Grade Model variable not found, using default:', gradeModel);
  }
  
  // Validate models are compatible with Realtime API
  const supportedRealtimeModels = [
      'gpt-4o-realtime-preview-2024-10-01',
      'gpt-4o-realtime-preview-2024-12-17', 
      'gpt-4o-realtime-preview'
  ];
  
  if (!supportedRealtimeModels.includes(feedbackModel)) {
      console.warn('⚠️ Feedback Model "' + feedbackModel + '" is not compatible with speech-to-speech. Using default.');
      feedbackModel = 'gpt-4o-realtime-preview-2024-10-01';
  }
  
  if (!supportedRealtimeModels.includes(gradeModel)) {
      console.warn('⚠️ Grade Model "' + gradeModel + '" is not compatible with speech-to-speech. Using default.');
      gradeModel = 'gpt-4o-realtime-preview-2024-10-01';
  }

  // AI Service Configuration with dynamic values
  window.AI_SERVICE_CONFIG = {
      tokenEndpoint: 'https://99dqeidak0.execute-api.us-east-2.amazonaws.com/token',
      autoConnect: true,
      debugMode: false,
      // Dynamic configuration from Storyline
      feedbackInstructions: feedbackInstructions,
      gradeInstructions: gradeInstructions,
      feedbackTemperature: feedbackTemperature,
      gradeTemperature: gradeTemperature,
      feedbackModel: feedbackModel,
      gradeModel: gradeModel
  };

  // Debug logging utility
  window.debug = {
      log: (...args) => window.AI_SERVICE_CONFIG.debugMode && console.log('🔍 DEBUG:', ...args),
      error: (...args) => window.AI_SERVICE_CONFIG.debugMode && console.error('🔍 DEBUG ERROR:', ...args),
      warn: (...args) => window.AI_SERVICE_CONFIG.debugMode && console.warn('🔍 DEBUG WARN:', ...args)
  };

  // ============================================================================
  // STORYLINE REALTIME AI CLASS DEFINITION
  // ============================================================================
  
  // Direct OpenAI Real-time AI integration class
  window.StorylineRealtimeAI = class {
      constructor(config = {}) {
          this.config = {
              tokenEndpoint: config.tokenEndpoint || window.AI_SERVICE_CONFIG.tokenEndpoint,
              autoConnect: config.autoConnect !== false ? window.AI_SERVICE_CONFIG.autoConnect : false,
              debugMode: config.debugMode !== undefined ? config.debugMode : window.AI_SERVICE_CONFIG.debugMode,
              // Dynamic Storyline configuration
              feedbackInstructions: config.feedbackInstructions || window.AI_SERVICE_CONFIG.feedbackInstructions,
              gradeInstructions: config.gradeInstructions || window.AI_SERVICE_CONFIG.gradeInstructions,
              feedbackTemperature: config.feedbackTemperature || window.AI_SERVICE_CONFIG.feedbackTemperature,
              gradeTemperature: config.gradeTemperature || window.AI_SERVICE_CONFIG.gradeTemperature,
              feedbackModel: config.feedbackModel || window.AI_SERVICE_CONFIG.feedbackModel,
              gradeModel: config.gradeModel || window.AI_SERVICE_CONFIG.gradeModel,
              ...config
          };
          
          // Connection properties
          this.websocket = null;
          this.sessionId = null;
          this.ephemeralToken = null;
          this.peerConnection = null;
          this.dataChannel = null;
          this.localStream = null;
          this.remoteAudio = null;
          
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
          
          // Transcript tracking
          this.transcriptHistory = [];
          this.enableTranscriptLogging = true;
          
          window.debug.log('StorylineRealtimeAI initialized');
          this.init();
      }
      
      async init() {
          try {
              console.log('Initializing StorylineRealtimeAI...');
              if (this.config.autoConnect) {
                  await this.connect();
              }
          } catch (error) {
              console.error('Failed to initialize StorylineRealtimeAI:', error);
          }
      }
      
      async connect() {
          try {
              console.log('🔐 Getting ephemeral OpenAI token with dynamic configuration...');
              
              // Prepare dynamic configuration payload
              const dynamicConfig = {
                  feedbackInstructions: this.config.feedbackInstructions,
                  gradeInstructions: this.config.gradeInstructions,
                  feedbackTemperature: this.config.feedbackTemperature,
                  gradeTemperature: this.config.gradeTemperature,
                  feedbackModel: this.config.feedbackModel,
                  gradeModel: this.config.gradeModel
              };
              
              console.log('📋 Sending dynamic configuration:', dynamicConfig);
              
              const tokenResponse = await fetch(this.config.tokenEndpoint, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(dynamicConfig)
              });
              
              if (!tokenResponse.ok) {
                  throw new Error(`Token request failed: ${tokenResponse.status}`);
              }
              
              const tokenData = await tokenResponse.json();
              
              if (!tokenData.success) {
                  throw new Error(`Token creation failed: ${tokenData.message}`);
              }
              
              console.log('✅ Ephemeral token received with custom configuration:', tokenData.sessionId);
              this.sessionId = tokenData.sessionId;
              this.ephemeralToken = tokenData.ephemeralToken;
              
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

          // Create data channel for signaling
          this.dataChannel = this.peerConnection.createDataChannel('oai-events', { ordered: true });

          this.dataChannel.onopen = () => {
              console.log('📡 WebRTC data channel opened');
          };

          this.dataChannel.onmessage = (event) => {
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
              
              const audioTrack = stream.getAudioTracks()[0];
              this.peerConnection.addTrack(audioTrack, stream);

              const offer = await this.peerConnection.createOffer();
              await this.peerConnection.setLocalDescription(offer);

              console.log('📤 Sending SDP offer to OpenAI...');

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

              console.log('🎤 Starting real-time AI recording...');
              this.isRecording = true;
              
              // Start capturing audio from the microphone and sending to OpenAI
              if (this.localStream) {
                  this.startAudioCapture();
              }
              
              console.log('✅ Recording started - audio streaming to OpenAI');
              
          } catch (error) {
              console.error('Failed to start recording:', error);
          }
      }
      
      startAudioCapture() {
          try {
              // Create audio context for processing microphone input
              if (!this.recordingAudioContext) {
                  this.recordingAudioContext = new (window.AudioContext || window.webkitAudioContext)({
                      sampleRate: 24000
                  });
              }
              
              // Resume audio context if suspended
              if (this.recordingAudioContext.state === 'suspended') {
                  this.recordingAudioContext.resume();
              }
              
              // Create audio source from microphone stream
              this.audioSource = this.recordingAudioContext.createMediaStreamSource(this.localStream);
              
              // Create script processor for real-time audio processing
              const bufferSize = 4096;
              this.audioProcessor = this.recordingAudioContext.createScriptProcessor(bufferSize, 1, 1);
              
              this.audioProcessor.onaudioprocess = (event) => {
                  if (!this.isRecording) return;
                  
                  const inputBuffer = event.inputBuffer;
                  const inputData = inputBuffer.getChannelData(0);
                  
                  // Convert float32 audio to PCM16 for OpenAI
                  const pcm16Data = new Int16Array(inputData.length);
                  for (let i = 0; i < inputData.length; i++) {
                      pcm16Data[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32767));
                  }
                  
                  // Send audio chunk to OpenAI via data channel
                  if (this.dataChannel && this.dataChannel.readyState === 'open') {
                      const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(pcm16Data.buffer)));
                      const audioEvent = {
                          type: 'input_audio_buffer.append',
                          audio: audioBase64
                      };
                      this.dataChannel.send(JSON.stringify(audioEvent));
                      window.debug.log('📤 Sent audio chunk to OpenAI:', pcm16Data.length, 'samples');
                  }
              };
              
              // Connect audio processing chain
              this.audioSource.connect(this.audioProcessor);
              this.audioProcessor.connect(this.recordingAudioContext.destination);
              
              console.log('🎵 Audio capture started - streaming to OpenAI');
              
          } catch (error) {
              console.error('Failed to start audio capture:', error);
          }
      }
      
      stopRecording() {
          try {
              console.log('🛑 Stopping recording...');
              this.isRecording = false;
              
              // Stop audio capture
              this.stopAudioCapture();
              
              // Commit the audio buffer and request response
              if (this.dataChannel && this.dataChannel.readyState === 'open') {
                  // Step 1: Commit the audio buffer (finalize user input)
                  const commitEvent = { type: 'input_audio_buffer.commit' };
                  this.dataChannel.send(JSON.stringify(commitEvent));
                  window.debug.log('📤 Committed audio buffer to OpenAI');
                  
                  // Step 2: Request AI response
                  setTimeout(() => {
                      if (this.dataChannel && this.dataChannel.readyState === 'open') {
                          const responseEvent = { type: 'response.create' };
                          this.dataChannel.send(JSON.stringify(responseEvent));
                          window.debug.log('📤 Requested AI response');
                      }
                  }, 100); // Small delay to ensure commit is processed
              }
              
              console.log('✅ Recording stopped, audio sent to AI for processing...');
              
          } catch (error) {
              console.error('Failed to stop recording:', error);
          }
      }
      
      stopAudioCapture() {
          try {
              // Disconnect audio processing chain
              if (this.audioSource) {
                  this.audioSource.disconnect();
                  this.audioSource = null;
              }
              
              if (this.audioProcessor) {
                  this.audioProcessor.disconnect();
                  this.audioProcessor = null;
              }
              
              console.log('🎵 Audio capture stopped');
              
          } catch (error) {
              console.error('Failed to stop audio capture:', error);
          }
      }
      
      handleOpenAIEvent(event) {
          const eventType = event.type;
          window.debug.log('📨 OpenAI Event:', eventType, event);
          
          switch (eventType) {
              case 'session.created':
                  window.debug.log('🎯 Session created:', event.session.id);
                  break;
                  
              case 'input_audio_buffer.speech_started':
                  console.log('🎤 User started speaking...');
                  break;
                  
              case 'input_audio_buffer.speech_stopped':
                  console.log('🎤 User stopped speaking');
                  break;
                  
              case 'input_audio_buffer.committed':
                  console.log('📤 User speech committed for processing');
                  break;
                  
              case 'conversation.item.input_audio_transcription.completed':
                  if (event.transcript) {
                      const userTranscript = {
                          type: 'user',
                          timestamp: new Date().toISOString(),
                          text: event.transcript
                      };
                      this.transcriptHistory.push(userTranscript);
                      
                      if (this.enableTranscriptLogging) {
                          console.log('👤 === USER SPEECH TRANSCRIPT ===');
                          console.log('👤 User said:', event.transcript);
                          console.log('👤 === END USER TRANSCRIPT ===');
                      }
                  }
                  break;
                  
              case 'response.audio.delta':
                  if (event.delta) {
                      this.playAudioDelta(event.delta);
                  }
                  break;
                  
              case 'response.audio_transcript.done':
                  if (event.transcript) {
                      const aiTranscript = {
                          type: 'ai',
                          timestamp: new Date().toISOString(),
                          text: event.transcript
                      };
                      this.transcriptHistory.push(aiTranscript);
                      
                      if (this.enableTranscriptLogging) {
                          console.log('🎙️ === AI RESPONSE TRANSCRIPT ===');
                          console.log('🎙️ AI said:', event.transcript);
                          console.log('🎙️ === END TRANSCRIPT ===');
                      }
                      this.processFeedback(event.transcript);
                  }
                  break;
                  
              case 'response.done':
                  window.debug.log('✅ Response complete');
                  this.resetUIAfterResponse();
                  break;
                  
              case 'error':
                  window.debug.log('❌ OpenAI API error:', event.error);
                  console.error('OpenAI API error:', event.error);
                  break;
          }
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
          window.debug.log('Starting seamless audio playback');

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
                      window.debug.log('Audio playback complete');
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
          window.debug.log('Playing audio chunk:', audioBuffer.duration.toFixed(3), 'seconds');

          // Update next play time
          this.nextPlayTime += audioBuffer.duration;

          // Schedule the next chunk
          setTimeout(() => this.scheduleNextChunk(), (audioBuffer.duration * 1000) - 100);
      }
      
      processFeedback(transcript) {
          window.debug.log('📝 Processing feedback:', transcript);
          
          // Log the complete transcript to console if logging is enabled
          if (this.enableTranscriptLogging) {
              console.log('📋 === COMPLETE AI FEEDBACK TRANSCRIPT ===');
              console.log('📋 Full transcript:', transcript);
              console.log('📋 Transcript length:', transcript.length, 'characters');
              console.log('📋 === END COMPLETE TRANSCRIPT ===');
          }
          
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
          
          this.currentGrade = grade;
          this.currentFeedback = transcript;
          this.lastFeedbackReceived = true;
          
          this.updateStorylineVariables(grade, transcript);
          window.debug.log('📊 Feedback processed - Grade:', grade);
      }
      
      updateStorylineVariables(grade, feedback) {
          if (this.player) {
              if (grade !== null) {
                  try { 
                      this.player.SetVar('grade', grade); 
                      const gradeDisplay = `${grade}/10`;
                      this.player.SetVar('gradeDisplay', gradeDisplay); 
                      window.debug.log('Grade set to:', grade);
                  } catch (e) { window.debug.log('Grade variables not found:', e.message); }
              }
              
              if (feedback) {
                  try { 
                      this.player.SetVar('feedback', feedback); 
                      window.debug.log('Feedback set successfully');
                  } catch (e) { window.debug.log('Feedback variable not found:', e.message); }
              }
              
              try { 
                  this.player.SetVar('ai_status', 'AI feedback complete'); 
              } catch (e) { window.debug.log('AI status variable not found:', e.message); }
          }
      }
      
      resetUIAfterResponse() {
          try {
              window.debug.log('Resetting UI after AI response completion');
              
              if (this.player) {
                  try {
                      this.player.SetVar('isRecording', false);
                      this.player.SetVar('ai_processing', false);
                      this.player.SetVar('ai_status', 'Ready for next interaction');
                      this.player.SetVar('recordButtonEnabled', true);
                      window.debug.log('UI state reset complete - ready for next recording');
                  } catch (e) { window.debug.log('UI variables not found:', e.message); }
              }
              
              this.isRecording = false;
              
          } catch (error) {
              console.error('Failed to reset UI after response:', error);
          }
      }
      
      // Transcript management methods
      enableTranscripts() {
          this.enableTranscriptLogging = true;
          console.log('📝 Transcript logging enabled');
      }
      
      disableTranscripts() {
          this.enableTranscriptLogging = false;
          console.log('📝 Transcript logging disabled');
      }
      
      getTranscriptHistory() {
          return this.transcriptHistory;
      }
      
      printAllTranscripts() {
          console.log('📚 === COMPLETE CONVERSATION TRANSCRIPT HISTORY ===');
          console.log('📚 Total entries:', this.transcriptHistory.length);
          
          this.transcriptHistory.forEach((entry, index) => {
              const speaker = entry.type === 'user' ? '👤 USER' : '🤖 AI';
              console.log(`\n📚 [${index + 1}] ${speaker} (${entry.timestamp}):`);
              console.log(entry.text);
          });
          
          console.log('\n📚 === END TRANSCRIPT HISTORY ===');
          return this.transcriptHistory;
      }
      
      clearTranscriptHistory() {
          const count = this.transcriptHistory.length;
          this.transcriptHistory = [];
          console.log(`📚 Cleared ${count} transcript entries`);
      }
      
      getLastUserTranscript() {
          const userTranscripts = this.transcriptHistory.filter(t => t.type === 'user');
          return userTranscripts.length > 0 ? userTranscripts[userTranscripts.length - 1] : null;
      }
      
      getLastAITranscript() {
          const aiTranscripts = this.transcriptHistory.filter(t => t.type === 'ai');
          return aiTranscripts.length > 0 ? aiTranscripts[aiTranscripts.length - 1] : null;
      }
  };

  // Initialize AI service with dynamic configuration
  window.storylineAI = new window.StorylineRealtimeAI({
      tokenEndpoint: window.AI_SERVICE_CONFIG.tokenEndpoint,
      autoConnect: window.AI_SERVICE_CONFIG.autoConnect,
      debugMode: window.AI_SERVICE_CONFIG.debugMode,
      // Pass dynamic Storyline configuration
      feedbackInstructions: window.AI_SERVICE_CONFIG.feedbackInstructions,
      gradeInstructions: window.AI_SERVICE_CONFIG.gradeInstructions,
      feedbackTemperature: window.AI_SERVICE_CONFIG.feedbackTemperature,
      gradeTemperature: window.AI_SERVICE_CONFIG.gradeTemperature,
      feedbackModel: window.AI_SERVICE_CONFIG.feedbackModel,
      gradeModel: window.AI_SERVICE_CONFIG.gradeModel
  });

  window.storylineAI.player = player;
  window.aiInitialized = true;
  
  console.log('✅ AI Service fully initialized with dynamic configuration');
  console.log('📋 Configuration summary:');
  console.log('  - Feedback Temperature:', window.AI_SERVICE_CONFIG.feedbackTemperature);
  console.log('  - Grade Temperature:', window.AI_SERVICE_CONFIG.gradeTemperature);
  console.log('  - Feedback Model:', window.AI_SERVICE_CONFIG.feedbackModel);
  console.log('  - Grade Model:', window.AI_SERVICE_CONFIG.gradeModel);
  console.log('  - Custom Instructions Length:', (window.AI_SERVICE_CONFIG.feedbackInstructions + window.AI_SERVICE_CONFIG.gradeInstructions).length);
  
  // Global transcript helper functions for console access
  window.showTranscripts = function() {
      if (window.storylineAI) {
          return window.storylineAI.printAllTranscripts();
      } else {
          console.log('❌ AI service not initialized');
          return [];
      }
  };
  
  window.getTranscripts = function() {
      if (window.storylineAI) {
          return window.storylineAI.getTranscriptHistory();
      } else {
          console.log('❌ AI service not initialized');
          return [];
      }
  };
  
  window.clearTranscripts = function() {
      if (window.storylineAI) {
          return window.storylineAI.clearTranscriptHistory();
      } else {
          console.log('❌ AI service not initialized');
      }
  };
  
  window.enableTranscriptLogging = function() {
      if (window.storylineAI) {
          return window.storylineAI.enableTranscripts();
      } else {
          console.log('❌ AI service not initialized');
      }
  };
  
  window.disableTranscriptLogging = function() {
      if (window.storylineAI) {
          return window.storylineAI.disableTranscripts();
      } else {
          console.log('❌ AI service not initialized');
      }
  };
  
  // Log available transcript functions
  console.log('📝 Transcript functions available:');
  console.log('  - showTranscripts() - Display all conversation transcripts');
  console.log('  - getTranscripts() - Get transcript array');
  console.log('  - clearTranscripts() - Clear transcript history');
  console.log('  - enableTranscriptLogging() - Enable console transcript logging');
  console.log('  - disableTranscriptLogging() - Disable console transcript logging');
}


window.Script3 = function()
{
    // ============================================================================
  // RECORD BUTTON CLICK HANDLER - Based on Script1 from reference implementation
  // ============================================================================
  
  console.log('🎤 Record button clicked');
  
  const player = GetPlayer();
  
  // Log current dynamic configuration being used
  console.log('📋 Current AI Configuration:');
  console.log('  - Feedback Temperature:', window.AI_SERVICE_CONFIG?.feedbackTemperature || 'Not set');
  console.log('  - Grade Temperature:', window.AI_SERVICE_CONFIG?.gradeTemperature || 'Not set');
  console.log('  - Feedback Model:', window.AI_SERVICE_CONFIG?.feedbackModel || 'Not set');
  console.log('  - Grade Model:', window.AI_SERVICE_CONFIG?.gradeModel || 'Not set');
  console.log('  - Custom Instructions:', (window.AI_SERVICE_CONFIG?.feedbackInstructions?.length || 0) + (window.AI_SERVICE_CONFIG?.gradeInstructions?.length || 0), 'characters');
  
  // Add grade debugging for Script3
  try {
      const currentGrade = player.GetVar('grade');
      window.debug.log('Script3 - Current grade at start:', currentGrade);
  } catch (e) {
      window.debug.log('Script3 - Could not read grade:', e.message);
  }

  // Toggle the record button state.
  player.SetVar('isRecording', !player.GetVar('isRecording'));

  // Get the value of the isRecording variable
  let recording = player.GetVar('isRecording');

  if (recording) {
      // Start recording with real-time AI
      console.log('🎤 Starting real-time AI recording...');
      
      // Set UI state to show recording in progress
      try { player.SetVar('ai_status', 'Listening...'); } catch (e) { window.debug.log('Variable ai_status not found'); }
      try { player.SetVar('recordButtonEnabled', true); } catch (e) { window.debug.log('Variable recordButtonEnabled not found'); }
      
      // Check if AI service is connected
      if (window.storylineAI && window.storylineAI.isConnected) {
          // Start real-time recording
          window.storylineAI.startRecording();
          
      } else {
          console.error('AI service not connected');
          player.SetVar('ai_status', 'AI Service Disconnected');
          // Fallback to old recording method if needed
          startFallbackRecording();
      }
      
  } else {
      // Stop recording and get AI feedback
      console.log('🛑 Stopping real-time AI recording...');
      
      // Add grade debugging for stop recording
      try {
          const currentGrade = player.GetVar('grade');
          window.debug.log('Script3 - Current grade at stop:', currentGrade);
      } catch (e) {
          window.debug.log('Script3 - Could not read grade at stop:', e.message);
      }
      
      // Set UI state to show processing
      try { player.SetVar('ai_status', 'AI is analyzing...'); } catch (e) { window.debug.log('Variable ai_status not found'); }
      try { player.SetVar('ai_processing', true); } catch (e) { window.debug.log('Variable ai_processing not found'); }
      try { player.SetVar('recordButtonEnabled', false); } catch (e) { window.debug.log('Variable recordButtonEnabled not found'); }
      
      if (window.storylineAI) {
          // Stop recording and trigger AI response
          window.storylineAI.stopRecording();
          
      } else {
          // Fallback stop
          player.SetVar('ai_status', 'Processing failed');
          player.SetVar('recordButtonEnabled', true);  // Re-enable if failed
          stopFallbackRecording();
      }
  }

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
}

};
