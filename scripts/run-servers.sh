#!/bin/bash

echo "🚀 Starting OpenCap Servers..."
echo "Using Node.js from: /opt/homebrew/bin/node"

# Set the PATH to include homebrew
export PATH="/opt/homebrew/bin:$PATH"

# Navigate to project root
cd /Volumes/Cody/projects/opencap-clean

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found even with PATH set"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install backend dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

# Install frontend dependencies if needed
cd frontend
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi
cd ..

# Start backend in background
echo "🔧 Starting backend server..."
node app.js > backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend started with PID: $BACKEND_PID"

# Wait a moment for backend to start
sleep 3

# Start frontend in background
echo "🎨 Starting frontend server..."
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend started with PID: $FRONTEND_PID"
cd ..

echo ""
echo "🎉 Both servers are now running!"
echo ""
echo "📍 Backend API:  http://localhost:5000"
echo "📍 Frontend App: http://localhost:5173"
echo "📚 API Docs:     http://localhost:5000/api-docs"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f backend.log"
echo "   Frontend: tail -f frontend.log"
echo ""
echo "🛑 To stop servers:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Save PIDs for later cleanup
echo $BACKEND_PID > backend.pid
echo $FRONTEND_PID > frontend.pid

echo "🌐 Open http://localhost:5173 in your browser!"
echo "⏳ Servers are starting up... give them 10-15 seconds"

# Wait for user input to stop
echo ""
echo "Press Enter to stop the servers..."
read -r

# Clean shutdown
echo "🛑 Stopping servers..."
kill $BACKEND_PID 2>/dev/null
kill $FRONTEND_PID 2>/dev/null

rm -f backend.pid frontend.pid backend.log frontend.log

echo "✅ Servers stopped!"