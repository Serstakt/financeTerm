import aiohttp
from bs4 import BeautifulSoup
from datetime import datetime
import re
import asyncio

_news_cache = {}
CACHE_DURATION = 600

RU_NAMES = {
    'ROSN': ['Роснефть', 'Роснефти'],
    'SBER': ['Сбербанк', 'Сбер', 'Сбербанка'],
    'GAZP': ['Газпром', 'Газпрома', 'Газпрому'],
    'LKOH': ['Лукойл', 'Лукойла'],
    'YNDX': ['Яндекс', 'Яндекса'],
    'MGNT': ['Магнит', 'Магнита'],
    'NVTK': ['Новатэк', 'Новатэка'],
    'GMKN': ['Норникель', 'Норильский никель'],
    'CHMF': ['Северсталь', 'Северстали'],
    'NLMK': ['НЛМК'],
    'VTBR': ['ВТБ'],
    'TATN': ['Татнефть', 'Татнефти'],
    'SNGS': ['Сургутнефтегаз'],
    'ALRS': ['Алроса', 'Алросы'],
    'PHOR': ['ФосАгро'],
    'POLY': ['Полюс', 'Полюса'],
    'MTSS': ['МТС'],
    'RTKM': ['Ростелеком', 'Ростелекома'],
    'MOEX': ['Московская биржа', 'Мосбиржа', 'Мосбирже'],
    'AFLT': ['Аэрофлот', 'Аэрофлота'],
    'FIVE': ['Пятерочка', 'X5'],
    'LENT': ['Лента', 'Ленты'],
    'OZON': ['Озон', 'Озона'],
    'VKCO': ['ВК', 'ВКонтакте', 'Mail.ru'],
    'YDEX': ['Яндекс', 'Яндекса'],
    'SIBN': ['Газпром нефть', 'Газпромнефть'],
    'TRNFP': ['Транснефть', 'Транснефти'],
    'IRAO': ['Интер РАО', 'Интеррао'],
    'ENPG': ['Энел', 'Энел Россия'],
    'FEES': ['Россети', 'Россетей'],
    'HYDR': ['РусГидро', 'Русгидро'],
}

async def fetch_smartlab_telegram_news(ticker: str, max_posts: int = 1000, max_news: int = 50, force_refresh: bool = False) -> list:
    channel_username = "newssmartlab"
    cache_key = f"{ticker}_{max_posts}_{max_news}"

    # 1. Проверяем кэш, если не запрошено принудительное обновление
    if not force_refresh and cache_key in _news_cache:
        cached_time, cached_news = _news_cache[cache_key]
        # Проверяем, не истекло ли 5 минут (300 секунд)
        if (datetime.now() - cached_time).total_seconds() < CACHE_DURATION:
            print(f"✅ Возвращаем новости из кэша для {ticker} (осталось {(CACHE_DURATION - (datetime.now() - cached_time).total_seconds()):.0f} сек)")
            return cached_news
        else:
            print(f"⏳ Кэш устарел для {ticker}, запускаем парсинг...")
            del _news_cache[cache_key] # Удаляем только если устарел

    search_terms = [
        f"${ticker.upper()}",
        f"#{ticker.upper()}",
        ticker.upper(),
    ]
    if ticker.upper() in RU_NAMES:
        search_terms.extend(RU_NAMES[ticker.upper()])

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    news_list = []
    total_checked = 0
    before_id = None
    page = 0
    last_min_id = None  # Для проверки, что движемся назад

    print(f"🔍 Начинаем парсинг для {ticker}")
    print(f"📋 Ищем: {search_terms}")
    print(f"🎯 Цель: проверить {max_posts} постов, найти до {max_news} новостей")

    try:
        while total_checked < max_posts and len(news_list) < max_news:
            page += 1

            # Формируем URL с пагинацией
            if before_id:
                url = f"https://t.me/s/{channel_username}?before={before_id}"
            else:
                url = f"https://t.me/s/{channel_username}"

            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, timeout=10) as response:
                    if response.status != 200:
                        print(f"❌ Telegram вернул статус {response.status}")
                        break
                    html = await response.text()

            soup = BeautifulSoup(html, 'html.parser')
            messages = soup.find_all('div', class_='tgme_widget_message_wrap')

            if not messages:
                print(f"⚠️ Страница {page}: нет сообщений, останавливаемся")
                break

            # Логируем первую и последнюю запись
            first_text = ""
            last_text = ""
            page_ids = []

            for msg in messages:
                tb = msg.find('div', class_='tgme_widget_message_text')
                if tb:
                    text = tb.get_text(strip=True)
                    if not first_text:
                        first_text = text[:60]
                    last_text = text[:60]

                # ИЗВЛЕКАЕМ ID ИЗ URL ССЫЛКИ (более надежно)
                link_tag = msg.find('a', class_='tgme_widget_message_date')
                if link_tag and link_tag.get('href'):
                    href = link_tag['href']
                    # Формат: https://t.me/newssmartlab/12345
                    match = re.search(r'/(\d+)$', href)
                    if match:
                        msg_id = int(match.group(1))
                        page_ids.append(msg_id)

            print(f" Стр.{page}: {len(messages)} постов | before_id={before_id}")
            print(f"   Первая: '{first_text}...'")
            print(f"   Последняя: '{last_text}...'")

            if not page_ids:
                print(f"⚠️ Не удалось извлечь ID сообщений, останавливаемся")
                break

            # Находим минимальный ID на странице (самый старый пост)
            min_id = min(page_ids)

            # Проверяем, что мы действительно движемся назад
            if last_min_id is not None and min_id >= last_min_id:
                print(f"🔄 ID не уменьшается ({min_id} >= {last_min_id}), пагинация сломалась, останавливаемся")
                break

            last_min_id = min_id

            # Обрабатываем каждое сообщение
            for msg in messages:
                total_checked += 1

                text_block = msg.find('div', class_='tgme_widget_message_text')
                if not text_block:
                    continue

                text = text_block.get_text(strip=True)
                text_lower = text.lower()

                # Проверяем наличие поисковых терминов
                found = False
                matched_term = None
                for term in search_terms:
                    if term.lower() in text_lower:
                        found = True
                        matched_term = term
                        break

                if not found:
                    continue

                # Нашли совпадение!
                print(f"✅ Совпадение #{len(news_list)+1} (термин: '{matched_term}')")

                # === ДИАГНОСТИКА И ИЗВЛЕЧЕНИЕ ДАТЫ ===
                pub_date = "Дата не указана"

                # 1. Находим ссылку, содержащую дату
                date_link = msg.find('a', class_='tgme_widget_message_date')

                if date_link:
                    # ДИАГНОСТИКА: Печатаем сырой HTML
                    print(f"   🔍 RAW HTML ДАТЫ: {str(date_link)[:150]}...")

                    # 2. Ищем тег <time> внутри ссылки
                    time_tag = date_link.find('time')

                    if time_tag and time_tag.has_attr('datetime'):
                        dt_str = time_tag['datetime']
                        print(f"   ✅ Найден атрибут datetime: {dt_str}")

                        try:
                            dt_str_clean = dt_str.replace('Z', '+00:00')
                            dt = datetime.fromisoformat(dt_str_clean)
                            pub_date = dt.strftime('%d.%m.%Y %H:%M')
                            print(f"   🎯 Успешно распарсено в: {pub_date}")
                        except Exception as e:
                            print(f"   ⚠️ Ошибка парсинга ISO: {e}")
                            pub_date = time_tag.get_text(strip=True)
                    else:
                        print(f"   ⚠️ Тег <time> или атрибут datetime не найден")
                        pub_date = date_link.get_text(strip=True)
                else:
                    print(f"   ⚠️ Ссылка с классом tgme_widget_message_date не найдена в посте")

                # 4. Умный фоллбэк: если в итоге осталось только время (например, "07:51"), добавляем сегодня
                # (import re уже есть в самом начале файла, здесь он не нужен!)
                if re.match(r'^\d{2}:\d{2}$', pub_date):
                    today = datetime.now().strftime('%d.%m.%Y')
                    pub_date = f"{today} {pub_date}"
                    print(f"   ℹ️ Применен фоллбэк: добавлена сегодняшняя дата -> {pub_date}")
                # ========================================

                # Извлекаем ссылку
                link_tag = msg.find('a', class_='tgme_widget_message_date')
                link = link_tag.get('href', '') if link_tag else f"https://t.me/{channel_username}"

                news_list.append({
                    "title": text[:200] + ("..." if len(text) > 200 else ""),
                    "full_text": text,
                    "publisher": "Smart-Lab News",
                    "link": link,
                    "time": pub_date
                })

                if len(news_list) >= max_news:
                    break

            # Устанавливаем before_id для следующей страницы (минимальный ID - 1)
            before_id = min_id - 1
            print(f"   → Следующий before_id: {before_id}")

            # Задержка после каждой сотни постов
            if total_checked % 100 == 0 and total_checked > 0:
                print(f"️ Пауза после {total_checked} постов...")
                await asyncio.sleep(0.1)

        print(f"\n✅ Завершено. Проверено: {total_checked}, найдено: {len(news_list)}")

        _news_cache[cache_key] = (datetime.now(), news_list)
        return news_list

    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return news_list