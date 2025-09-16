# 🔐 OpenAI Token Mint Lambda Function

This Lambda function creates **ephemeral OpenAI Realtime API tokens** for secure browser-to-OpenAI connections.

## 📁 Files

- `lambda_function.py` - Main Lambda code
- `requirements.txt` - Python dependencies  
- `buildspec.yml` - CodeBuild configuration
- `codebuild-iam-policy.json` - Required permissions
- `README.md` - This file

## 🎯 Function Purpose

**Creates secure, short-lived tokens** that allow browsers to connect directly to OpenAI's Realtime API without exposing your main API key.

### How It Works:
1. **Browser requests token** from this Lambda (via API Gateway)
2. **Lambda calls OpenAI** to create ephemeral session  
3. **Returns short-lived token** safe for browser use
4. **Browser connects directly** to OpenAI with token
5. **Token expires** automatically (1 hour)

## 🔧 Environment Variables

**Required:**
- `OPENAI_API_KEY` - Your OpenAI API key (keep this secret!)

**Optional:**
- `LOG_LEVEL` - Set to `DEBUG` for verbose logging

## 📊 Response Format

**Success Response:**
```json
{
  "success": true,
  "ephemeralToken": "sess_abc123...",
  "sessionId": "sess_xyz789", 
  "expiresAt": 1699123456,
  "model": "gpt-4o-realtime-preview-2024-10-01",
  "voice": "alloy",
  "message": "Ephemeral token created successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Failed to create OpenAI session",
  "details": "OpenAI API returned 400",
  "message": "Please try again in a few moments"
}
```

## 🚀 Deployment Options

### Option 1: CodeBuild (Recommended)
**Automatic deployment on git push:**
1. Follow `../CODEBUILD_SETUP.md`
2. Push code changes
3. Lambda updates automatically

### Option 2: Manual Deployment  
**Using AWS CLI:**
```bash
# Package and deploy
pip install -r requirements.txt -t lib
cd lib && zip -r9 ../deployment.zip . && cd ..
zip -g deployment.zip lambda_function.py

aws lambda update-function-code \
  --function-name openai-token-mint \
  --zip-file fileb://deployment.zip
```

## 🧪 Testing

### Test via AWS Console:
```json
{
  "httpMethod": "POST",
  "body": "{}"
}
```

### Test via API Gateway:
```bash
curl -X POST https://your-api-gateway-url/prod/token \
  -H "Content-Type: application/json"
```

### Test via Browser:
```javascript
fetch('https://your-api-gateway-url/prod/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(console.log);
```

## 🔒 Security Features

- **CORS enabled** for browser access
- **No authentication required** (public endpoint)
- **Rate limiting** handled by API Gateway
- **Ephemeral tokens** expire automatically
- **Main API key** never exposed to browser

## 💰 Cost Optimization

**This function is designed for minimal cost:**
- **128MB memory** (minimum needed)
- **30 second timeout** (sufficient for OpenAI API)
- **Minimal dependencies** (only `requests`)
- **Efficient code** (fast execution)

**Estimated cost:** ~$0.20/month for 1,000 requests

## 🔍 Monitoring

**CloudWatch Metrics:**
- Function invocations
- Duration
- Error rate  
- Throttles

**Custom Logs:**
- Token creation success/failure
- OpenAI API response times
- Error details and troubleshooting

## ⚙️ Configuration

**OpenAI Session Settings:**
```python
{
    'model': 'gpt-4o-realtime-preview-2024-10-01',
    'expires_at': expires_at,  # 1 hour from now
    'voice': 'alloy'          # Default voice
}
```

**Modify in `lambda_function.py`** if needed.

## 🛠️ Troubleshooting

### Common Issues:

**"OPENAI_API_KEY environment variable not set"**
- Set the environment variable in Lambda console
- Ensure the key has Realtime API access

**"OpenAI API returned 400/401"**  
- Check API key validity
- Verify Realtime API access
- Check OpenAI service status

**"Request timeout"**
- OpenAI API might be slow
- Function will retry automatically
- Check CloudWatch logs for details

### Debug Mode:
Set `LOG_LEVEL=DEBUG` environment variable for verbose logging.

## 🔄 Updates

**To update the function:**
1. **Modify code** locally
2. **Test changes** 
3. **Commit and push** (if using CodeBuild)
4. **Verify deployment** in AWS Console

**Version control:**
- Each deployment creates a new version
- Previous versions remain available
- Rollback possible if needed

## 🎉 Production Ready

This function is **production-ready** with:
- ✅ Error handling and retries
- ✅ Comprehensive logging  
- ✅ Security best practices
- ✅ Cost optimization
- ✅ Automatic deployment
- ✅ Monitoring and alerting

**Perfect for high-traffic de-escalation training systems!** 🚀

