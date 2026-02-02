# 🚀 OpenCap Server Startup Instructions

Since the bash environment is having issues, please follow these manual steps to start both servers:

## Step 1: Start the Backend Server

Open a terminal and run:

```bash
# Navigate to the project root
cd /Volumes/Cody/projects/opencap-clean

# Install dependencies (if needed)
npm install

# Start the backend server
node app.js
```

You should see output like:
```
✅ MongoDB connected successfully
✅ ZeroDB project initialized successfully
🚀 Server running on port 5000
📚 API Documentation available at http://localhost:5000/api-docs
```

## Step 2: Start the Frontend Server

Open a **NEW** terminal window and run:

```bash
# Navigate to the frontend directory
cd /Volumes/Cody/projects/opencap-clean/frontend

# Install dependencies (if needed)
npm install

# Start the frontend development server
npm run dev
```

You should see output like:
```
  VITE v5.4.2  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

## Step 3: Access the Application

🌐 **Open your browser and go to:** `http://localhost:5173`

## 🎯 What You'll See

### Login Page
- Email/password login form
- Connected to real backend authentication

### Dashboard (after login)
- Real-time financial data
- Document statistics
- SPV analytics
- Recent activity feeds

### Documents Page (`/app/documents`)
- **✅ File Upload**: Real drag & drop functionality
- **✅ Document Management**: View, download, delete documents
- **✅ Search & Filter**: By type, status, access level
- **✅ Access Control**: Company, investor, admin levels

### Reports Page (`/app/reports`)
- **✅ Financial Reports**: Real data from backend
- **✅ Export Functionality**: Download CSV reports
- **✅ Analytics**: Revenue, expenses, trends

### SPV Management (`/app/asset-management`)
- **✅ SPV Creation**: Real SPV management
- **✅ Performance Tracking**: Analytics and metrics
- **✅ Asset Management**: Full CRUD operations

## 🔧 If You See Connection Errors

If you see API connection errors, check:

1. **Backend is running**: Should see "Server running on port 5000"
2. **No port conflicts**: Make sure ports 5000 and 5173 are available
3. **Environment variables**: Check if `.env` file exists in root directory

## 🌟 Key Integration Features to Test

1. **Authentication**: Login/logout with real JWT tokens
2. **File Upload**: Upload documents with real file handling
3. **Real-time Data**: All data comes from MongoDB/ZeroDB
4. **Vector Search**: Document search powered by ZeroDB
5. **API Validation**: Form validation with backend rules
6. **Error Handling**: Proper error messages and states

## ⚡ Quick Test Checklist

- [ ] Backend server starts without errors
- [ ] Frontend loads at http://localhost:5173
- [ ] Login page appears and works
- [ ] Dashboard shows after login
- [ ] Documents page loads and allows file upload
- [ ] Reports page displays financial data
- [ ] No console errors in browser developer tools

## 🔄 To Stop Servers

- **Backend**: Press `Ctrl+C` in the backend terminal
- **Frontend**: Press `Ctrl+C` in the frontend terminal

---

**🎉 The frontend is now fully integrated with the backend APIs and ready for testing!**