// Sleep Debt Tracker v2 - Charts Logic

let mainChart = null;
let fullscreenChart = null;

// Usa currentChartType e sleepData da app.js (esposti globalmente)

/**
 * Inizializza grafico principale
 * Usa la finestra temporale dalle impostazioni come default
 */
function initChart(data) {
    const ctx = document.getElementById('main-chart');
    if (!ctx) return;
    
    // Distruggi grafico esistente se presente
    if (mainChart) {
        mainChart.destroy();
        mainChart = null;
    }
    
    // Usa la finestra temporale dalle impostazioni (stats_window_days) come default
    const defaultDays = data?.stats_window_days || 10;
    const chartData = prepareChartData(data, defaultDays);
    
    mainChart = new Chart(ctx, {
        type: window.currentChartType || 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            return formatHoursMinutes(context.parsed.y || context.parsed);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatHoursMinutes(value);
                        },
                        font: {
                            size: 10
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 0,
                        minRotation: 0,
                        font: {
                            size: 10
                        }
                    }
                }
            },
            onClick: function(event, elements) {
                // Apri fullscreen al click sul grafico
                if (window.openChartFullscreen) {
                    window.openChartFullscreen();
                }
            }
        }
    });
}

/**
 * Inizializza grafico fullscreen
 * Usa la finestra temporale corrente (window.currentChartDays) o default dalle impostazioni
 */
async function initFullscreenChart() {
    const ctx = document.getElementById('fullscreen-chart');
    if (!ctx) return;
    
    // Usa la finestra temporale corrente o default dalle impostazioni
    const days = window.currentChartDays || window.sleepData?.stats_window_days || 10;
    
    // Carica dati per il numero di giorni selezionato
    await loadChartDataForDays(days);
}

/**
 * Carica dati del grafico per un numero specifico di giorni
 */
async function loadChartDataForDays(days) {
    try {
        const response = await fetch(`${window.location.origin}/api/sleep/chart-data?days=${days}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        
        // Verifica se ci sono dati sufficienti
        // Controlla sia has_sufficient_data che il numero effettivo di dati restituiti
        const actualDataCount = result.data ? result.data.length : 0;
        const availableDays = result.available_days || actualDataCount;
        
        // Debug log
        console.log('Chart data check:', {
            requested: days,
            has_sufficient_data: result.has_sufficient_data,
            available_days: availableDays,
            actual_data_count: actualDataCount
        });
        
        // Mostra popup se non ci sono abbastanza dati
        // Verifica sia has_sufficient_data che il numero effettivo di dati
        if (!result.has_sufficient_data || availableDays < days || actualDataCount < days) {
            console.log('Insufficient data detected, showing sync modal');
            // Mostra popup per chiedere sincronizzazione
            showSyncPromptModal(days, availableDays, result.total_real_data_days);
            return;
        }
        
        // Prepara dati per il grafico (con debito cumulativo)
        const chartData = prepareChartDataFromAPI(result.data);
        
        // Aggiorna grafico fullscreen se esiste
        const ctx = document.getElementById('fullscreen-chart');
        if (ctx && fullscreenChart) {
            fullscreenChart.destroy();
        }
        
        if (ctx) {
            fullscreenChart = new Chart(ctx, {
                type: window.currentChartType || 'line',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            enabled: true,
                            callbacks: {
                                label: function(context) {
                                    return formatHoursMinutes(context.parsed.y || context.parsed);
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return formatHoursMinutes(value);
                                },
                                font: {
                                    size: 14
                                }
                            }
                        },
                        x: {
                            ticks: {
                                font: {
                                    size: 12
                                }
                            }
                        }
                    }
                }
            });
        }
        
        // Aggiorna anche il grafico principale se siamo sulla homepage e stiamo usando lo stesso numero di giorni
        const currentDays = window.currentChartDays || window.sleepData?.stats_window_days || 10;
        if (mainChart && document.getElementById('main-chart') && days === currentDays) {
            const mainChartData = prepareChartDataFromAPI(result.data);
            mainChart.data = mainChartData;
            mainChart.update();
        }
        
    } catch (error) {
        console.error('Error loading chart data:', error);
        window.showError('Errore nel caricamento dei dati del grafico');
    }
}

/**
 * Prepara dati per il grafico da dati API - calcola debito cumulativo
 */
function prepareChartDataFromAPI(data) {
    if (!data || data.length === 0) {
        return {
            labels: [],
            datasets: [{
                label: 'Debito',
                data: [],
                borderColor: 'var(--color-green)',
                backgroundColor: 'rgba(90, 200, 90, 0.1)'
            }]
        };
    }
    
    // Filtra e ordina per data (più vecchia a più recente)
    // Escludi oggi se non ha dati (il backend dovrebbe già farlo, ma facciamo un controllo aggiuntivo)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const filteredData = data.filter(item => {
        const itemDate = new Date(item.date);
        itemDate.setHours(0, 0, 0, 0);
        // Se l'item è oggi e non ha sleep_hours validi, escludilo
        if (itemDate.getTime() === today.getTime() && (!item.sleep_hours || item.sleep_hours === 0)) {
            return false;
        }
        return true;
    });
    
    const sortedData = [...filteredData].sort((a, b) => {
        return new Date(a.date) - new Date(b.date);
    });
    
    const labels = sortedData.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
    });
    
    // Calcola debito cumulativo (somma progressiva)
    let cumulativeDebt = 0;
    const cumulativeDebtData = sortedData.map(item => {
        cumulativeDebt += item.debt;
        // Il debito cumulativo non può essere negativo (mostriamo 0 come minimo)
        return Math.max(0, cumulativeDebt);
    });
    
    // Gradient verde → arancione
    const colors = generateGradientColors(cumulativeDebtData.length);
    
    return {
        labels: labels,
        datasets: [{
            label: 'Debito cumulativo di sonno',
            data: cumulativeDebtData,
            borderColor: (window.currentChartType || 'line') === 'line' ? '#667eea' : undefined,
            backgroundColor: (window.currentChartType || 'line') === 'bar' ? colors : 'rgba(102, 126, 234, 0.2)',
            borderWidth: (window.currentChartType || 'line') === 'line' ? 2 : 0,
            fill: (window.currentChartType || 'line') === 'line',
            tension: 0.4,
            pointRadius: (window.currentChartType || 'line') === 'line' ? 3 : 0,
            pointHoverRadius: 5
        }]
    };
}

/**
 * Prepara dati per il grafico - calcola debito cumulativo
 */
function prepareChartData(data, days = null) {
    if (!data || !data.recent_data || data.recent_data.length === 0) {
        return {
            labels: [],
            datasets: [{
                label: 'Debito',
                data: [],
                borderColor: 'var(--color-green)',
                backgroundColor: 'rgba(90, 200, 90, 0.1)'
            }]
        };
    }
    
    // Ordina per data (più vecchia a più recente)
    const sortedData = [...data.recent_data].reverse();
    
    const labels = sortedData.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
    });
    
    // Calcola debito cumulativo (somma progressiva)
    let cumulativeDebt = 0;
    const cumulativeDebtData = sortedData.map(item => {
        // Il debito giornaliero è: target_hours - sleep_hours
        // Per il cumulativo, sommiamo progressivamente
        cumulativeDebt += item.debt;
        // Il debito cumulativo non può essere negativo (mostriamo 0 come minimo)
        return Math.max(0, cumulativeDebt);
    });
    
    // Gradient verde → arancione
    const colors = generateGradientColors(cumulativeDebtData.length);
    
    return {
        labels: labels,
        datasets: [{
            label: 'Debito cumulativo di sonno',
            data: cumulativeDebtData,
            borderColor: (window.currentChartType || 'line') === 'line' ? '#667eea' : undefined,
            backgroundColor: (window.currentChartType || 'line') === 'bar' ? colors : 'rgba(102, 126, 234, 0.2)',
            borderWidth: (window.currentChartType || 'line') === 'line' ? 2 : 0,
            fill: (window.currentChartType || 'line') === 'line',
            tension: 0.4,
            pointRadius: (window.currentChartType || 'line') === 'line' ? 3 : 0,
            pointHoverRadius: 5
        }]
    };
}

/**
 * Genera gradient colori viola → verde (palette v1)
 */
function generateGradientColors(count) {
    const colors = [];
    for (let i = 0; i < count; i++) {
        const ratio = i / (count - 1 || 1);
        // Gradiente da viola (#667eea) a verde (#5AC85A)
        const r1 = 102, g1 = 126, b1 = 234; // Viola
        const r2 = 90, g2 = 200, b2 = 90;   // Verde
        const r = Math.round(r1 + (r2 - r1) * ratio);
        const g = Math.round(g1 + (g2 - g1) * ratio);
        const b = Math.round(b1 + (b2 - b1) * ratio);
        colors.push(`rgba(${r}, ${g}, ${b}, 0.7)`);
    }
    return colors;
}

/**
 * Aggiorna tipo grafico
 */
async function updateChartType(type) {
    window.currentChartType = type;
    
    if (mainChart) {
        mainChart.destroy();
        const data = window.sleepData;
        if (data) {
            initChart(data);
        }
    }
    
    if (fullscreenChart) {
        fullscreenChart.destroy();
        if (typeof initFullscreenChart === 'function') {
            await initFullscreenChart();
        }
    }
}

/**
 * Mostra modal per chiedere sincronizzazione quando mancano dati
 */
function showSyncPromptModal(requestedDays, availableDays, totalRealDays) {
    const modal = document.getElementById('chart-sync-modal');
    if (!modal) {
        console.error('Chart sync modal not found');
        return;
    }
    
    const messageEl = document.getElementById('chart-sync-modal-message');
    const confirmBtn = document.querySelector('.chart-sync-modal-btn-confirm');
    const cancelBtn = document.querySelector('.chart-sync-modal-btn-cancel');
    
    if (messageEl) {
        const missingDays = requestedDays - availableDays;
        // Salva i giorni da sincronizzare nel modal per usarli nella conferma
        modal.dataset.daysToSync = requestedDays.toString();
        messageEl.textContent = `Per visualizzare ${requestedDays} giorni di dati, servono ${missingDays} giorni aggiuntivi. Vuoi sincronizzare i dati mancanti da Garmin?`;
    }
    
    // Riabilita pulsanti (nel caso il modal sia stato riaperto dopo un errore o una nuova richiesta)
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Sincronizza';
    }
    if (cancelBtn) {
        cancelBtn.disabled = false;
    }
    
    modal.classList.add('active');
}

/**
 * Chiudi modal sincronizzazione
 */
function closeSyncPromptModal() {
    const modal = document.getElementById('chart-sync-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Conferma sincronizzazione e avvia sync
 */
async function confirmChartSync(requestedDays) {
    const modal = document.getElementById('chart-sync-modal');
    const messageEl = document.getElementById('chart-sync-modal-message');
    const confirmBtn = document.querySelector('.chart-sync-modal-btn-confirm');
    const cancelBtn = document.querySelector('.chart-sync-modal-btn-cancel');
    
    if (!modal || !messageEl) {
        console.error('Chart sync modal elements not found');
        return;
    }
    
    // Leggi i giorni da sincronizzare dal modal (o usa requestedDays come fallback, o window.currentChartDays)
    const daysToSync = parseInt(modal.dataset.daysToSync || requestedDays || window.currentChartDays || 10);
    
    // Disabilita pulsanti e aggiorna messaggio
    if (confirmBtn) confirmBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;
    messageEl.textContent = '⏳ Sincronizzazione in corso... Attendere prego.';
    
    try {
        // Chiama API sync con il numero di giorni necessario
        const response = await fetch(`${window.location.origin}/api/sleep/sync?days=${daysToSync}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Aggiorna messaggio con successo
            messageEl.textContent = `✅ Sincronizzazione completata: ${result.records_synced} record recuperati. Aggiornamento grafico...`;
            
            // Attendi un momento per mostrare il messaggio di successo
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Chiudi modal
            closeSyncPromptModal();
            
            // Ricarica dati del grafico con i giorni richiesti
            const daysToReload = parseInt(modal.dataset.daysToSync || requestedDays || window.currentChartDays || 10);
            if (typeof loadChartDataForDays === 'function') {
                await loadChartDataForDays(daysToReload);
            }
            
            // Ricarica anche i dati principali se necessario
            if (typeof window.loadSleepStatus === 'function') {
                await window.loadSleepStatus();
            }
        } else {
            throw new Error(result.message || 'Sincronizzazione fallita');
        }
    } catch (error) {
        console.error('Error syncing data:', error);
        // Mostra errore nel modal
        messageEl.textContent = `❌ Errore durante la sincronizzazione: ${error.message}`;
        
        // Riabilita pulsanti per permettere di riprovare o annullare
        if (confirmBtn) confirmBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
        
        // Non chiudere il modal in caso di errore, così l'utente può riprovare o annullare
    }
}

// Esponi funzioni globalmente
window.initChart = initChart;
window.initFullscreenChart = initFullscreenChart;
window.updateChartType = updateChartType;
window.loadChartDataForDays = loadChartDataForDays;
window.showSyncPromptModal = showSyncPromptModal;
window.closeSyncPromptModal = closeSyncPromptModal;
window.confirmChartSync = confirmChartSync;

/**
 * Formatta ore in "Xh Ym" (helper)
 */
function formatHoursMinutes(hours) {
    const h = Math.floor(Math.abs(hours));
    const m = Math.round((Math.abs(hours) - h) * 60);
    
    if (h === 0 && m === 0) {
        return '0h';
    }
    
    if (m === 0) {
        return `${h}h`;
    }
    
    return `${h}h ${m}m`;
}

