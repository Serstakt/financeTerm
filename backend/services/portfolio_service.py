from sqlalchemy import Column, String, Float
from backend.database.database import Base, SessionLocal


class Position(Base):
    __tablename__ = 'positions'
    symbol = Column(String, primary_key=True)
    quantity = Column(Float, nullable=False)
    avg_price = Column(Float, nullable=False)


async def get_portfolio_with_pnl() -> dict:
    db = SessionLocal()
    positions = db.query(Position).all()

    result = []
    total_value = 0
    total_invested = 0

    for pos in positions:
        # Здесь можно добавить запрос к API для получения текущей цены
        # Для примера оставим заглушку или интеграцию с yahoo_service
        current_price = pos.avg_price  # Заглушка, заменить на реальный fetch

        invested = pos.quantity * pos.avg_price
        current_val = pos.quantity * current_price
        pnl = current_val - invested
        pnl_pct = (pnl / invested * 100) if invested > 0 else 0

        total_value += current_val
        total_invested += invested

        result.append({
            "symbol": pos.symbol,
            "quantity": pos.quantity,
            "avg_price": pos.avg_price,
            "current_price": current_price,
            "pnl": round(pnl, 2),
            "pnl_pct": round(pnl_pct, 2)
        })

    db.close()

    total_pnl = total_value - total_invested
    total_pnl_pct = (total_pnl / total_invested * 100) if total_invested > 0 else 0

    return {
        "positions": result,
        "total_value": round(total_value, 2),
        "total_invested": round(total_invested, 2),
        "total_pnl": round(total_pnl, 2),
        "total_pnl_pct": round(total_pnl_pct, 2)
    }


async def add_position(symbol: str, quantity: float, avg_price: float) -> dict:
    db = SessionLocal()
    existing = db.query(Position).filter_by(symbol=symbol).first()

    if existing:
        total_qty = existing.quantity + quantity
        existing.avg_price = ((existing.quantity * existing.avg_price + quantity * avg_price) / total_qty)
        existing.quantity = total_qty
    else:
        db.add(Position(symbol=symbol, quantity=quantity, avg_price=avg_price))

    db.commit()
    db.close()
    return {"status": "ok", "symbol": symbol}


async def remove_position(symbol: str) -> dict:
    db = SessionLocal()
    db.query(Position).filter_by(symbol=symbol).delete()
    db.commit()
    db.close()
    return {"status": "ok"}
