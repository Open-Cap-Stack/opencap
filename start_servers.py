#!/usr/bin/env python3

import subprocess
import os
import time
import signal
import sys

def start_servers():
    print("🚀 Starting OpenCap Servers...")
    
    # Set environment
    node_path = "/opt/homebrew/bin/node"
    npm_path = "/opt/homebrew/bin/npm"
    project_root = "/Volumes/Cody/projects/opencap-clean"
    frontend_dir = os.path.join(project_root, "frontend")
    
    # Check if paths exist
    if not os.path.exists(node_path):
        print(f"❌ Node.js not found at {node_path}")
        return
    
    if not os.path.exists(npm_path):
        print(f"❌ npm not found at {npm_path}")
        return
        
    if not os.path.exists(project_root):
        print(f"❌ Project root not found at {project_root}")
        return
        
    if not os.path.exists(frontend_dir):
        print(f"❌ Frontend directory not found at {frontend_dir}")
        return
    
    print("✅ All paths verified")
    
    # Start backend server
    print("🔧 Starting backend server...")
    try:
        backend_process = subprocess.Popen(
            [node_path, "app.js"],
            cwd=project_root,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        print(f"✅ Backend started with PID: {backend_process.pid}")
    except Exception as e:
        print(f"❌ Failed to start backend: {e}")
        return
    
    # Wait a moment for backend to start
    time.sleep(3)
    
    # Start frontend server
    print("🎨 Starting frontend server...")
    try:
        frontend_process = subprocess.Popen(
            [npm_path, "run", "dev"],
            cwd=frontend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env={**os.environ, "PATH": "/opt/homebrew/bin:" + os.environ.get("PATH", "")}
        )
        print(f"✅ Frontend started with PID: {frontend_process.pid}")
    except Exception as e:
        print(f"❌ Failed to start frontend: {e}")
        # Kill backend if frontend fails
        backend_process.terminate()
        return
    
    print("\n🎉 Both servers are now running!")
    print("\n📍 Backend API:  http://localhost:5000")
    print("📍 Frontend App: http://localhost:5173")
    print("📚 API Docs:     http://localhost:5000/api-docs")
    print("\n🌐 Open http://localhost:5173 in your browser!")
    print("⏳ Give the servers 10-15 seconds to fully start up")
    
    # Function to handle shutdown
    def signal_handler(sig, frame):
        print("\n🛑 Shutting down servers...")
        backend_process.terminate()
        frontend_process.terminate()
        
        # Wait for processes to terminate
        backend_process.wait(timeout=5)
        frontend_process.wait(timeout=5)
        
        print("✅ Servers stopped!")
        sys.exit(0)
    
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Monitor processes
    try:
        while True:
            # Check if processes are still running
            backend_status = backend_process.poll()
            frontend_status = frontend_process.poll()
            
            if backend_status is not None:
                print(f"❌ Backend process exited with code {backend_status}")
                # Get error output
                _, stderr = backend_process.communicate()
                if stderr:
                    print("Backend errors:", stderr)
                break
                
            if frontend_status is not None:
                print(f"❌ Frontend process exited with code {frontend_status}")
                # Get error output
                _, stderr = frontend_process.communicate()
                if stderr:
                    print("Frontend errors:", stderr)
                break
            
            time.sleep(1)
            
    except KeyboardInterrupt:
        signal_handler(signal.SIGINT, None)

if __name__ == "__main__":
    start_servers()