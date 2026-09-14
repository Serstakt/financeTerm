// === КОНСТАНТЫ ===
window.STORAGE_KEY = 'multi_watchlists_state';
window.CACHE_KEY = 'price_cache';
window.CACHE_DURATION = 120 * 1000;
window.AUTO_REFRESH_INTERVAL = 120 * 1000;
window.ALERTS_KEY = 'price_alerts';

window.FLAG_COLORS = {
  'red': { name: 'Красный', icon: '🔴', hex: '#ef5350' },
  'blue': { name: 'Синий', icon: '🔵', hex: '#2962ff' },
  'yellow': { name: 'Желтый', icon: '🟡', hex: '#ffca28' },
  'orange': { name: 'Оранжевый', icon: '🟠', hex: '#ff9800' },
  'green': { name: 'Зеленый', icon: '🟢', hex: '#26a69a' }
};

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
window.widget = null;
window.widgetReady = false;
window.debugVisible = false;
window.countdownValue = 120;
window.countdownTimer = null;
window.autoRefreshTimer = null;
window.currentSort = { field: null, direction: 'asc' };
window.activePickerSymbol = null;
window.currentAlertSymbol = null;

window.appState = {
  activeListId: 'default',
  favorites: {},
  lists: {
    'default': { name: 'Основной', tickers: ['MOEX:SBER', 'MOEX:IMOEX'], activeSymbol: 'MOEX:SBER', collapsedSections: [] }
  }
};

// === ФУНКЦИИ СОСТОЯНИЯ ===
window.loadState = function() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      appState = JSON.parse(saved);
      if (!appState.favorites) appState.favorites = {};
      for (const key in appState.lists) {
        if (!appState.lists[key].collapsedSections) appState.lists[key].collapsedSections = [];
      }
    } else {
      const oldList = localStorage.getItem('my_watchlist');
      if (oldList) {
        try {
          const parsed = JSON.parse(oldList);
          if (Array.isArray(parsed) && parsed.length > 0) {
            appState.lists['default'].tickers = parsed;
            appState.lists['default'].activeSymbol = parsed[0];
          }
        } catch(e) {}
        localStorage.removeItem('my_watchlist');
      }
    }
    if (typeof trimAlertsHistory === 'function') trimAlertsHistory();
  } catch (e) { console.error('Ошибка загрузки состояния:', e); }
};

window.saveState = function() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(appState)); }
  catch (e) { if (typeof log === 'function') log('Ошибка записи состояния: ' + e.message, 'error'); }
};

window.getCurrentList = function() { return appState.lists[appState.activeListId] || appState.lists['default']; };

window.switchList = function(listId) {
  if (!appState.lists[listId]) return;
  appState.activeListId = listId;
  saveState();
  populateListSelector();
  currentSort = { field: null, direction: 'asc' };
  document.querySelectorAll('.column-header').forEach(h => {
    h.classList.remove('active');
    h.querySelector('.sort-icon').textContent = '↕';
  });
  if (typeof render === 'function') render();
};

window.populateListSelector = function() {
  const selector = document.getElementById('list-selector');
  selector.innerHTML = '';
  for (const [id, list] of Object.entries(appState.lists)) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = list.name + (list.tickers.length > 0 ? ` (${list.tickers.length})` : '');
    if (id === appState.activeListId) option.selected = true;
    selector.appendChild(option);
  }
};