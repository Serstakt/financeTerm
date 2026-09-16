import aiohttp
from bs4 import BeautifulSoup
from datetime import datetime
import re

async def fetch_smartlab_telegram_news(ticker: str) -> list:
    """
    Парсит новости из канала @newssmartlab по тикеру
    Ищет по хештегам: $GAZP, #GAZP, $SBER, #SBER и т.д.
    """
    channel_username = "newssmartlab"
    url = f"https://t.me/s/{channel_username}"

    # Smart-Lab использует $GAZP и #GAZP
    hashtags = [
        f"${ticker.upper()}",
        f"#{ticker.upper()}",
        f"${ticker}",
        f"#{ticker}"
    ]

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, timeout=10) as response:
                if response.status != 200:
                    return []
                html = await response.text()

        soup = BeautifulSoup(html, 'html.parser')
        messages = soup.find_all('div', class_='tgme_widget_message_wrap')

        news_list = []

        for msg in messages:
            text_block = msg.find('div', class_='tgme_widget_message_text')
            if not text_block:
                continue

            text = text_block.get_text(strip=True)

            # Проверяем наличие хештега
            if not any(tag in text for tag in hashtags):
                continue

            # Дата публикации
            date_tag = msg.find('time', class_='tgme_widget_message_date')
            pub_date = date_tag.get('datetime', '') if date_tag else ''

            if pub_date:
                try:
                    dt = datetime.fromisoformat(pub_date.replace('Z', '+00:00'))
                    pub_date = dt.strftime('%d.%m %H:%M')
                except:
                    pass

            # Ссылка на пост
            link_tag = msg.find('a', class_='tgme_widget_message_date')
            link = link_tag.get('href', '') if link_tag else f"https://t.me/{channel_username}"

            # Картинка (если есть)
            thumbnail = ""
            media_block = msg.find('a', class_='tgme_widget_message_photo_wrap')
            if media_block:
                style = media_block.get('style', '')
                match = re.search(r"url\('([^']+)'\)", style)
                if match:
                    thumbnail = match.group(1)

            news_list.append({
                "title": text[:200] + ("..." if len(text) > 200 else ""),
                "full_text": text,
                "publisher": "Smart-Lab News",
                "link": link,
                "time": pub_date,
                "thumbnail": thumbnail
            })

            if len(news_list) >= 5:  # Берем 5 последних новостей
                break

        return news_list

    except Exception as e:
        print(f"Ошибка парсинга Telegram: {e}")
        return []