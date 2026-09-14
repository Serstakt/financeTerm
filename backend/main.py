from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
import asyncio

from .services import moex_service, yahoo_service, crypto_service
from .services import portfolio_service
from .models import schemas

app = FastAPI(title="Financial Terminal API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Путь к фронтенду
FRONTEND_PATH = Path(__file__).parent.parent / "frontend"

# Раздаем статику (CSS, JS) напрямую
app.mount("/css", StaticFiles(directory=FRONTEND_PATH / "css"), name="css")
app.mount("/js", StaticFiles(directory=FRONTEND_PATH / "js"), name="js")


# Главная страница
@app.get("/")
async def root():
    return FileResponse(FRONTEND_PATH / "index.html")


# API endpoints
@app.get("/api/prices/{symbol}", response_model=schemas.PriceResponse)
async def get_price(symbol: str):
    try:
        if symbol.startswith("MOEX:"):
            return await moex_service.fetch_moex_price(symbol.replace("MOEX:", ""))
        elif symbol.startswith(("NASDAQ:", "NYSE:")):
            return await yahoo_service.fetch_yahoo_price(symbol)
        elif symbol.startswith("BINANCE:"):
            return await crypto_service.fetch_crypto_price(symbol.replace("BINANCE:", ""))
        else:
            return await yahoo_service.fetch_yahoo_price(symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/portfolio")
async def get_portfolio():
    return await portfolio_service.get_portfolio_with_pnl()


@app.post("/api/portfolio")
async def add_position_endpoint(position: schemas.PositionCreate):
    return await portfolio_service.add_position(position.symbol, position.quantity, position.avg_price)


@app.delete("/api/portfolio/{symbol}")
async def remove_position_endpoint(symbol: str):
    return await portfolio_service.remove_position(symbol)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
