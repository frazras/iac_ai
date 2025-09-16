# 🚀 AWS Serverless Deployment Guide
## Direct OpenAI Connection Architecture

This guide walks you through deploying a **cost-effective serverless architecture** (~$2-5/month) for your de-escalation training system that connects directly to OpenAI's Realtime API.

## 📋 Prerequisites

### Required Tools
- **AWS CLI** - [Installation Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- **AWS Account** with appropriate permissions
- **OpenAI API Key** with Realtime API access
- **Terminal/Command Line** access

### AWS Permissions Required
Your AWS user needs these permissions:
- `lambda:*` (Lambda functions)
- `apigateway:*` (API Gateway)
- `s3:*` (S3 buckets)
- `iam:CreateRole`, `iam:AttachRolePolicy` (IAM roles)

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   S3 Website    │    │   API Gateway    │    │   Lambda        │
│   (Frontend)    │◄──►│   (Token API)    │◄──►│   (Token Mint)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                                               │
         ▼                                               ▼
┌─────────────────┐                            ┌─────────────────┐
│   User Browser  │──────────────────────────► │   OpenAI API    │
│                 │    Direct WebSocket        │   (Realtime)    │
└─────────────────┘                            └─────────────────┘
```

**Key Benefits:**
- **Ultra-low latency**: Direct browser ↔ OpenAI connection
- **Minimal cost**: ~$2-5/month total
- **High reliability**: No proxy server to fail
- **Easy scaling**: Serverless auto-scaling

## 🚀 Step-by-Step Deployment

### Step 1: Configure AWS CLI

```bash
# Configure AWS credentials
aws configure

# Verify configuration
aws sts get-caller-identity
```

**Expected Output:**
```json
{
    "UserId": "AIDACKCEVSQ6C2EXAMPLE",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/your-username"
}
```

### Step 2: Deploy Lambda Function

The Lambda function mints ephemeral OpenAI tokens for secure browser access.

```bash
# Navigate to the serverless directory
cd aws-serverless

# Deploy the Lambda function
./deploy-lambda.sh
```

**What this does:**
1. Packages the Lambda function with dependencies
2. Creates IAM execution role (if needed)
3. Deploys/updates the Lambda function
4. Prompts for your OpenAI API key (stored as environment variable)
5. Tests the function

**Expected Output:**
```
🚀 Starting Lambda deployment...
📦 Creating deployment package...
🆕 Creating new function...
🔑 Please enter your OpenAI API key:
[hidden input]
✅ Lambda function created successfully
📋 Function Information:
   Function ARN: arn:aws:lambda:us-east-1:123456789012:function:openai-token-mint
🎉 Lambda deployment completed successfully!
```

**Save the Function ARN** - you'll need it for API Gateway setup.

### Step 3: Create API Gateway HTTP API

We'll create this manually through the AWS Console for simplicity:

#### 3.1 Create the API
1. Go to **AWS Console** → **API Gateway**
2. Click **Create API**
3. Choose **HTTP API** → **Build**
4. API name: `openai-token-api`
5. Click **Next** → **Next** → **Create**

#### 3.2 Create Route
1. In your new API, click **Routes**
2. Click **Create**
3. Method: `POST`
4. Resource path: `/token`
5. Click **Create**

#### 3.3 Create Integration
1. Click **Integrations**
2. Click **Manage integrations** → **Create**
3. Integration type: **Lambda function**
4. Lambda function: `openai-token-mint` (select from dropdown)
5. Click **Create**

#### 3.4 Attach Integration to Route
1. Go back to **Routes**
2. Click on `POST /token`
3. Click **Attach integration**
4. Select your Lambda integration
5. Click **Attach integration**

#### 3.5 Enable CORS
1. Click **CORS**
2. Click **Configure**
3. Access-Control-Allow-Origin: `*`
4. Access-Control-Allow-Headers: `*`
5. Access-Control-Allow-Methods: `POST, OPTIONS`
6. Click **Save**

#### 3.6 Deploy API
1. Click **Deploy**
2. Stage name: `prod`
3. Click **Deploy**

**Save your API Gateway URL** - it will look like:
```
https://abcd1234.execute-api.us-east-1.amazonaws.com/prod
```

Your token endpoint will be:
```
https://abcd1234.execute-api.us-east-1.amazonaws.com/prod/token
```

### Step 4: Deploy Static Website

```bash
# Deploy the S3 static website
./deploy-s3-static.sh
```

**What this does:**
1. Creates a unique S3 bucket
2. Configures static website hosting
3. Sets up public read permissions
4. Uploads your HTML/JS files
5. Sets correct content types

**Expected Output:**
```
🌐 Starting S3 static website deployment...
🪣 Creating S3 bucket: openai-deescalation-training-1699123456
✅ Static website hosting configured
📤 Uploading static files...
🎉 S3 static website deployment completed!

📋 Website Information:
   Website URL: http://openai-deescalation-training-1699123456.s3-website-us-east-1.amazonaws.com
```

**Save your website URL** - this is where users will access the training system.

### Step 5: Configure Frontend

1. **Open your website** in a browser using the S3 URL
2. **Enter your API Gateway token endpoint** in the configuration field:
   ```
   https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/token
   ```
3. **Click "Connect"** to test the integration

## 🧪 Testing Your Deployment

### Test 1: Token Endpoint
```bash
# Test the token endpoint directly
curl -X POST https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/token \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "ephemeralToken": "sess_abc123...",
  "sessionId": "sess_xyz789",
  "expiresAt": 1699123456,
  "message": "Ephemeral token created successfully"
}
```

### Test 2: Complete Workflow
1. **Open your website** in a browser
2. **Enter the token endpoint URL**
3. **Click "Connect"** - should show "Connected"
4. **Click "Start Recording"** - speak for 5-10 seconds
5. **Click "Stop Recording"** - wait for AI response
6. **Check results** - should show grade and feedback

### Test 3: Browser Console
1. **Open browser developer tools** (F12)
2. **Check console logs** for any errors
3. **Look for successful WebSocket connection** to OpenAI

## 📊 Cost Breakdown

### Monthly Costs (Estimated)
| Service | Usage | Cost |
|---------|-------|------|
| **Lambda** | 1,000 requests, 128MB, 5s avg | $0.20 |
| **API Gateway** | 1,000 HTTP requests | $0.35 |
| **S3** | 1GB storage, 1,000 requests | $0.50 |
| **Data Transfer** | 5GB outbound | $0.45 |
| **Total** | | **~$1.50/month** |

### Cost Optimization Tips
- **S3 Intelligent Tiering**: Automatically moves files to cheaper storage
- **CloudWatch Log Retention**: Set to 7 days to reduce costs
- **Lambda Memory**: 128MB is sufficient for token minting
- **Regional Deployment**: Use us-east-1 for lowest costs

## 🔧 Configuration Options

### Environment Variables (Lambda)
- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `LOG_LEVEL`: Set to `INFO` for production (optional)

### Frontend Configuration
- `tokenEndpoint`: Your API Gateway token endpoint URL
- `debugMode`: Set to `false` for production

## 🛠️ Troubleshooting

### Common Issues

#### 1. "Connection failed: 403 Forbidden"
**Cause**: API Gateway CORS not configured properly
**Solution**: 
1. Go to API Gateway Console
2. Configure CORS with `*` for origins
3. Redeploy the API

#### 2. "OpenAI API error: Invalid API key"
**Cause**: Incorrect or missing OpenAI API key
**Solution**:
```bash
# Update Lambda environment variable
aws lambda update-function-configuration \
  --function-name openai-token-mint \
  --environment Variables="{OPENAI_API_KEY=your_correct_key_here}"
```

#### 3. "Failed to connect to OpenAI"
**Cause**: Network or OpenAI API issues
**Solution**: Check OpenAI API status and try again

#### 4. Website not loading
**Cause**: S3 bucket policy or static hosting not configured
**Solution**: Re-run the S3 deployment script

### Debug Commands

```bash
# Check Lambda function
aws lambda invoke \
  --function-name openai-token-mint \
  --payload '{"httpMethod":"POST"}' \
  response.json && cat response.json

# Check API Gateway
curl -v https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/token

# Check S3 website
curl -I http://your-bucket.s3-website-us-east-1.amazonaws.com
```

## 🔄 Updates and Maintenance

### Update Lambda Function
```bash
# After making code changes
./deploy-lambda.sh
```

### Update Static Website
```bash
# After making frontend changes
./deploy-s3-static.sh
```

### Update OpenAI API Key
```bash
aws lambda update-function-configuration \
  --function-name openai-token-mint \
  --environment Variables="{OPENAI_API_KEY=your_new_key}"
```

## 🌟 Optional Enhancements

### 1. Custom Domain (Optional)
- Register domain in Route 53
- Create SSL certificate with Certificate Manager
- Set up CloudFront distribution
- **Additional cost**: ~$0.50/month for domain

### 2. Enhanced Monitoring (Optional)
- CloudWatch dashboards
- Custom metrics and alarms
- **Additional cost**: ~$2-5/month

### 3. Analytics (Optional)
- Add DynamoDB table for session tracking
- Store training results and analytics
- **Additional cost**: ~$1-3/month

## ✅ Success Checklist

- [ ] AWS CLI configured and working
- [ ] Lambda function deployed successfully
- [ ] API Gateway created with correct routes
- [ ] CORS enabled on API Gateway
- [ ] S3 website deployed and accessible
- [ ] Token endpoint URL configured in frontend
- [ ] End-to-end test completed successfully
- [ ] Grade and feedback working correctly

## 🎉 Congratulations!

You now have a **fully functional, cost-effective serverless de-escalation training system** running on AWS for less than $5/month!

### Key Benefits Achieved:
- ✅ **Ultra-low latency** direct OpenAI connection
- ✅ **Minimal infrastructure costs**
- ✅ **Automatic scaling** with no server management
- ✅ **High reliability** with AWS managed services
- ✅ **Easy maintenance** and updates

### Next Steps:
1. **Share the S3 website URL** with your users
2. **Monitor usage** through AWS CloudWatch
3. **Collect feedback** and iterate on the training scenarios
4. **Scale up** as needed with automatic AWS scaling

**Need help?** Check the troubleshooting section or create an issue in your repository.


