# Deployment Guide

This guide covers different deployment options for the Nansen Trading Terminal.

## ⚠️ Vercel Deployment Limitations

**Important:** Vercel is designed for serverless/edge functions and has limitations for this application:

### What Doesn't Work on Vercel:
- ❌ **SQLite database** (serverless functions have ephemeral file systems)
- ❌ **WebSocket connections** (no persistent connections in serverless)
- ❌ **Background monitoring** (no long-running processes)
- ❌ **Scheduled tasks** (limited cron support)

### What Works on Vercel:
- ✅ **Static web dashboard** (HTML/CSS/JS frontend)
- ✅ **API endpoints** (with external database like Turso/PlanetScale)
- ✅ **Manual discovery triggers** (via API calls)

## Recommended Deployment Options

### Option 1: Railway (Recommended for Full Features)

**Best for:** Full-featured deployment with all capabilities

1. **Install Railway CLI:**
```bash
npm install -g @railway/cli
```

2. **Login to Railway:**
```bash
railway login
```

3. **Initialize project:**
```bash
railway init
```

4. **Add environment variables:**
```bash
railway variables set NANSEN_API_KEY=0TlilaRVDfH4DbYmh8a8MR1pJOcmebPK
railway variables set CHAINS=solana,base,bnb
railway variables set PORT=3000
```

5. **Deploy:**
```bash
railway up
```

**Pros:**
- ✅ Full SQLite support
- ✅ WebSocket connections work
- ✅ Background monitoring runs continuously
- ✅ Easy scaling
- ✅ Free tier available

### Option 2: Render

**Best for:** Alternative to Railway with similar features

1. **Create `render.yaml`:**
```yaml
services:
  - type: web
    name: nansen-trading-terminal
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm run dashboard
    envVars:
      - key: NANSEN_API_KEY
        value: 0TlilaRVDfH4DbYmh8a8MR1pJOcmebPK
      - key: CHAINS
        value: solana,base,bnb
```

2. **Push to GitHub and connect to Render**

**Pros:**
- ✅ Full feature support
- ✅ Automatic deployments
- ✅ Free tier available
- ✅ Built-in database options

### Option 3: Fly.io

**Best for:** Global edge deployment

1. **Install Fly CLI:**
```bash
curl -L https://fly.io/install.sh | sh
```

2. **Create `fly.toml`:**
```toml
app = "nansen-trading-terminal"

[build]
  builder = "heroku/buildpacks:20"

[env]
  PORT = "3000"
  NANSEN_API_KEY = "0TlilaRVDfH4DbYmh8a8MR1pJOcmebPK"
  CHAINS = "solana,base,bnb"

[[services]]
  http_checks = []
  internal_port = 3000
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

3. **Deploy:**
```bash
fly launch
fly deploy
```

### Option 4: Digital Ocean App Platform

**Best for:** Simple deployment with good scaling

1. **Connect GitHub repository**
2. **Configure build settings:**
   - Build Command: `npm install && npm run build`
   - Run Command: `npm run dashboard`
3. **Add environment variables** in the dashboard
4. **Deploy**

### Option 5: Vercel (Limited Features)

**Use only if:** You only need the frontend dashboard without backend processing

**Setup:**

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Deploy:**
```bash
vercel
```

3. **Add environment variables in Vercel dashboard:**
   - `NANSEN_API_KEY`
   - All other variables from `.env`

**Important Notes for Vercel:**
- You must use an external database (recommended: Turso for SQLite-compatible API)
- Real-time monitoring won't work (run separately on another service)
- WebSocket features disabled (frontend will poll API instead)
- This is best for a static dashboard that displays data from external sources

## Database Options for Serverless (Vercel)

If deploying to Vercel, use one of these hosted databases:

### 1. Turso (SQLite-compatible)
```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Create database
turso db create nansen-trading

# Get connection URL
turso db show nansen-trading
```

Update `src/database/schema.ts` to use Turso connection string.

### 2. PlanetScale (MySQL)
- Create account at planetscale.com
- Create database
- Get connection string
- Adapt schema for MySQL

### 3. Supabase (PostgreSQL)
- Create project at supabase.com
- Get connection string
- Adapt schema for PostgreSQL

## Environment Variables

All deployment platforms need these variables:

```env
NANSEN_API_KEY=0TlilaRVDfH4DbYmh8a8MR1pJOcmebPK
DATABASE_PATH=./data/trading.db  # Or external DB URL
PORT=3000
WS_PORT=3001
POSITION_SIZE_PERCENT=1
CHAINS=solana,base,bnb
TP1_MULTIPLIER=2
TP1_PERCENT=50
TP2_MULTIPLIER=5
TP2_PERCENT=30
TP3_MULTIPLIER=10
TP3_PERCENT=100
MAX_TOKEN_AGE_BACKTEST_DAYS=7
MAX_TOKEN_AGE_LIVE_DAYS=1
MIN_LIQUIDITY_USD=100000
```

## Recommended Setup

**For best experience:**

1. **Backend + Database:** Deploy to Railway/Render/Fly.io
   - Runs the full Node.js application
   - SQLite database works out of the box
   - Background monitoring runs continuously
   - WebSocket connections for real-time updates

2. **Frontend (Optional):** Deploy static dashboard to Vercel/Netlify
   - Serve the HTML/CSS/JS frontend
   - Connect to backend API deployed on Railway
   - Fast CDN delivery

## Post-Deployment Setup

After deploying:

1. **Verify API is running:**
```bash
curl https://your-app.railway.app/api/stats
```

2. **Test token discovery:**
```bash
curl -X POST https://your-app.railway.app/api/analysis/discover \
  -H "Content-Type: application/json" \
  -d '{"maxAgeDays": 1}'
```

3. **Access dashboard:**
```
https://your-app.railway.app
```

4. **Check logs:**
```bash
railway logs  # Railway
render logs   # Render
fly logs      # Fly.io
```

## Monitoring & Maintenance

### Set up monitoring:
- Use Railway/Render built-in monitoring
- Add external monitoring (UptimeRobot, Pingdom)
- Set up alerts for downtime

### Database backups:
```bash
# Local backup
npm run build
node -e "require('./dist/database/schema').db.backup('./backups/trading-$(date +%Y%m%d).db')"
```

### Update deployment:
```bash
git add .
git commit -m "Update: description"
git push origin main  # Auto-deploys on most platforms
```

## Troubleshooting

### Railway/Render deployment fails
- Check Node.js version compatibility
- Verify all dependencies in package.json
- Check build logs for errors

### Database not persisting (Vercel)
- Vercel doesn't support SQLite
- Must use external database (Turso, PlanetScale)

### WebSocket not working (Vercel)
- Vercel doesn't support WebSocket
- Deploy backend to Railway/Render instead

### Out of memory errors
- Increase memory allocation in platform settings
- Optimize database queries
- Reduce batch sizes in analysis

## Cost Comparison

| Platform | Free Tier | Best For |
|----------|-----------|----------|
| Railway | 500 hours/month | Full features |
| Render | 750 hours/month | Full features |
| Fly.io | 3 VMs free | Edge deployment |
| Vercel | Unlimited | Static frontend only |
| Digital Ocean | $5/month | Production apps |

## Conclusion

**Recommended deployment strategy:**
1. Use **Railway** or **Render** for the full application
2. Optionally use **Vercel** for frontend CDN delivery
3. Avoid using Vercel for the entire application due to serverless limitations

For questions or issues, check the main README.md or create an issue on GitHub.
