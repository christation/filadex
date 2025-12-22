#!/bin/bash

# Filadex Local Development Setup Script
# This script helps set up the development environment

set -e

echo "🚀 Filadex Local Development Setup"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version must be 16 or higher. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL client not found. Please ensure PostgreSQL is installed."
    echo "   You can install PostgreSQL or use Docker to run it."
else
    echo "✅ PostgreSQL client found"
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created"
    echo "⚠️  Please update .env with your database credentials"
else
    echo "✅ .env file already exists"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"

# Check database connection
echo ""
echo "🔍 Checking database connection..."
if [ -f .env ]; then
    source .env
    if [ -z "$DATABASE_URL" ]; then
        echo "⚠️  DATABASE_URL not set in .env file"
        echo "   Please configure your database connection in .env"
    else
        echo "✅ DATABASE_URL is configured"
        echo "   Make sure PostgreSQL is running and accessible"
    fi
else
    echo "⚠️  .env file not found"
fi

echo ""
echo "📋 Next steps:"
echo "   1. Update .env with your database credentials"
echo "   2. Ensure PostgreSQL is running"
echo "   3. Run: npm run db:push (to set up database schema)"
echo "   4. Run: node init-data.js (to initialize data, optional)"
echo "   5. Run: npm run dev (to start development server)"
echo ""
echo "✨ Setup complete! Happy coding!"

