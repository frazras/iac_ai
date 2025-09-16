# 🚀 AWS CodeBuild Setup for Lambda Auto-Deployment

This guide shows you how to set up **automatic Lambda function deployment** using AWS CodeBuild. Just push your code and the Lambda function updates automatically!

## 📁 Files Created

- `buildspec.yml` - CodeBuild build configuration
- `codebuild-iam-policy.json` - IAM permissions for CodeBuild
- This setup guide

## 🔧 Manual AWS Setup Steps

### Step 1: Create CodeBuild Service Role

1. **Go to AWS Console** → **IAM** → **Roles**
2. **Click "Create Role"**
3. **Select "AWS Service"** → **CodeBuild** → **Next**
4. **Attach these policies:**
   - `AWSCodeBuildDeveloperAccess` (AWS managed)
   - Custom policy (see Step 2)
5. **Role name:** `CodeBuildLambdaRole`
6. **Click "Create Role"**

### Step 2: Add Custom Lambda Permissions

1. **In the role you just created**, click **"Add permissions"** → **"Create inline policy"**
2. **Switch to JSON tab**
3. **Copy the contents** of `codebuild-iam-policy.json`
4. **Replace `YOUR-AWS-ACCOUNT-NUMBER`** with your actual AWS account number
5. **Policy name:** `LambdaUpdatePermissions`
6. **Click "Create policy"**

### Step 3: Create CodeBuild Project

1. **Go to AWS Console** → **CodeBuild** → **Build projects**
2. **Click "Create build project"**

**Project Configuration:**
- **Project name:** `openai-token-mint-deploy`
- **Description:** `Auto-deploy OpenAI token mint Lambda function`

**Source:**
- **Source provider:** `GitHub` (or your preferred Git provider)
- **Repository:** Your repository URL
- **Source version:** `main` (or your default branch)
- **Git clone depth:** `1`

**Environment:**
- **Environment image:** `Managed image`
- **Operating system:** `Amazon Linux 2`
- **Runtime:** `Standard`
- **Image:** `aws/codebuild/amazonlinux2-x86_64-standard:4.0`
- **Environment type:** `Linux`
- **Service role:** `CodeBuildLambdaRole` (created in Step 1)

**Buildspec:**
- **Build specifications:** `Use a buildspec file`
- **Buildspec name:** `aws-serverless/lambda-token-mint/buildspec.yml`

**Artifacts:**
- **Type:** `No artifacts` (we're updating Lambda directly)

**Logs:**
- **CloudWatch logs:** `Enabled`
- **Group name:** `/aws/codebuild/openai-token-mint-deploy`

3. **Click "Create build project"**

### Step 4: Set Up Automatic Triggers (Optional)

**For GitHub Integration:**
1. **In your CodeBuild project**, click **"Edit"** → **"Source"**
2. **Enable "Webhook"**
3. **Event type:** `PUSH`
4. **Branch filter:** `^refs/heads/main$` (or your branch)
5. **Path filter:** `aws-serverless/lambda-token-mint/.*`

This will trigger builds only when files in the Lambda directory change.

## 🧪 Testing Your Setup

### Manual Build Test
1. **Go to your CodeBuild project**
2. **Click "Start build"**
3. **Watch the logs** - should see:
   ```
   Installing dependencies for OpenAI token mint Lambda...
   Creating deployment package for openai-token-mint...
   Updating Lambda function: openai-token-mint...
   Lambda function updated successfully!
   ```

### Automatic Build Test
1. **Make a small change** to `lambda_function.py` (add a comment)
2. **Commit and push** to your repository
3. **Check CodeBuild** - should automatically start building
4. **Verify Lambda** was updated in AWS Console

## 📋 Build Process Details

### What the Build Does:
1. **Install Dependencies** - Downloads packages from `requirements.txt`
2. **Create Package** - Zips everything into `deployment_package.zip`
3. **Update Lambda** - Pushes new code to your Lambda function
4. **Log Success** - Confirms deployment completed

### Build Environment:
- **Python 3.11** runtime
- **AWS CLI** pre-installed
- **Full Lambda update permissions**
- **CloudWatch logging** enabled

## 🔍 Troubleshooting

### Common Issues:

**"Access Denied" errors:**
- Check your CodeBuild service role has the Lambda permissions
- Verify the account number in the IAM policy is correct
- Ensure the Lambda function name matches exactly

**"Function not found" errors:**
- Make sure the Lambda function `openai-token-mint` exists
- Check the region matches (us-east-1)
- Verify the function name in `buildspec.yml`

**Build fails on dependencies:**
- Check `requirements.txt` is in the correct location
- Verify Python version compatibility
- Look at CloudWatch logs for specific error details

### Debug Commands:
```bash
# Check if Lambda function exists
aws lambda get-function --function-name openai-token-mint

# View recent builds
aws codebuild list-builds-for-project --project-name openai-token-mint-deploy

# Check build logs
aws logs describe-log-groups --log-group-name-prefix /aws/codebuild/openai-token-mint-deploy
```

## 🎯 Workflow Summary

```
1. Code Change → 2. Git Push → 3. CodeBuild Trigger → 4. Lambda Updated
```

**Perfect for:**
- ✅ Continuous deployment
- ✅ Team collaboration  
- ✅ Automated testing integration
- ✅ Version control integration
- ✅ Zero-downtime updates

## 🚀 Ready to Deploy!

Once set up, your workflow becomes:

1. **Edit `lambda_function.py`** locally
2. **Commit and push** changes
3. **CodeBuild automatically** updates Lambda
4. **Lambda function** is live with new code!

**No more manual deployments** - just code and push! 🎉

## 📝 Next Steps

After CodeBuild is working:
1. **Set up the same process** for your static website (S3)
2. **Add automated testing** to the build process
3. **Configure notifications** for build success/failure
4. **Add environment-specific deployments** (dev/staging/prod)

Your serverless CI/CD pipeline is now **production-ready**! 🚀

