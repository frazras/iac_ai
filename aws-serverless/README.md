# 🎯 AWS Serverless De-escalation Training System

**Ultra-low-cost serverless architecture** (~$2-5/month) using WebRTC for direct OpenAI Realtime API connection with maximum performance and minimal latency.

## 🚀 Quick Start

### Prerequisites
- AWS account with appropriate permissions
- OpenAI API key with Realtime API access
- Git repository for CodeBuild deployment

### Deploy Everything
```bash
# 1. Deploy Lambda function via CodeBuild (automatic)
git push  # Triggers CodeBuild deployment

# 2. Create API Gateway (manual - see DEPLOYMENT_GUIDE.md)
#    - Create HTTP API
#    - Add POST /token route  
#    - Connect to Lambda function
#    - Enable CORS

# 3. Update user.js with your API Gateway URL
#    - Edit tokenEndpoint in AI_SERVICE_CONFIG
#    - Upload to your Storyline course
```

### Test Your Deployment
1. Upload updated user.js to your Storyline course
2. Click "Start Recording" → speak → "Stop Recording"
3. Get AI feedback and grade via WebRTC!

## 📁 Project Structure

```
aws-serverless/
├── lambda-token-mint/           # Lambda function for token minting
│   ├── lambda_function.py       # Main Lambda code
│   ├── requirements.txt         # Python dependencies
│   ├── buildspec.yml           # CodeBuild configuration
│   ├── codebuild-iam-policy.json  # IAM policy for CodeBuild
│   └── README.md               # Lambda documentation
├── DEPLOYMENT_GUIDE.md         # Detailed setup instructions
├── CODEBUILD_SETUP.md          # CodeBuild setup guide
└── README.md                   # This file
```

## 🏗️ Architecture

```
Browser (WebRTC) → API Gateway → Lambda (token) → OpenAI Realtime API (direct WebRTC)
```

**Key Benefits:**
- **WebRTC connection**: Direct browser-to-OpenAI audio streaming
- **Ultra-low cost**: ~$2-5/month total
- **Sub-second latency**: No proxy server delays
- **Auto-scaling**: Serverless handles any load
- **Manual control**: Preserves user start/stop experience

## 💰 Cost Breakdown

| Service | Monthly Cost |
|---------|-------------|
| Lambda (token minting) | $0.20 |
| API Gateway HTTP | $0.35 |
| S3 Static Website | $0.50 |
| Data Transfer | $0.45 |
| **Total** | **~$1.50/month** |

## 🔧 Services Used

### AWS Services
- **Lambda**: Ephemeral token minting only
- **API Gateway HTTP**: Token endpoint
- **S3**: Static website hosting
- **IAM**: Execution roles

### External Services
- **OpenAI Realtime API**: Direct browser connection

## 📋 Features

- ✅ **WebRTC speech-to-speech** communication
- ✅ **AI-powered grading** (1-10 scale)
- ✅ **Instant feedback** and coaching
- ✅ **Manual start/stop control** (preserved UX)
- ✅ **Storyline integration** ready
- ✅ **No authentication** required (public access)
- ✅ **Debug logging** and error handling

## 🧪 Testing

### Local Testing
```bash
# Test Lambda function
aws lambda invoke \
  --function-name openai-token-mint \
  --payload '{"httpMethod":"POST"}' \
  response.json

# Test API Gateway
curl -X POST https://your-api-id.execute-api.us-east-2.amazonaws.com/token
```

### Storyline Integration Testing
1. Upload updated user.js to Storyline course
2. Test WebRTC connection establishment
3. Complete a full training session with manual start/stop
4. Verify grade and feedback appear in Storyline variables

## 🔄 Updates

### Update Lambda Code
```bash
# After modifying lambda_function.py
git add . && git commit -m "IAC-31: Update Lambda function" && git push
# CodeBuild automatically deploys changes
```

### Update Frontend
```bash
# After modifying user.js
git add user.js && git commit -m "IAC-31: Update frontend" && git push
# Upload updated user.js to Storyline course
```

## 📖 Documentation

- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**: Complete step-by-step setup
- **[CODEBUILD_SETUP.md](CODEBUILD_SETUP.md)**: CodeBuild deployment setup
- **[Lambda Function](lambda-token-mint/lambda_function.py)**: Token minting code
- **[user.js](../user.js)**: WebRTC frontend implementation

## 🆘 Support

### Common Issues
- **CORS errors**: Check API Gateway CORS configuration
- **Token failures**: Verify OpenAI API key in Lambda environment
- **WebRTC connection fails**: Check browser console for detailed errors
- **No AI response**: Verify data channel is open and response.create sent

### Debug Commands
```bash
# Check AWS configuration
aws sts get-caller-identity

# View Lambda logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/openai-token-mint"

# View CodeBuild logs
aws logs describe-log-groups --log-group-name-prefix "/aws/codebuild/openai-token-mint-deploy"
```

## 🎉 Success!

Once deployed, you'll have a **production-ready de-escalation training system** that:
- Costs less than **$5/month**
- Handles **unlimited concurrent users** 
- Provides **sub-second WebRTC response times**
- Requires **zero server maintenance**
- Integrates **seamlessly with Articulate Storyline**

Perfect for corporate training, educational platforms, and skill assessment!


