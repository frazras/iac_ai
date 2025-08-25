# 🐛 Debugging Guide - Audio Processing Fix

## 🎯 What Was Fixed

The issue was that **OpenAI's Realtime API expects raw PCM16 audio at 24kHz**, but the browser's `MediaRecorder` was sending **compressed audio blobs** (WebM/MP3). This caused the "Invalid audio" errors you saw in the logs.

## 🔧 Changes Made

### 1. **Frontend Audio Processing (index.html)**
- ✅ Replaced `MediaRecorder` with `ScriptProcessor` for raw audio capture
- ✅ Added conversion from Float32 to PCM16 format
- ✅ Set audio context to 24kHz sample rate
- ✅ Added comprehensive console logging with emojis

### 2. **Backend Logging (Python)**
- ✅ Enhanced WebSocket message logging
- ✅ Added debug-level audio chunk tracking
- ✅ Enabled DEBUG logging by default

## 🧪 How to Test & Debug

### Step 1: Open Browser Developer Tools
```
1. Open http://localhost:8000 in Chrome/Firefox
2. Press F12 to open Developer Tools
3. Go to "Console" tab
4. Click "Start Conversation"
```

### Step 2: Check Console Logs
You should now see detailed logs like:
```
🎤 Starting recording process...
📱 Requesting microphone access...
✅ Microphone access granted
🔌 Connecting to WebSocket...
✅ WebSocket connected successfully
📊 Setting up audio analysis...
🎵 Setting up raw audio capture...
Audio context created with sample rate: 24000
Raw audio capture setup complete
✅ Recording started successfully
Sending audio chunk: 8192 bytes
📨 WebSocket message received: {type: "object", size: 1024, isArrayBuffer: true}
🎵 Received audio response: 1024 bytes
```

### Step 3: Check Server Logs
```bash
docker-compose logs -f iac-realtime-ai
```

You should see:
```
DEBUG - Received audio chunk: 8192 bytes
DEBUG - Buffer size: 8192 bytes (threshold: 4800)
INFO - Sending audio buffer: 8192 bytes
DEBUG - Sending audio chunk: 8192 bytes -> 10923 base64 chars
```

## 🚨 Troubleshooting

### If Still Getting "Invalid Audio" Errors:

1. **Check Browser Compatibility**
   - Chrome/Edge: Full support ✅
   - Firefox: May need different sample rate
   - Safari: Limited Web Audio API support

2. **Sample Rate Issues**
   ```javascript
   // If 24kHz doesn't work, try 16kHz
   this.audioContext = new AudioContext({ sampleRate: 16000 });
   ```

3. **Audio Context State**
   ```javascript
   // Check in browser console:
   console.log('Audio context state:', audioContext.state);
   console.log('Audio context sample rate:', audioContext.sampleRate);
   ```

### Network Issues:
```bash
# Check WebSocket connection
curl -f http://localhost:8000/api/ws/health

# Check container status
docker-compose ps
```

### Audio Permission Issues:
- Ensure HTTPS in production (required for microphone access)
- Check browser permission settings
- Try different browser

## 🔍 Debug Checklist

- [ ] Browser console shows audio capture setup
- [ ] WebSocket connection established (✅ WebSocket connected)
- [ ] Audio chunks being sent (Sending audio chunk: X bytes)
- [ ] Server receiving chunks (DEBUG - Received audio chunk)
- [ ] No "Invalid audio" errors in server logs
- [ ] Audio responses received (🎵 Received audio response)

## 📊 Performance Metrics

**Expected Values:**
- Audio chunk size: ~8192 bytes (4096 samples × 2 bytes)
- Send frequency: ~6 times per second
- Latency: < 500ms end-to-end
- Sample rate: 24000 Hz

## 🎛️ Advanced Configuration

### Adjust Audio Quality:
```javascript
// In setupRawAudioCapture()
const bufferSize = 2048;  // Smaller = lower latency, higher CPU
// Options: 256, 512, 1024, 2048, 4096, 8192, 16384
```

### Adjust Buffering:
```python
# In websocket.py
buffer_size_threshold = 2400  # Smaller = lower latency
silence_timeout = 0.5  # Faster response to silence
```

## 🚀 Next Steps

1. **Test the application** with the new debugging
2. **Check console logs** for any remaining issues
3. **Monitor server logs** for OpenAI API responses
4. **Adjust buffer sizes** if needed for your use case

The application should now work correctly with real-time speech-to-speech communication! 🎉
