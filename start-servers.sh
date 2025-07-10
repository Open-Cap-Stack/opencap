#!/bin/bash

echo "🚀 Starting OpenCap Backend and Frontend Servers..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js version 18 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Start backend server
echo "🔧 Starting Backend Server..."
cd /Volumes/Cody/projects/opencap-clean
npm install > /dev/null 2>&1
echo "Backend server starting on port 5000..."
node app.js &
BACKEND_PID=$!
echo "✅ Backend server started with PID: $BACKEND_PID"

# Wait a moment for backend to start
sleep 3

# Start frontend server
echo "🔧 Starting Frontend Server..."
cd /Volumes/Cody/projects/opencap-clean/frontend
npm install > /dev/null 2>&1
echo "Frontend server starting on port 5173..."
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend server started with PID: $FRONTEND_PID"

echo ""
echo "🎉 Both servers are now running!"
echo ""
echo "📍 Backend API:  http://localhost:5000"
echo "📍 Frontend App: http://localhost:5173"
echo ""
echo "💡 To stop the servers, run:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "🌐 Open your browser to http://localhost:5173 to see the application"

# Keep script running
wait