# Vercel Deployment Instructions

## ⚠️ Important Limitations

This application is designed to run as a full Node.js server with SQLite database and WebSocket connections. **Vercel has limitations** that affect functionality:

- **No SQLite support** (ephemeral file system)
- **No WebSocket** (serverless doesn't support persistent connections)
- **No background processes** (no continuous monitoring)

## What Works on Vercel

- ✅ Static frontend dashboard (HTML/CSS/JS)
- ✅ Can view the UI design
- ❌ Backend API endpoints won't work without external database
- ❌ Real-time features won't function

## Recommended Approach

### Option 1: Full Features (Recommended)

Deploy to **Railway**, **Render**, or **Fly.io** instead for full functionality.

See `DEPLOYMENT.md` for detailed instructions.

### Option 2: Vercel for Frontend Only

If you still want to use Vercel:

1. Deploy backend to Railway/Render
2. Deploy frontend to Vercel
3. Update API URLs in frontend to point to your backend

## Deploy to Vercel (Frontend Only)

1. **Push to GitHub** (already done):
```bash
git push origin main
```

2. **Go to Vercel Dashboard:**
   - Visit https://vercel.com
   - Click "Add New Project"
   - Import from GitHub: `hurcanpolat/NansenMemeTracker`

3. **Configure Project:**
   - Framework Preset: Other
   - Build Command: (leave empty)
   - Output Directory: `src/dashboard/public`
   - Install Command: `npm install`

4. **Add Environment Variables** (in Vercel dashboard):
   ```
   NANSEN_API_KEY=0TlilaRVDfH4DbYmh8a8MR1pJOcmebPK
   ```

5. **Deploy**

## Expected Result on Vercel

You'll see the dashboard UI, but:
- No live data (API not connected)
- Buttons won't work without backend
- Shows static design only

## Full Production Deployment

For a working production system, follow the guide in `DEPLOYMENT.md` to deploy to:
- **Railway** (easiest)
- **Render**
- **Fly.io**
- **Digital Ocean**

All of these support the full feature set including SQLite, WebSocket, and background monitoring.

## Quick Start with Railway (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up

# Set environment variable
railway variables set NANSEN_API_KEY=0TlilaRVDfH4DbYmh8a8MR1pJOcmebPK
```

Your app will be live at a Railway URL with all features working!
