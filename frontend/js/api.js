window.delay = ms => new Promise(res => setTimeout(res, ms));

window.fetchTickerData = async function(symbol) {
  if (symbol.startsWith('SECTION:')) return null;

  // Проверяем локальный кэш сначала
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch(e) {}
  if (cache[symbol] && (Date.now() - cache[symbol].timestamp) < CACHE_DURATION) {
    return cache[symbol].data;
  }

  // Запрашиваем данные с нашего Python-бэкенда
  try {
    const response = await fetch(`http://localhost:8000/api/prices/${encodeURIComponent(symbol)}`);
    if (!response.ok) return null;
    const data = await response.json();

    // Сохраняем в кэш
    cache[symbol] = { data, timestamp: Date.now() };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch(e) {}

    return data;
  } catch (e) {
    console.error(`Ошибка API для ${symbol}:`, e);
    return null;
  }
};

window.getCompanyDomain = function(ticker) {
  const domains = {
    'SBER': 'sber.ru', 'SBERP': 'sber.ru', 'VTBR': 'vtb.ru', 'SVCB': 'sovcombank.ru',
    'T': 't-technologies.ru', 'CBOM': 'cbom.ru', 'MOEX': 'moex.com', 'IMOEX': 'moex.com',
    'INDEX_RTS': 'moex.com', 'ASSB': 'absolutbank.ru', 'AVAN': 'avangard.ru', 'SFIN': 'sfin.ru',
    'GAZP': 'gazprom.ru', 'SIBN': 'gazprom.ru', 'LKOH': 'lukoil.ru', 'ROSN': 'rosneft.ru',
    'RNFT': 'rosneft.ru', 'NVTK': 'novatek.ru', 'TATN': 'tatneft.ru', 'TATNP': 'tatneft.ru',
    'SNGS': 'surgutneftegas.ru', 'SNGSP': 'surgutneftegas.ru', 'TRNFP': 'transneft.ru',
    'NGTK': 'ngtk.ru', 'LSNGP': 'lenenergo.ru', 'GMKN': 'nornickel.ru', 'NLMK': 'nlmk.com',
    'CHMF': 'severstal.com', 'CHMK': 'chmk.ru', 'ALRS': 'alrosa.ru', 'RUAL': 'rusal.ru',
    'PLZL': 'polyus.com', 'DOMRF': 'дом.рф', 'POLY': 'polymetal.com', 'SPBE': 'spbexchange.ru',
    'RASP': 'raspadskaya.ru', 'TGMK': 'tugmk.ru', 'IRGZ': 'irg.ru', 'AKRN': 'akron.ru',
    'PHOR': 'phosagro.ru', 'URKZ': 'urkz.ru', 'RBCM': 'rbcm.ru', 'SMLT': 'samlet.ru',
    'FEES': 'rosseti.ru', 'RENI': 'renins.ru', 'IRAO': 'interrao.ru', 'ENPG': 'enel.ru',
    'UPRO': 'unipro.ru', 'MSNG': 'mosenergo.ru', 'DVEC': 'dvec.ru', 'OGKB': 'ogk2.ru',
    'TGKA': 'tgka.ru', 'TGKB': 'tgkb.ru', 'TGKD': 'tgkd.ru', 'TGSN': 'tgsn.ru',
    'VGSB': 'vgsb.ru', 'VGSO': 'vgso.ru', 'VJGZ': 'vjgz.ru', 'MSRS': 'msrs.ru',
    'KOGK': 'kogk.ru', 'RKKE': 'rkke.ru', 'THRO': 'thro.ru', 'TKIM': 'tkim.ru',
    'YNDX': 'yandex.ru', 'MTSS': 'mts.ru', 'RTKM': 'rostelecom.ru', 'RTKMP': 'rostelecom.ru',
    'VKCO': 'vk.company', 'OZON': 'ozon.ru', 'POSI': 'group.ptsecurity.com', 'HEAD': 'investor.hh.ru',
    'DIAS': 'diasoft.ru', 'CNRU': 'ir.ciangroup.ru', 'ASTS': 'asts.ru', 'MGNT': 'magnit.ru',
    'X5': 'x5.ru', 'FIVE': '5ka.ru', 'LENT': 'lenta.com', 'DETL': 'detmir.ru', 'MVID': 'mvideo.ru',
    'SELG': 'selgros.ru', 'OKEY': 'ok.ru', 'AFLT': 'aeroflot.ru', 'FLOT': 'sovcomflot.ru',
    'FESH': 'fesco.ru', 'NMTP': 'nmtport.ru', 'TRMK': 'tmk-group.com', 'RAGR': 'rusagro.ru',
    'AGRO': 'rusagrogroup.ru', 'AFKS': 'afksistema.ru', 'SGZH': 'sgzh.ru', 'TORS': 'tors.ru',
    'SGBE': 'sgbe.ru', 'MRKY': 'mrk-group.ru', 'MRKS': 'mrk-group.ru', 'MRK': 'mrk-group.ru',
    'MRKP': 'mrk-group.ru', 'MRKU': 'mrk-group.ru', 'BELU': 'beluga.ru', 'BLNG': 'beluga.ru',
    'DZRD': 'dzerzhinsk.ru', 'KMAZ': 'kamaz.ru', 'SPBE': 'spbe.ru', 'USBN': 'usbn.ru',
    'UTAR': 'utar.ru', 'UTII': 'utii.ru', 'UVEK': 'uvek.ru', 'MDMG': 'mcclinics.ru',
    'YRSB': 'yrsb.ru', 'APTK': '366.ru', 'PRMD': 'promomed.pro', 'BTCUSDT': 'bitcoin.org',
    'ETHUSDT': 'ethereum.org', 'BNBUSDT': 'binance.com', 'SOLUSDT': 'solana.com',
    'XRPUSDT': 'ripple.com', 'ADAUSDT': 'cardano.org', 'DOGEUSDT': 'dogecoin.com',
    'TONUSDT': 'ton.org', 'AAPL': 'apple.com', 'TSLA': 'tesla.com', 'MSFT': 'microsoft.com',
    'GOOGL': 'abc.xyz', 'GOOG': 'abc.xyz', 'AMZN': 'amazon.com', 'NVDA': 'nvidia.com',
    'META': 'meta.com', 'NFLX': 'netflix.com', 'INTC': 'intel.com', 'AMD': 'amd.com',
    'CSCO': 'cisco.com', 'ADBE': 'adobe.com', 'PEP': 'pepsico.com', 'COST': 'costco.com',
    'TMUS': 't-mobile.com', 'AVGO': 'broadcom.com', 'TXN': 'ti.com', 'QCOM': 'qualcomm.com',
    'BABA': 'alibaba.com', 'TCEHY': 'tencent.com', 'NIO': 'nio.com'
  };
  return domains[ticker] || null;
};

window.detectExchange = function(symbol) {
  const sym = symbol.toUpperCase().trim();

  // 1. Явное исправление валютных пар MOEX (даже если введен префикс)
  if (sym === 'MOEX:BYNRUB' || sym === 'BYNRUB') return 'MOEX:BYNRUB_TOM';
  if (sym === 'MOEX:USD' || sym === 'USD') return 'MOEX:USD000UTSTOM';
  if (sym === 'MOEX:EUR' || sym === 'EUR') return 'MOEX:EUR_RUB__TOM';
  if (sym === 'MOEX:CNY' || sym === 'CNY') return 'MOEX:CNYRUB';

  // 2. Если уже есть корректный префикс (и это не исправленная выше валюта), оставляем как есть
  if (symbol.includes(':')) return symbol;

  // 3. Криптовалюты
  if (sym.endsWith('USDT') || sym.endsWith('BTC') || sym.endsWith('ETH') || sym === 'BNBUSDT') {
    return `BINANCE:${sym}`;
  }

  // 4. Индексы Мосбиржи
  const moexIndices = ['IMOEX', 'IRUS', 'RTSI', 'RGBI', 'RUBIUSDT', 'MOEX'];

  // 5. Остальные валюты и акции Мосбиржи
  const moexCurrencies = ['BYNRUB_TOM', 'USD000UTSTOM', 'EUR_RUB__TOM', 'CNYRUB', 'RUB'];
  const moexTickers = new Set(['SBER', 'GAZP', 'LKOH', 'VTBR', 'YNDX', 'YDEX', 'TATN', 'MGNT', 'RTKM', 'OZON', 'FIVE', 'LENT', 'AFLT', 'AFKS', 'AKRN', 'ENPG', 'FEES', 'FLOT', 'HYDR', 'IRGZ', 'TRMK', 'UPRO', 'VKCO', 'RAGR', 'AGRO', 'LSNGP', 'NGTK', 'T', 'CBOM', 'ASSB', 'AVAN', 'SFIN', 'TRNFP', 'TGMK', 'URKZ', 'RBCM', 'SMLT', 'TGKA', 'TGKB', 'TGKD', 'TGSN', 'VGSB', 'VGSO', 'VJGZ', 'MSRS', 'KOGK', 'RKKE', 'THRO', 'TKIM', 'HEAD', 'MGTSP', 'CNTL', 'ASTS', 'DETL', 'MVID', 'SELG', 'OKEY', 'FESH', 'NMTP', 'SGBE', 'MRKY', 'MRKS', 'MRK', 'MRKP', 'MRKU', 'BELU', 'BLNG', 'DZRD', 'KMAZ', 'SPBE', 'USBN', 'UTAR', 'UTII', 'UVEK', 'MDMG', 'YRSB', 'APTK', 'PRMD', 'SBERP', 'SIBN', 'TATNP', 'ROSN', 'RNFT', 'GMKN', 'NVTK', 'CHMF', 'CHMK', 'ALRS', 'NLMK', 'PLZL', 'POLY', 'RUAL', 'SNGS', 'SNGSP', 'PHOR', 'IRAO', 'MTSS']);

  if (moexIndices.includes(sym) || moexCurrencies.includes(sym) || moexTickers.has(sym)) {
    return `MOEX:${sym}`;
  }

  // 6. Сырьевые товары и мировые индексы
  if (sym === 'GOLD' || sym === 'XAUUSD') return `OANDA:XAUUSD`;
  if (sym === 'SILVER' || sym === 'XAGUSD') return `OANDA:XAGUSD`;
  if (sym === 'BRENT') return `CAPITALCOM:BRENT`;
  if (sym === 'SPX' || sym === 'SP500') return `FOREXCOM:SPXUSD`;
  if (sym === 'DJI' || sym === 'DOW') return `FOREXCOM:DJI`;
  if (sym === 'NDX' || sym === 'NAS100') return `FOREXCOM:NSXUSD`;
  if (sym === 'VIX') return `FOREXCOM:VIX`;

  // 7. Американские акции
  const nyseTickers = new Set(['T', 'BRK.B', 'WMT', 'JNJ', 'PG', 'MA', 'HD', 'UNH', 'V', 'JPM', 'XOM', 'PFE', 'BAC', 'KO', 'PEP', 'MRK', 'ABBV', 'CVX', 'LLY']);
  if (nyseTickers.has(sym)) return `NYSE:${sym}`;

  // По умолчанию NASDAQ
  return `NASDAQ:${sym}`;
};