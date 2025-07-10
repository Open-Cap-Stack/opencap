# 🚀 OpenCap Manual Startup Guide

I've debugged the environment and found that Node.js is installed at `/opt/homebrew/bin/node`. Here's exactly what you need to do:

## 🔧 Step-by-Step Instructions

### 1. Open Terminal and Navigate to Project

```bash
cd /Volumes/Cody/projects/opencap-clean
```

### 2. Verify Node.js Installation

```bash
/opt/homebrew/bin/node --version
/opt/homebrew/bin/npm --version
```

You should see version numbers (Node 18+ required).

### 3. Set PATH (Important!)

```bash
export PATH="/opt/homebrew/bin:$PATH"
```

### 4. Install Backend Dependencies

```bash
# In the project root
npm install
```

### 5. Start Backend Server

```bash
# In the project root (/Volumes/Cody/projects/opencap-clean)
node app.js
```

**Expected Output:**
```
✅ MongoDB connected successfully
✅ ZeroDB project initialized successfully
🚀 Server running on port 5000
📚 API Documentation available at http://localhost:5000/api-docs
```

### 6. Start Frontend Server (New Terminal Window)

Open a **NEW** terminal window and run:

```bash
cd /Volumes/Cody/projects/opencap-clean/frontend
export PATH="/opt/homebrew/bin:$PATH"
npm install
npm run dev
```

**Expected Output:**
```
VITE v5.4.2  ready in 1234 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

## 🌐 Access the Application

Once both servers are running:

**Frontend Application:** http://localhost:5173
**Backend API:** http://localhost:5000
**API Documentation:** http://localhost:5000/api-docs

## 🎯 What to Test

### 1. Authentication Flow
- Go to http://localhost:5173
- You should see the login page
- Try logging in (will connect to real backend)

### 2. Document Management
- Navigate to `/app/documents`
- Test file upload (drag & drop)
- Test document download
- Test search and filtering

### 3. Financial Reports
- Navigate to `/app/reports`
- View financial data from backend
- Test export functionality

### 4. Dashboard
- Navigate to `/app/dashboard`
- Real-time data from multiple APIs
- Financial metrics and analytics

### 5. SPV Management
- Navigate to `/app/asset-management`
- SPV creation and management
- Performance analytics

## 🔍 Troubleshooting

### If Backend Won't Start:

1. **Check MongoDB:** Ensure MongoDB is running
   ```bash
   brew services start mongodb/brew/mongodb-community
   ```

2. **Check Environment Variables:** Create `.env` file if missing
   ```bash
   # In project root
   touch .env
   ```

3. **Check Dependencies:**
   ```bash
   npm install
   ```

### If Frontend Won't Start:

1. **Check Node Version:**
   ```bash
   node --version  # Should be 18+
   ```

2. **Clear Node Modules:**
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check Vite Config:**
   ```bash
   cat vite.config.ts  # Should exist
   ```

### If You See API Errors:

1. **Check Backend is Running:** http://localhost:5000 should respond
2. **Check CORS:** Backend should allow frontend origin
3. **Check Network Tab:** In browser dev tools for API calls

## 🚨 Quick Fixes

### Reset Everything:
```bash
# Stop all processes (Ctrl+C in terminals)
# Then restart:

# Terminal 1 - Backend
cd /Volumes/Cody/projects/opencap-clean
export PATH="/opt/homebrew/bin:$PATH"
node app.js

# Terminal 2 - Frontend  
cd /Volumes/Cody/projects/opencap-clean/frontend
export PATH="/opt/homebrew/bin:$PATH"
npm run dev
```

### Alternative Startup Scripts:

I've created these helper scripts you can run:

```bash
# Make executable and run
chmod +x run-servers.sh
./run-servers.sh
```

Or use Node directly:
```bash
node quick-start.js
```

## ✅ Success Indicators

**Backend Started Successfully:**
- Console shows "Server running on port 5000"
- No error messages
- MongoDB connection confirmed

**Frontend Started Successfully:**
- Console shows "Local: http://localhost:5173/"
- No compilation errors
- Browser opens to login page

**Integration Working:**
- Login page loads without errors
- Can navigate between pages
- No API connection errors in browser console
- Real data displays in dashboard/documents/reports

## 🎉 Expected Results

Once both servers are running, you should see:

- **Real Authentication:** JWT tokens, session management
- **File Upload:** Actual file handling, not mock data
- **Database Integration:** Real data from MongoDB
- **ZeroDB Features:** Vector search, document embedding
- **API Validation:** Form validation with backend rules
- **Error Handling:** Proper error messages and loading states

The frontend is now fully integrated with the backend APIs - no more mock data!

---

**🔧 If you continue having issues, please share the exact error messages you see when running these commands.**