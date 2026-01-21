# Nansen Trading Terminal

A comprehensive trading terminal built with TypeScript that leverages the Nansen API to discover tokens through smart money analytics, backtest trading strategies, and generate real-time trading signals.

## Features

### 1. Token Discovery & Analytics
- **Token Screener**: Discover new tokens with smart money activity on Solana, Base, and BNB chains
- **Smart Money DEX Trades**: Monitor real-time trades from sophisticated traders and funds
- **Flow Intelligence**: Analyze token flows from smart money, whales, and public figures
- **Historical Analysis**: Use TGM DEX Trades to find when smart money first entered positions

### 2. Backtesting Engine
- Test multiple entry strategies:
  - **First Smart Money Entry**: Buy when first smart money wallet trades
  - **Accumulation Pattern**: Buy when 3+ smart money wallets accumulate within a window
  - **Flow Confirmation**: Buy when smart money + positive flow from whales/public figures
- Track performance metrics: win rate, avg return, max drawdown, sharpe ratio
- Analyze trade history and identify profitable patterns

### 3. Signal Generation
- Automated BUY signals based on:
  - Smart money activity (minimum 2+ traders)
  - Positive flow score (50+ out of 100)
  - Sufficient liquidity ($100k+ minimum)
  - Token age filters (< 7 days backtest, < 1 day live)
- Take profit levels with position management:
  - TP1: 2x (exit 50%)
  - TP2: 5x (exit 30%)
  - TP3: 10x (exit 100%)
- Fibonacci extension levels for additional TP targets

### 4. Web Dashboard
- Real-time signal feed with WebSocket updates
- Active signal monitoring with entry/TP levels
- Token discovery dashboard
- Performance statistics and analytics
- Backtest results viewer

## Installation

1. Clone the repository:
```bash
cd nansen-trading-terminal
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Add your Nansen API key to `.env`:
```env
NANSEN_API_KEY=your_nansen_api_key_here
```

Get your API key from: https://app.nansen.ai/api

## Configuration

Edit `.env` to customize:

```env
# Chains to monitor
CHAINS=solana,base,bnb

# Position sizing
POSITION_SIZE_PERCENT=1

# Take profit levels
TP1_MULTIPLIER=2
TP1_PERCENT=50
TP2_MULTIPLIER=5
TP2_PERCENT=30
TP3_MULTIPLIER=10
TP3_PERCENT=100

# Token filtering
MAX_TOKEN_AGE_BACKTEST_DAYS=7
MAX_TOKEN_AGE_LIVE_DAYS=1
MIN_LIQUIDITY_USD=100000
```

## Usage

### Web Dashboard (Recommended)

Start the web dashboard for real-time monitoring:

```bash
npm run dashboard
```

Then open http://localhost:3000 in your browser.

Features:
- Live token discovery feed
- Active trading signals with TP levels
- Fibonacci levels for price targets
- Real-time updates via WebSocket
- Manual discovery and analysis triggers

### Live Monitoring

Run continuous monitoring that checks for new tokens every 5 minutes:

```bash
npm run monitor
```

The monitor will:
1. Discover new tokens with smart money activity
2. Analyze historical smart money entries
3. Check flow intelligence data
4. Generate BUY signals for qualifying tokens

### Backtesting

Test strategies on historical data:

```bash
npm run backtest
```

This will run backtests on three strategies:
- First Smart Money Entry
- Accumulation Pattern
- Flow Confirmation

Results include:
- Total signals generated
- Win rate and avg return
- Max drawdown
- Individual trade details

### Development Mode

```bash
npm run dev
```

## Project Structure

```
nansen-trading-terminal/
├── src/
│   ├── api/              # Nansen API client
│   ├── database/         # SQLite schema and repositories
│   ├── analytics/        # Token discovery, flow analysis, signals
│   ├── backtest/         # Backtesting engine
│   ├── monitor/          # Live monitoring
│   ├── dashboard/        # Web dashboard and API
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Config, logging, fibonacci
├── data/                 # SQLite database
└── package.json
```

## API Documentation

The dashboard server exposes these REST endpoints:

- `GET /api/signals/active` - Get active trading signals
- `GET /api/signals/all?limit=50` - Get all signals
- `GET /api/tokens/recent?limit=20` - Get recently discovered tokens
- `GET /api/backtest/results?limit=10` - Get backtest results
- `GET /api/backtest/results/:id/trades` - Get trades for a backtest
- `POST /api/analysis/discover` - Manually trigger token discovery
- `POST /api/analysis/analyze` - Analyze specific tokens
- `GET /api/stats` - Get dashboard statistics

WebSocket messages:
- `tokens_discovered` - New tokens found
- `signals_generated` - New signals created

## Trading Workflow

### Phase 1: Discovery
1. Monitor Smart Money DEX Trades for new tokens (< 1 day old)
2. Filter by liquidity (> $100k)
3. Save tokens to database

### Phase 2: Analysis
1. Pull TGM DEX Trades to find historical smart money entries
2. Analyze Flow Intelligence for smart money, whale, and public figure activity
3. Calculate flow score (0-100)

### Phase 3: Signal Generation
1. Check criteria:
   - 2+ smart money traders
   - Flow score ≥ 50
   - Positive net flow from smart money
   - Sufficient liquidity
2. Generate BUY signal with:
   - Entry price (current or first SM entry)
   - Take profit levels (2x, 5x, 10x)
   - Fibonacci levels
   - Flow metrics

### Phase 4: Execution
- Signals displayed on dashboard
- Manual execution on your exchange
- Track position through TP levels
- Exit at 2x (50%), 5x (30%), 10x (100%)

## Backtesting Strategies

### 1. First Smart Money Entry
- Enter when first smart money wallet buys
- Most aggressive, highest risk/reward
- Best for catching early momentum

### 2. Accumulation Pattern
- Wait for 3+ smart money wallets within 60 min window
- More conservative, higher confidence
- Lower risk, potentially lower upside

### 3. Flow Confirmation
- Require both smart money trades AND positive flow
- Combines multiple data sources
- Highest quality signals, fewer opportunities

## Risk Management

- Fixed 1% position size per trade
- Gradual profit-taking at 2x, 5x, 10x
- Use Fibonacci levels for additional exits
- Only trade tokens with $100k+ liquidity
- Focus on new tokens (< 1 day) for live trading

## Troubleshooting

### "NANSEN_API_KEY is required"
- Make sure you created `.env` file
- Add your API key from https://app.nansen.ai/api

### Database locked errors
- Only run one process at a time (dashboard OR monitor, not both)
- Or use different database files

### No tokens discovered
- Check your API key is valid
- Verify chains are active (try 'solana' first)
- Increase MAX_TOKEN_AGE_LIVE_DAYS temporarily

### WebSocket connection failed
- Dashboard server must be running
- Check WS_PORT in .env (default 3001)
- Firewall may be blocking WebSocket

## Performance Tips

1. **Start with one chain**: Solana has most activity for new tokens
2. **Adjust filters**: Lower MIN_LIQUIDITY_USD to find more tokens
3. **Monitor flow score**: Signals with 70+ flow score have higher win rate
4. **Check first SM entry time**: Earlier entry = better upside potential

## Next Steps

1. Run backtests to validate strategies on historical data
2. Start live monitoring to collect real-time data
3. Use dashboard to review signals and pick best opportunities
4. Track performance and adjust filters based on results

## License

MIT
