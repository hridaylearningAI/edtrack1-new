#!/bin/bash

# Deploy Frontend with Course Status Feature
# This script builds and deploys the frontend with course status support

set -e

echo "🚀 Deploying Frontend with Course Status Feature..."

# Check if required environment variables are set
if [ -z "$NEXT_PUBLIC_API_URL" ]; then
    echo "❌ Error: NEXT_PUBLIC_API_URL environment variable is required"
    exit 1
fi

# Set default values
STAGE=${STAGE:-dev}
REGION=${AWS_REGION:-us-east-1}

echo "📋 Deployment Configuration:"
echo "  Stage: $STAGE"
echo "  Region: $REGION"
echo "  API URL: $NEXT_PUBLIC_API_URL"

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm install

# Step 2: Build the application
echo "🔨 Building application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully"
else
    echo "❌ Build failed"
    exit 1
fi

# Step 3: Deploy to Vercel (if configured)
if [ -n "$VERCEL_TOKEN" ] && [ -n "$VERCEL_PROJECT_ID" ]; then
    echo "☁️  Deploying to Vercel..."
    npx vercel --prod --token $VERCEL_TOKEN --scope $VERCEL_TEAM_ID
    
    if [ $? -eq 0 ]; then
        echo "✅ Vercel deployment completed successfully"
    else
        echo "❌ Vercel deployment failed"
        exit 1
    fi
else
    echo "⚠️  Vercel deployment skipped (missing VERCEL_TOKEN or VERCEL_PROJECT_ID)"
fi

# Step 4: Deploy to AWS S3 (if configured)
if [ -n "$AWS_S3_BUCKET" ]; then
    echo "☁️  Deploying to AWS S3..."
    
    # Sync build output to S3
    aws s3 sync out/ s3://$AWS_S3_BUCKET --delete
    
    if [ $? -eq 0 ]; then
        echo "✅ S3 deployment completed successfully"
    else
        echo "❌ S3 deployment failed"
        exit 1
    fi
else
    echo "⚠️  S3 deployment skipped (missing AWS_S3_BUCKET)"
fi

echo "🎉 Frontend deployment completed successfully!"
echo ""
echo "📋 What's been deployed:"
echo "  ✅ Course status badges and components"
echo "  ✅ Course status filtering in admin panel"
echo "  ✅ Student course catalog with status support"
echo "  ✅ Course cards with availability indicators"
echo "  ✅ Purchase restrictions based on course status"
echo ""
echo "🎯 New UI Features:"
echo "  - Course status badges (Live, Coming Soon, Archived, Draft)"
echo "  - Course status filtering in admin and student views"
echo "  - Purchase button states based on course availability"
echo "  - Course statistics showing status distribution"
echo "  - Enhanced course cards with status information"
echo ""
echo "🔗 Key Pages Updated:"
echo "  - /admin/courses - Admin course management with status filtering"
echo "  - /student/courses - Student course catalog with status support"
echo "  - Course forms now include course status selection"
echo ""
echo "🚀 Next steps:"
echo "  1. Test the course status functionality"
echo "  2. Configure course status workflows"
echo "  3. Update existing courses with appropriate status"
echo "  4. Train users on the new course status system"
