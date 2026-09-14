import yfinance as yf


async def fetch_yahoo_price(symbol: str) -> dict:
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="5d")
        if hist.empty or len(hist) < 2:
            return {"symbol": symbol, "error": "No data"}

        current = float(hist['Close'].iloc[-1])
        previous = float(hist['Close'].iloc[-2])
        change_pct = ((current / previous) - 1) * 100
        change_val = current - previous

        return {
            "symbol": symbol,
            "price": current,
            "changeDay": change_pct,
            "changeValue": change_val
        }
    except Exception as e:
        return {"symbol": symbol, "error": str(e)}
