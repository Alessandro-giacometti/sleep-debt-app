// Sleep Debt Tracker v2 - Main App Logic

const API_BASE_URL = window.location.origin;

// Stato applicazione
let currentChartType = 'line';
let currentWindow = 7;
let sleepData = null;

// Esponi variabili globalmente per charts.js
window.sleepData = sleepData;
window.currentChartType = currentChartType;

// Inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    updateHeaderDate();
    loadSleepStatus();
    initNavigation();
});

/**
 * Aggiorna data nell'header
 */
function updateHeaderDate() {
    const today = new Date();
    const dateStr = today.toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
    // Capitalizza prima lettera
    const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    const dateEl = document.getElementById('header-date');
    if (dateEl) {
        dateEl.textContent = formattedDate;
    }
}

/**
 * Carica dati sleep status dall'API
 */
async function loadSleepStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/sleep/status`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        sleepData = data;
        window.sleepData = data; // Esponi globalmente per charts.js
        updateUI(data);
        // Inizializza grafico dopo un breve delay per assicurarsi che charts.js sia caricato
        setTimeout(() => {
            if (typeof initChart === 'function') {
                initChart(data);
            }
        }, 100);
    } catch (error) {
        console.error('Error loading sleep status:', error);
        showError('Errore nel caricamento dei dati');
    }
}

/**
 * Aggiorna UI con i dati
 */
function updateUI(data) {
    // Calcola colore e valore debito
    const debtHours = data.current_debt || 0;
    const debtInfo = getDebtInfo(debtHours);
    
    // Aggiorna card debito principale
    const debtValueEl = document.getElementById('debt-value');
    debtValueEl.textContent = formatDebt(debtHours);
    debtValueEl.className = `debt-value ${debtInfo.class}`;
    
    // Aggiorna zona attuale
    const currentZoneEl = document.getElementById('current-zone');
    currentZoneEl.textContent = debtInfo.zone;
    currentZoneEl.style.color = debtInfo.color;
    
    // Aggiorna cambiamento odierno (calcolo semplificato)
    const todayChangeEl = document.getElementById('today-change');
    if (data.recent_data && data.recent_data.length > 0) {
        const today = data.recent_data[0];
        const yesterday = data.recent_data[1];
        if (yesterday) {
            const change = today.debt - yesterday.debt;
            // Formato: "-3 h e 59 min" (con segno negativo se positivo, perché è una riduzione)
            const changeAbs = Math.abs(change);
            todayChangeEl.textContent = change < 0 ? `-${formatDebt(changeAbs)}` : `+${formatDebt(changeAbs)}`;
            todayChangeEl.style.color = change < 0 ? 'var(--color-green)' : 'var(--color-orange)';
        } else {
            todayChangeEl.textContent = '-';
        }
    } else {
        todayChangeEl.textContent = '-';
    }
    
    // Aggiorna card "Dormi oggi"
    const todaySleepEl = document.getElementById('today-sleep');
    if (data.recent_data && data.recent_data.length > 0 && data.recent_data[0]) {
        const sleepHours = data.recent_data[0].sleep_hours;
        todaySleepEl.textContent = formatDebt(sleepHours);
        todaySleepEl.style.color = 'var(--color-green)';
    } else {
        todaySleepEl.textContent = '-';
    }
    
    // Aggiorna card "Obiettivo del sonno"
    const targetSleepEl = document.getElementById('target-sleep');
    targetSleepEl.textContent = formatDebt(data.target_sleep_hours);
    targetSleepEl.style.color = 'var(--color-text-primary)';
    
    // Aggiorna titolo grafico con numero giorni
    const chartTitleEl = document.getElementById('chart-title-text');
    if (chartTitleEl && data.recent_data) {
        const days = data.recent_data.length || 10;
        chartTitleEl.textContent = `Andamento del debito di sonno (${days} giorni)`;
    }
}

/**
 * Calcola info debito basato sulle soglie
 */
function getDebtInfo(debtHours) {
    if (debtHours < 0) {
        return {
            class: 'optimal',
            color: 'var(--color-green)',
            zone: 'Ottimale'
        };
    } else if (debtHours < 6) {
        return {
            class: 'optimal',
            color: 'var(--color-green)',
            zone: 'Ottimale'
        };
    } else if (debtHours < 13.5) {
        return {
            class: 'slight',
            color: 'var(--color-yellow)',
            zone: 'Lieve mancanza'
        };
    } else if (debtHours < 24.383) {
        return {
            class: 'large',
            color: 'var(--color-orange)',
            zone: 'Grande mancanza'
        };
    } else {
        return {
            class: 'critical',
            color: 'var(--color-red)',
            zone: 'Bisogno di riposo'
        };
    }
}

/**
 * Formatta debito in "X h e Y min"
 */
function formatDebt(hours) {
    if (hours < 0) {
        return '0 h e 0 min';
    }
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h} h e ${m} min`;
}

/**
 * Formatta ore in "Xh Ym"
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

/**
 * Navigazione tra homepage e impostazioni
 */
function initNavigation() {
    showHomepage();
}

function showHomepage() {
    document.getElementById('homepage').classList.remove('hidden');
    document.getElementById('settings-page').classList.remove('active');
    
    // Aggiorna navbar
    document.querySelectorAll('.navbar-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelectorAll('.navbar-item')[0].classList.add('active');
}

function showSettings() {
    document.getElementById('homepage').classList.add('hidden');
    document.getElementById('settings-page').classList.add('active');
    
    // Aggiorna navbar
    document.querySelectorAll('.navbar-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelectorAll('.navbar-item')[1].classList.add('active');
}

/**
 * Selettore finestra giorni (solo UI)
 */
function selectWindow(days) {
    currentWindow = days;
    document.querySelectorAll('.pill-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

/**
 * Toggle "Valuta di più gli ultimi giorni"
 */
function toggleWeight() {
    const toggle = document.getElementById('weight-toggle');
    toggle.classList.toggle('active');
}

/**
 * Salva impostazioni (solo UI per ora)
 */
function saveSettings() {
    // TODO: Implementare salvataggio quando backend sarà pronto
    alert('Impostazioni salvate! (UI only - backend integration pending)');
}

/**
 * Gestione grafico fullscreen
 */
function openChartFullscreen() {
    document.getElementById('chart-fullscreen').classList.add('active');
    if (typeof initFullscreenChart === 'function') {
        initFullscreenChart();
    }
}

function closeChartFullscreen() {
    document.getElementById('chart-fullscreen').classList.remove('active');
}

/**
 * Selettore giorni nel grafico fullscreen (solo UI)
 */
function selectDays(days) {
    document.querySelectorAll('.chart-fullscreen-selector-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }
    // TODO: Aggiornare grafico quando backend sarà pronto
}

/**
 * Switch tipo grafico (linea/barre) - toggle tra i due
 */
function switchChartType(type) {
    // Se type non è specificato, toggle tra line e bar
    if (!type) {
        type = currentChartType === 'line' ? 'bar' : 'line';
    }
    currentChartType = type;
    window.currentChartType = type;
    
    // Aggiorna grafico
    if (typeof updateChartType === 'function') {
        updateChartType(type);
    }
}

// Esponi funzione globalmente
window.switchChartType = switchChartType;

/**
 * Sync sleep data from Garmin
 */
async function syncData() {
    const syncBtn = document.getElementById('sync-btn');
    
    // Disable button
    syncBtn.disabled = true;
    syncBtn.textContent = '⏳ Syncing...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/sleep/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
            // Reload status after successful sync
            await loadSleepStatus();
            showSuccess(`Sync completato: ${result.records_synced} record sincronizzati`);
        } else {
            throw new Error(result.message || 'Sync fallito');
        }
    } catch (error) {
        console.error('Error syncing data:', error);
        showError('Errore durante la sincronizzazione: ' + error.message);
    } finally {
        // Re-enable button
        syncBtn.disabled = false;
        syncBtn.textContent = '🔄 Sync Now';
    }
}

// Esponi funzione globalmente
window.syncData = syncData;

/**
 * Mostra errore (semplificato)
 */
function showError(message) {
    console.error(message);
    // TODO: Implementare toast notification
    alert(message);
}

/**
 * Mostra successo (semplificato)
 */
function showSuccess(message) {
    console.log(message);
    // TODO: Implementare toast notification
    alert(message);
}

