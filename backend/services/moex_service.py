import aiohttp


async def fetch_moex_price(ticker: str) -> dict:
    url = f"https://iss.moex.com/iss/engines/stock/markets/shares/boards/TQBR/securities/{ticker}.json"
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status != 200:
                return {"symbol": f"MOEX:{ticker}", "error": "Not found"}
            data = await response.json()

    if not data.get('marketdata', {}).get('data'):
        return {"symbol": f"MOEX:{ticker}", "error": "No data"}

    columns = data['marketdata']['columns']
    row = data['marketdata']['data'][0]

    price = row[columns.index('LAST')] or row[columns.index('LASTVALUE')]
    change_percent = row[columns.index('LASTTOPREVPRICE')] or row[columns.index('LASTCHANGEPRC')]
    change_value = row[columns.index('CHANGE')] or row[columns.index('LASTCHANGE')]

    return {
        "symbol": f"MOEX:{ticker}",
        "price": float(price) if price else None,
        "changeDay": float(change_percent) if change_percent else None,
        "changeValue": float(change_value) if change_value else None
    }
