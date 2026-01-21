# Quick Start Guide

Get your Nansen Trading Terminal up and running in 5 minutes!

## Step 1: Get Your Nansen API Key

1. Go to https://app.nansen.ai/api
2. Log in to your Nansen account
3. Generate a new API key
4. Copy the API key

## Step 2: Configure the Terminal

Edit the `.env` file and add your API key:

```bash
NANSEN_API_KEY=your_actual_api_key_here
```

That's it! The default configuration is ready to go for Solana, Base, and BNB chains.

## Step 3: Start the Web Dashboard

```bash
npm run dashboard
```

Then open http://localhost:3000 in your browser.

You'll see:
- Live statistics
- Active trading signals
- Recently discovered tokens
- Interactive controls

## Step 4: Discover Your First Tokens

On the dashboard, click the "🔍 Discover New Tokens" button.

The system will:
1. Query smart money DEX trades on Solana, Base, and BNB
2. Filter tokens < 1 day old with good liquidity
3. Save them to the database
4. Display them in the "Recent Tokens" section

## Step 5: Generate Trading Signals

After discovering tokens, the system automatically:
1. Analyzes historical smart money entries (TGM DEX Trades)
2. Checks flow intelligence (smart money, whales, public figures)
3. Calculates a flow score (0-100)
4. Generates BUY signals for qualifying tokens

Signals appear in the "Active Buy Signals" section with:
- Entry price
- Smart money count
- Flow score
- Take profit levels (2x, 5x, 10x)
- Fibonacci extension levels

## Alternative: Run Live Monitoring

Instead of using the dashboard, you can run continuous monitoring:

```bash
npm run monitor
```

This will check for new tokens every 5 minutes and automatically generate signals.

## Run Backtests

Test the strategies on historical data:

```bash
npm run backtest
```

This simulates three strategies:
- First Smart Money Entry
- Accumulation Pattern (3+ wallets)
- Flow Confirmation (SM + positive flow)

Results show win rate, average return, and detailed trade history.

## Understanding the Signals

Each BUY signal includes:

**Entry Analysis:**
- First smart money entry price and time
- Number of smart money traders
- Total smart money volume

**Flow Metrics:**
- Flow score (target: 50+, ideal: 70+)
- Smart money net flow
- Whale net flow
- Public figure net flow

**Take Profit Levels:**
- TP1: 2x (exit 50% of position)
- TP2: 5x (exit 30% of position)
- TP3: 10x (exit 100% of position)

**Fibonacci Levels:**
- Use for additional TP targets
- Common levels: 0.618, 1.618

## Trading Workflow

1. **Monitor Dashboard**: Check active signals regularly
2. **Review Metrics**: Focus on high flow scores (70+) and multiple SM traders (3+)
3. **Manual Execution**: Execute trades on your preferred exchange
4. **Position Management**: Exit at TP levels (50% at 2x, 30% at 5x, 100% at 10x)
5. **Track Performance**: Monitor returns and adjust strategy

## Tips for Success

1. **Start with Solana**: Most activity for new tokens
2. **High Flow Score**: Signals with 70+ flow score have better performance
3. **Early Entry**: Check "First SM Entry" time - earlier is better
4. **Multiple Traders**: 3+ smart money traders = higher confidence
5. **Sufficient Liquidity**: Only trade tokens with $100k+ liquidity

## Customization

Edit `.env` to adjust parameters:

```env
# Focus on specific chains
CHAINS=solana

# Adjust position size
POSITION_SIZE_PERCENT=2

# Change take profit levels
TP1_MULTIPLIER=3
TP2_MULTIPLIER=7
TP3_MULTIPLIER=15

# Filter criteria
MAX_TOKEN_AGE_LIVE_DAYS=0.5  # 12 hours
MIN_LIQUIDITY_USD=250000
```

## Troubleshooting

**No tokens discovered?**
- Verify your API key is valid
- Try increasing MAX_TOKEN_AGE_LIVE_DAYS to 2 or 3
- Check if there's recent trading activity on your selected chains

**No signals generated?**
- Lower the flow score threshold by adjusting minFlowScore in code
- Reduce MIN_LIQUIDITY_USD in .env
- Tokens may not meet criteria (need 2+ SM traders, positive flow)

**Dashboard not updating?**
- Refresh the page
- Check if dashboard server is running (port 3000)
- Look for errors in the terminal

## Next Steps

1. Run backtests to understand historical performance
2. Start with paper trading to validate signals
3. Track signal performance to identify best patterns
4. Adjust filters based on results
5. Scale position sizes as you gain confidence

## Need Help?

- Check the full README.md for detailed documentation
- Review API endpoints in dashboard/server.ts
- Examine backtest results to understand strategy performance
- Adjust configuration based on your risk tolerance

Happy trading! 🚀
