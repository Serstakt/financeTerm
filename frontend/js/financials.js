// ==========================================================================
// ФИНАНСОВЫЕ ПОКАЗАТЕЛИ - МОДУЛЬ УПРАВЛЕНИЯ
// ==========================================================================

const FinancialsModule = (function() {
    // Состояние
    let state = {
        tickers: [],
        selectedTicker: null,
        periodType: 'quarterly', // 'quarterly' или 'annual'
        financialData: {} // { ticker: { periods: [...], metrics: {...} } }
    };

    // Стандартные метрики для отображения
    const defaultMetrics = [
        { key: 'revenue', name: 'Выручка' },
        { key: 'gross_profit', name: 'Валовая прибыль' },
        { key: 'operating_income', name: 'Операционная прибыль' },
        { key: 'net_income', name: 'Чистая прибыль' },
        { key: 'ebitda', name: 'EBITDA' },
        { key: 'eps', name: 'EPS (прибыль на акцию)' },
        { key: 'pe_ratio', name: 'P/E Ratio' },
        { key: 'roe', name: 'ROE' },
        { key: 'debt_to_equity', name: 'Debt/Equity' },
        { key: 'current_ratio', name: 'Current Ratio' },
        { key: 'free_cash_flow', name: 'Свободный денежный поток' }
    ];

    // Инициализация модуля
    function init() {
        loadTickersFromStorage();
        setupEventListeners();
        renderTickerList();
        // Загружаем данные для всех тикеров из API
        loadAllFinancialDataFromAPI();
        console.log('Financials Module initialized');
    }

    // Загрузка всех данных из API
    async function loadAllFinancialDataFromAPI() {
        if (state.tickers.length === 0) return;
        
        for (const ticker of state.tickers) {
            try {
                const response = await fetch(`/api/financials/${ticker}`);
                if (response.ok) {
                    const data = await response.json();
                    
                    // Обновляем состояние данными из API
                    if (!state.financialData[ticker]) {
                        state.financialData[ticker] = {
                            quarterly: { periods: [], data: {} },
                            annual: { periods: [], data: {} }
                        };
                    }
                    
                    // Merge данных из API
                    if (data.quarterly && data.quarterly.periods) {
                        data.quarterly.periods.forEach(p => {
                            if (!state.financialData[ticker].quarterly.periods.find(ep => ep.period === p.period)) {
                                state.financialData[ticker].quarterly.periods.push(p);
                            }
                        });
                        // Merge metrics
                        Object.keys(data.quarterly.data || {}).forEach(metricKey => {
                            if (!state.financialData[ticker].quarterly.data[metricKey]) {
                                state.financialData[ticker].quarterly.data[metricKey] = {};
                            }
                            Object.assign(state.financialData[ticker].quarterly.data[metricKey], data.quarterly.data[metricKey]);
                        });
                    }
                    
                    if (data.annual && data.annual.periods) {
                        data.annual.periods.forEach(p => {
                            if (!state.financialData[ticker].annual.periods.find(ep => ep.period === p.period)) {
                                state.financialData[ticker].annual.periods.push(p);
                            }
                        });
                        // Merge metrics
                        Object.keys(data.annual.data || {}).forEach(metricKey => {
                            if (!state.financialData[ticker].annual.data[metricKey]) {
                                state.financialData[ticker].annual.data[metricKey] = {};
                            }
                            Object.assign(state.financialData[ticker].annual.data[metricKey], data.annual.data[metricKey]);
                        });
                    }
                }
            } catch (error) {
                console.error(`Ошибка загрузки данных для ${ticker}:`, error);
            }
        }
        
        saveFinancialDataToStorage();
        if (state.selectedTicker) {
            renderFinancialTable();
        }
    }

    // Загрузка тикеров из localStorage
    function loadTickersFromStorage() {
        const stored = localStorage.getItem('financials_tickers');
        if (stored) {
            try {
                state.tickers = JSON.parse(stored);
            } catch (e) {
                state.tickers = [];
            }
        }
        
        // Загрузка финансовых данных
        const storedData = localStorage.getItem('financials_data');
        if (storedData) {
            try {
                state.financialData = JSON.parse(storedData);
            } catch (e) {
                state.financialData = {};
            }
        }
    }

    // Сохранение тикеров в localStorage
    function saveTickersToStorage() {
        localStorage.setItem('financials_tickers', JSON.stringify(state.tickers));
    }

    // Сохранение финансовых данных
    function saveFinancialDataToStorage() {
        localStorage.setItem('financials_data', JSON.stringify(state.financialData));
    }

    // Настройка обработчиков событий
    function setupEventListeners() {
        // Добавление тикера
        const addBtn = document.getElementById('financials-add-ticker-btn');
        const searchInput = document.getElementById('financials-search-input');
        
        if (addBtn) {
            addBtn.addEventListener('click', addTicker);
        }
        
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    addTicker();
                }
            });
        }
    }

    // Добавление тикера
    function addTicker() {
        const input = document.getElementById('financials-search-input');
        const ticker = input.value.trim().toUpperCase();
        
        if (!ticker) {
            alert('Введите тикер');
            return;
        }
        
        if (state.tickers.includes(ticker)) {
            alert('Этот тикер уже добавлен');
            return;
        }
        
        state.tickers.push(ticker);
        saveTickersToStorage();
        renderTickerList();
        input.value = '';
        
        // Инициализируем пустые данные для тикера если их нет
        if (!state.financialData[ticker]) {
            state.financialData[ticker] = {
                quarterly: { periods: [], data: {} },
                annual: { periods: [], data: {} }
            };
            saveFinancialDataToStorage();
        }
    }

    // Удаление тикера
    function removeTicker(ticker, event) {
        event.stopPropagation();
        
        if (!confirm(`Удалить тикер ${ticker}?`)) {
            return;
        }
        
        state.tickers = state.tickers.filter(t => t !== ticker);
        if (state.selectedTicker === ticker) {
            state.selectedTicker = null;
        }
        saveTickersToStorage();
        renderTickerList();
    }

    // Выбор тикера
    function selectTicker(ticker) {
        state.selectedTicker = ticker;
        renderTickerList();
        updateSelectedLabel();
        renderFinancialTable();
    }

    // Обновление метки выбранного тикера
    function updateSelectedLabel() {
        const label = document.getElementById('selected-ticker-label');
        if (label) {
            label.textContent = state.selectedTicker || 'Выберите тикер';
        }
    }

    // Отрисовка списка тикеров
    function renderTickerList() {
        const container = document.getElementById('financials-ticker-list');
        if (!container) return;
        
        if (state.tickers.length === 0) {
            container.innerHTML = '<div class="empty-state">Список пуст. Добавьте тикеры для анализа.</div>';
            return;
        }
        
        container.innerHTML = state.tickers.map(ticker => `
            <div class="financials-ticker-item ${state.selectedTicker === ticker ? 'active' : ''}" 
                 onclick="FinancialsModule.selectTicker('${ticker}')">
                <span class="ticker-name">${ticker}</span>
                <button class="ticker-remove" onclick="FinancialsModule.removeTicker('${ticker}', event)" title="Удалить">×</button>
            </div>
        `).join('');
    }

    // Переключение периода (кварталы/годы)
    function setPeriodType(periodType) {
        state.periodType = periodType;
        
        // Обновляем активную кнопку
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.period === periodType);
        });
        
        renderFinancialTable();
    }

    // Отрисовка таблицы финансовых показателей
    function renderFinancialTable() {
        const headerRow = document.getElementById('financials-table-header');
        const tbody = document.getElementById('financials-table-body');
        
        if (!headerRow || !tbody) return;
        
        if (!state.selectedTicker) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Выберите тикер для отображения данных</td></tr>';
            headerRow.innerHTML = '<th>Показатель</th>';
            return;
        }
        
        const tickerData = state.financialData[state.selectedTicker];
        const periodData = tickerData ? tickerData[state.periodType] : null;
        const periods = periodData ? periodData.periods : [];
        
        // Если нет данных, показываем заглушку
        if (!periods || periods.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Нет данных за ${state.periodType === 'quarterly' ? 'кварталы' : 'годы'}. Загрузите отчетность.</td></tr>`;
            
            // Заголовок только с первым столбцом
            headerRow.innerHTML = '<th>Показатель</th>';
            for (let i = 0; i < 5; i++) {
                headerRow.innerHTML += `<th>-</th>`;
            }
            return;
        }
        
        // Берем последние 5 периодов
        const displayPeriods = periods.slice(-5);
        
        // Рендерим заголовок
        headerRow.innerHTML = '<th>Показатель</th>' + displayPeriods.map(p => `
            <th>
                <div>${p.period}</div>
                <div class="period-header">${p.endDate || ''}</div>
            </th>
        `).join('');
        
        // Рендерим строки с метриками
        const metricsData = periodData ? periodData.data : {};
        
        tbody.innerHTML = defaultMetrics.map(metric => {
            const values = displayPeriods.map(period => {
                const value = metricsData[metric.key] ? metricsData[metric.key][period.period] : null;
                return value !== null && value !== undefined ? formatMetricValue(metric.key, value) : '-';
            });
            
            return `
                <tr>
                    <td class="metric-name">${metric.name}</td>
                    ${values.map(v => `<td>${v}</td>`).join('')}
                </tr>
            `;
        }).join('');
    }

    // Форматирование значения метрики
    function formatMetricValue(key, value) {
        if (value === null || value === undefined) return '-';
        
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return value;
        
        // Проценты
        if (['roe', 'debt_to_equity', 'current_ratio'].includes(key)) {
            return numValue.toFixed(2) + (key === 'roe' || key === 'debt_to_equity' ? '%' : 'x');
        }
        
        // Большие числа (выручка, прибыль и т.д.)
        if (Math.abs(numValue) >= 1e9) {
            return (numValue / 1e9).toFixed(2) + 'B';
        }
        if (Math.abs(numValue) >= 1e6) {
            return (numValue / 1e6).toFixed(2) + 'M';
        }
        
        return numValue.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Получение данных для API
    function getFinancialData(ticker) {
        return state.financialData[ticker] || null;
    }

    // Обновление данных из API
    function updateFinancialData(ticker, periodType, period, endDate, metrics) {
        if (!state.financialData[ticker]) {
            state.financialData[ticker] = {
                quarterly: { periods: [], data: {} },
                annual: { periods: [], data: {} }
            };
        }
        
        const targetData = state.financialData[ticker][periodType];
        
        // Проверяем, есть ли уже такой период
        const existingIndex = targetData.periods.findIndex(p => p.period === period);
        
        if (existingIndex >= 0) {
            // Обновляем существующий период
            targetData.periods[existingIndex] = { period, endDate };
        } else {
            // Добавляем новый период
            targetData.periods.push({ period, endDate });
            // Сортируем периоды
            targetData.periods.sort((a, b) => {
                if (periodType === 'quarterly') {
                    // Сортировка кварталов вида "Q1 2024"
                    const parseQuarter = (p) => {
                        const match = p.match(/Q(\d+)\s+(\d+)/);
                        if (match) {
                            return parseInt(match[2]) * 10 + parseInt(match[1]);
                        }
                        return 0;
                    };
                    return parseQuarter(a.period) - parseQuarter(b.period);
                } else {
                    // Сортировка годов
                    return parseInt(a.period) - parseInt(b.period);
                }
            });
        }
        
        // Обновляем данные по метрикам
        Object.keys(metrics).forEach(key => {
            if (!targetData.data[key]) {
                targetData.data[key] = {};
            }
            targetData.data[key][period] = metrics[key];
        });
        
        saveFinancialDataToStorage();
        renderFinancialTable();
    }

    // Экспорт состояния для использования извне
    return {
        init,
        addTicker,
        removeTicker,
        selectTicker,
        setPeriodType,
        renderTickerList,
        renderFinancialTable,
        updateFinancialData,
        getFinancialData,
        getState: () => state
    };
})();

// Глобальные функции для HTML
function setFinancialPeriod(periodType) {
    FinancialsModule.setPeriodType(periodType);
}

function selectTicker(ticker) {
    FinancialsModule.selectTicker(ticker);
}

function removeTicker(ticker, event) {
    FinancialsModule.removeTicker(ticker, event);
}

function openUploadReportModal() {
    const modal = document.getElementById('upload-report-modal');
    const select = document.getElementById('report-ticker-select');
    
    // Заполняем селект тикерами
    const tickers = FinancialsModule.getState().tickers;
    if (tickers.length === 0) {
        alert('Сначала добавьте тикеры в список');
        return;
    }
    
    select.innerHTML = tickers.map(t => `<option value="${t}">${t}</option>`).join('');
    
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeUploadReportModal() {
    const modal = document.getElementById('upload-report-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    // Очищаем инпут файла
    const fileInput = document.getElementById('report-file-input');
    if (fileInput) {
        fileInput.value = '';
    }
}

async function uploadReportFile() {
    const tickerSelect = document.getElementById('report-ticker-select');
    const periodTypeSelect = document.getElementById('report-period-type');
    const fileInput = document.getElementById('report-file-input');
    
    const ticker = tickerSelect.value;
    const periodType = periodTypeSelect.value;
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Выберите файл для загрузки');
        return;
    }
    
    // Создаем FormData для отправки файла
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ticker', ticker);
    formData.append('period_type', periodType);
    
    try {
        // Отправляем файл на бэкенд
        const response = await fetch('/api/financials/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки: ' + response.statusText);
        }
        
        const result = await response.json();
        
        if (result.status === 'ok') {
            // Обновляем данные в интерфейсе
            FinancialsModule.updateFinancialData(
                ticker,
                periodType,
                result.period,
                result.end_date,
                result.metrics
            );
            
            alert('Отчетность успешно загружена и обработана!');
            closeUploadReportModal();
            
            // Если этот тикер выбран, обновляем таблицу
            if (FinancialsModule.getState().selectedTicker === ticker) {
                FinancialsModule.renderFinancialTable();
            }
        } else {
            throw new Error(result.message || 'Ошибка обработки');
        }
    } catch (error) {
        console.error('Ошибка загрузки отчета:', error);
        alert('Ошибка при загрузке отчета: ' + error.message);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    FinancialsModule.init();
});
