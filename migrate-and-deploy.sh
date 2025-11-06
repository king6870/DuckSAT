#!/bin/bash

set -e

echo "+====================================+"  
echo "|  Prisma Migration & Deploy Script  |"  
echo "+====================================+"

# Check for required environment variables
if [ -z "$DATABASE_URL" ]; then  
  echo "ERROR: DATABASE_URL is not set."  
  exit 1  
fi

if [ -z "$NEXTAUTH_URL" ]; then  
  echo "WARNING: NEXTAUTH_URL is not set. (Ignore if not using NextAuth)"  
fi

echo ""  
echo "[1/4] Installing dependencies..."  
npm install

echo ""  
echo "[2/4] Generating Prisma client..."  
npx prisma generate

echo ""  
echo "[3/4] Deploying database migrations..."  
npx prisma migrate deploy

echo ""  
echo "[4/4] Building Next.js app..."  
npm run build

echo ""  
echo "✅ All done! All migrations are applied & your app is built."