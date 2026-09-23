from sqlalchemy import Column, String, Text, DateTime, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import json
from backend.database.database import Base, SessionLocal, engine


class FinancialReport(Base):
    __tablename__ = 'financial_reports'
    
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, index=True, nullable=False)
    period_type = Column(String, nullable=False)  # 'quarterly' или 'annual'
    period = Column(String, nullable=False)  # например 'Q1 2024' или '2024'
    end_date = Column(String, nullable=True)  # дата окончания периода
    metrics_json = Column(Text, nullable=False)  # JSON с метриками
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Создаем таблицу
Base.metadata.create_all(bind=engine)


async def save_financial_data(ticker: str, period_type: str, period: str, 
                               end_date: str, metrics: dict) -> dict:
    """Сохраняет финансовые данные в БД"""
    db = SessionLocal()
    try:
        # Проверяем, есть ли уже такая запись
        existing = db.query(FinancialReport).filter_by(
            ticker=ticker,
            period_type=period_type,
            period=period
        ).first()
        
        if existing:
            # Обновляем существующую запись
            existing.metrics_json = json.dumps(metrics)
            existing.end_date = end_date
            existing.updated_at = datetime.utcnow()
        else:
            # Создаем новую запись
            report = FinancialReport(
                ticker=ticker,
                period_type=period_type,
                period=period,
                end_date=end_date,
                metrics_json=json.dumps(metrics)
            )
            db.add(report)
        
        db.commit()
        
        return {
            "status": "ok",
            "ticker": ticker,
            "period_type": period_type,
            "period": period,
            "end_date": end_date,
            "metrics": metrics
        }
    except Exception as e:
        db.rollback()
        return {
            "status": "error",
            "message": str(e)
        }
    finally:
        db.close()


async def get_financial_data(ticker: str, period_type: str = None) -> dict:
    """Получает финансовые данные для тикера"""
    db = SessionLocal()
    try:
        query = db.query(FinancialReport).filter_by(ticker=ticker)
        
        if period_type:
            query = query.filter_by(period_type=period_type)
        
        reports = query.order_by(FinancialReport.created_at.desc()).all()
        
        result = {
            "ticker": ticker,
            "quarterly": {"periods": [], "data": {}},
            "annual": {"periods": [], "data": {}}
        }
        
        for report in reports:
            metrics = json.loads(report.metrics_json)
            period_data = {
                "period": report.period,
                "end_date": report.end_date
            }
            
            # Добавляем период в список
            result[report.period_type]["periods"].append(period_data)
            
            # Добавляем метрики
            for key, value in metrics.items():
                if key not in result[report.period_type]["data"]:
                    result[report.period_type]["data"][key] = {}
                result[report.period_type]["data"][key][report.period] = value
        
        # Сортируем периоды
        for ptype in ["quarterly", "annual"]:
            periods = result[ptype]["periods"]
            if ptype == "quarterly":
                # Сортировка кварталов
                import re
                def parse_quarter(p):
                    match = re.match(r'Q(\d+)\s+(\d+)', p.get("period", ""))
                    if match:
                        return int(match.group(2)) * 10 + int(match.group(1))
                    return 0
                periods.sort(key=lambda x: parse_quarter(x))
            else:
                # Сортировка годов
                periods.sort(key=lambda x: int(x.get("period", "0")))
        
        return result
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
    finally:
        db.close()


async def delete_financial_data(ticker: str, period_type: str, period: str) -> dict:
    """Удаляет финансовые данные"""
    db = SessionLocal()
    try:
        report = db.query(FinancialReport).filter_by(
            ticker=ticker,
            period_type=period_type,
            period=period
        ).first()
        
        if report:
            db.delete(report)
            db.commit()
            return {"status": "ok"}
        else:
            return {"status": "error", "message": "Запись не найдена"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()


async def process_report_with_llm(file_content: bytes, file_type: str, 
                                   ticker: str, period_type: str) -> dict:
    """
    Обрабатывает файл с отчетностью с помощью LLM и извлекает метрики.
    
    В реальной реализации здесь будет вызов LLM API для парсинга файла.
    Сейчас это заглушка, которая возвращает тестовые данные.
    """
    # TODO: Интегрировать с LLM для парсинга файлов
    # Примерный план:
    # 1. Отправить файл в LLM (Claude, GPT-4 Vision, etc.)
    # 2. Попросить извлечь финансовые метрики в формате JSON
    # 3. Распарсить ответ и вернуть структурированные данные
    
    # Для демонстрации возвращаем тестовые данные
    # В реальности здесь будет логика вызова LLM API
    
    import random
    
    # Генерируем случайные данные для демонстрации
    base_value = random.uniform(1e8, 1e10)
    
    metrics = {
        "revenue": base_value,
        "gross_profit": base_value * random.uniform(0.3, 0.5),
        "operating_income": base_value * random.uniform(0.1, 0.25),
        "net_income": base_value * random.uniform(0.05, 0.15),
        "ebitda": base_value * random.uniform(0.15, 0.3),
        "eps": random.uniform(1, 10),
        "pe_ratio": random.uniform(10, 30),
        "roe": random.uniform(10, 25),
        "debt_to_equity": random.uniform(0.3, 1.5),
        "current_ratio": random.uniform(1, 3),
        "free_cash_flow": base_value * random.uniform(0.05, 0.15)
    }
    
    # Определяем период и дату окончания
    from datetime import datetime, timedelta
    
    if period_type == "quarterly":
        # Определяем квартал
        current_month = datetime.now().month
        current_quarter = (current_month - 1) // 3 + 1
        period = f"Q{current_quarter} {datetime.now().year}"
        end_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    else:
        period = str(datetime.now().year - 1)
        end_date = f"{datetime.now().year - 1}-12-31"
    
    return {
        "period": period,
        "end_date": end_date,
        "metrics": metrics
    }
