# Deploy to Vercel Right Now

## GitHub Repository
✅ **Already synced:** https://github.com/hurcanpolat/NansenMemeTracker

## Quick Vercel Deployment (Frontend Only)

### Step 1: Go to Vercel
Visit: https://vercel.com/new

### Step 2: Import Repository
1. Click "Import Git Repository"
2. Search for: `hurcanpolat/NansenMemeTracker`
3. Click "Import"

### Step 3: Configure Build
- **Framework Preset:** Other
- **Root Directory:** `./`
- **Build Command:** (leave empty)
- **Output Directory:** `src/dashboard/public`
- **Install Command:** `npm install`

### Step 4: Environment Variables
Add this variable:
```
NANSEN_API_KEY=0TlilaRVDfH4DbYmh8a8MR1pJOcmebPK
```

### Step 5: Deploy
Click "Deploy" button!

---

## ⚠️ Important: What You'll Get on Vercel

**The dashboard UI will display** but:
- ❌ No live data (no database)
- ❌ No real-time updates (no WebSocket)
- ❌ No monitoring (no background processes)
- ✅ Only static frontend HTML/CSS/JS

This is because Vercel is serverless and doesn't support:
- SQLite databases
- WebSocket connections
- Long-running processes

---

## For Full Features: Deploy to Railway Instead

**Railway supports everything** and is just as easy:

### Quick Railway Setup (5 minutes)

1. **Install Railway CLI:**
```bash
npm install -g @railway/cli
```

2. **Login:**
```bash
railway login
```

3. **Initialize & Deploy:**
```bash
railway init
railway up
```

4. **Add API Key:**
```bash
railway variables set NANSEN_API_KEY=0TlilaRVDfH4DbYmh8a8MR1pJOcmebPK
```

5. **Done!** Your app will be live with all features at a Railway URL.

**Railway gives you:**
- ✅ SQLite database working
- ✅ WebSocket for real-time updates
- ✅ Background monitoring running 24/7
- ✅ All API endpoints working
- ✅ Free 500 hours/month

---

## Recommended Approach

**Option A: Full Working App**
→ Deploy to Railway (see above)

**Option B: Just Frontend Preview**
→ Deploy to Vercel (see top section)

**Option C: Hybrid (Best)**
→ Backend on Railway + Frontend on Vercel
→ Update API URL in frontend to point to Railway

---

## After Deployment

**Test your deployment:**
```bash
curl https://your-app-url/api/stats
```

**Access dashboard:**
```
https://your-app-url
```

**View in browser and click "Discover Tokens"**

---

## Repository Status

✅ Git initialized
✅ Committed to local repo
✅ Pushed to GitHub: https://github.com/hurcanpolat/NansenMemeTracker
✅ Ready for Vercel deployment
✅ Ready for Railway deployment
✅ All features working locally

## Current Setup

- **API Key:** Configured in `.env`
- **Chains:** Solana, Base, BNB
- **Database:** SQLite (local)
- **Port:** 3000 (dashboard)

## Next Actions

1. **Try Vercel** (frontend only) - https://vercel.com/new
2. **Or try Railway** (full features) - see commands above
3. **Test locally** first: `npm run dashboard`

Choose the deployment option that fits your needs!
