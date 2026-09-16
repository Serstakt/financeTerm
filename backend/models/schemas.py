from pydantic import BaseModel


class PriceResponse(BaseModel):
    symbol: str
    price: float | None = None
    changeDay: float | None = None
    changeValue: float | None = None
    changeWeek: float | None = None
    changeMonth: float | None = None
    changeYear: float | None = None


class PositionCreate(BaseModel):
    symbol: str
    quantity: float
    avg_price: float
    sector: str = "Не указан"
